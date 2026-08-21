-- 0011_audit_logs_timeline.sql

-- 1. Create RLS Policies for audit_logs
CREATE POLICY "Admin can view all audit logs"
ON public.audit_logs FOR SELECT
USING (public.get_auth_role() = 'ACS_ADMIN');

CREATE POLICY "OEM can view OEM audit logs"
ON public.audit_logs FOR SELECT
USING (
    public.get_auth_role() = 'OEM' AND 
    entity_type = 'INSTALLATION' AND
    entity_id IN (
        SELECT id FROM public.installations WHERE oem_id = public.get_auth_org_id()
    )
);

CREATE POLICY "Dealer can view Dealer audit logs"
ON public.audit_logs FOR SELECT
USING (
    public.get_auth_role() = 'DEALER' AND 
    entity_type = 'INSTALLATION' AND
    entity_id IN (
        SELECT id FROM public.installations WHERE dealer_id = public.get_auth_org_id()
    )
);

CREATE POLICY "Partner can view Partner audit logs"
ON public.audit_logs FOR SELECT
USING (
    public.get_auth_role() = 'PARTNER' AND 
    entity_type = 'INSTALLATION' AND
    entity_id IN (
        SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id()
    )
);

CREATE POLICY "Technician can view Assigned audit logs"
ON public.audit_logs FOR SELECT
USING (
    public.get_auth_role() = 'TECHNICIAN' AND 
    entity_type = 'INSTALLATION' AND
    entity_id IN (
        SELECT id FROM public.installations WHERE technician_id = auth.uid()
    )
);


-- 2. Trigger Function for Updates
CREATE OR REPLACE FUNCTION public.log_installation_updates()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get user_id from auth.uid()
    v_user_id := auth.uid();
    
    -- If NULL, check if it was set manually (e.g. by a service_role RPC)
    IF v_user_id IS NULL THEN
        BEGIN
            v_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    -- Track Partner Assignment
    IF (OLD.partner_id IS DISTINCT FROM NEW.partner_id) THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (v_user_id, 'PARTNER_ASSIGNED', 'INSTALLATION', NEW.id, jsonb_build_object('partner_id', OLD.partner_id), jsonb_build_object('partner_id', NEW.partner_id));
    END IF;

    -- Track Technician Assignment
    IF (OLD.technician_id IS DISTINCT FROM NEW.technician_id) THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (v_user_id, 'TECHNICIAN_ASSIGNED', 'INSTALLATION', NEW.id, jsonb_build_object('technician_id', OLD.technician_id), jsonb_build_object('technician_id', NEW.technician_id));
    END IF;

    -- Track Status Changes
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (v_user_id, 'STATUS_CHANGED', 'INSTALLATION', NEW.id, 
            jsonb_build_object('status', OLD.status), 
            jsonb_build_object('status', NEW.status, 'rejection_reason', NEW.rejection_reason)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER installation_audit_update_trigger
AFTER UPDATE ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.log_installation_updates();


-- 3. Trigger Function for Inserts
CREATE OR REPLACE FUNCTION public.log_installation_inserts()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        BEGIN
            v_user_id := current_setting('app.current_user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_user_id, 'CREATED', 'INSTALLATION', NEW.id, NULL, jsonb_build_object('status', NEW.status));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER installation_audit_insert_trigger
AFTER INSERT ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.log_installation_inserts();


-- 4. Update review_installation_atomic to set user context
CREATE OR REPLACE FUNCTION public.review_installation_atomic(
    p_installation_id UUID,
    p_reviewer_id UUID,
    p_decision TEXT,
    p_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_current_status installation_status;
BEGIN
    -- Set session variable so trigger can read reviewer ID
    PERFORM set_config('app.current_user_id', p_reviewer_id::text, true);

    -- Fetch installation
    SELECT status INTO v_current_status
    FROM public.installations 
    WHERE id = p_installation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installation not found';
    END IF;

    IF v_current_status != 'UNDER_VERIFICATION' THEN
        RAISE EXCEPTION 'Installation is not UNDER_VERIFICATION';
    END IF;

    IF p_decision = 'REVISIT_REQUIRED' AND (p_reason IS NULL OR trim(p_reason) = '') THEN
        RAISE EXCEPTION 'Reason is required for REVISIT_REQUIRED';
    END IF;

    -- Insert Review
    INSERT INTO public.installation_reviews (
        installation_id, reviewer_id, decision, reason
    ) VALUES (
        p_installation_id, p_reviewer_id, p_decision, p_reason
    );

    -- Update Installation
    IF p_decision = 'VERIFIED' THEN
        UPDATE public.installations 
        SET status = 'VERIFIED',
            verified_at = now(),
            rejection_reason = NULL,
            updated_at = now()
        WHERE id = p_installation_id;
    ELSIF p_decision = 'REVISIT_REQUIRED' THEN
        UPDATE public.installations
        SET status = 'REVISIT_REQUIRED',
            rejection_reason = p_reason,
            updated_at = now()
        WHERE id = p_installation_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply grants just to be safe
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) TO service_role;
