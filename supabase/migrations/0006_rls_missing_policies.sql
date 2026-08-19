-- 0006_rls_missing_policies.sql

-- 1. SELECT POLICIES

-- Installation Notes Read Access
CREATE POLICY "Notes Read Access" ON public.installation_notes FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        installation_id IN (
            SELECT id FROM public.installations WHERE 
                (public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid()) OR
                (public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()) OR
                (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
                (public.get_auth_role() = 'OEM' AND oem_id = public.get_auth_org_id())
        )
    )
);

-- Installation Checklists Read Access
CREATE POLICY "Checklists Read Access" ON public.installation_checklists FOR SELECT USING (
    public.get_auth_role() = 'ACS_ADMIN' OR
    installation_id IN (
        SELECT id FROM public.installations WHERE 
            (public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid()) OR
            (public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()) OR
            (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
            (public.get_auth_role() = 'OEM' AND oem_id = public.get_auth_org_id())
    )
);

-- Installation Photos Read Access
CREATE POLICY "Photos Read Access" ON public.installation_photos FOR SELECT USING (
    public.get_auth_role() = 'ACS_ADMIN' OR
    installation_id IN (
        SELECT id FROM public.installations WHERE 
            (public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid()) OR
            (public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()) OR
            (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
            (public.get_auth_role() = 'OEM' AND oem_id = public.get_auth_org_id())
    )
);

-- 2. CHECKLIST MUTATIONS (INSERT/UPDATE/DELETE)

CREATE POLICY "Checklists Admin Insert" ON public.installation_checklists FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Checklists Admin Update" ON public.installation_checklists FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );

CREATE POLICY "Checklists Insert" ON public.installation_checklists FOR INSERT WITH CHECK (
    checked_by = auth.uid() AND (
        (public.get_auth_role() = 'TECHNICIAN' AND installation_id IN (SELECT id FROM public.installations WHERE technician_id = auth.uid())) OR
        (public.get_auth_role() = 'PARTNER' AND installation_id IN (SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id())) OR
        (public.get_auth_role() = 'DEALER' AND installation_id IN (SELECT id FROM public.installations WHERE dealer_id = public.get_auth_org_id()))
    )
);

CREATE POLICY "Checklists Update" ON public.installation_checklists FOR UPDATE USING (
    checked_by = auth.uid()
) WITH CHECK (
    checked_by = auth.uid() AND installation_id IN (
        SELECT id FROM public.installations WHERE 
            (public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid()) OR
            (public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()) OR
            (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id())
    )
);

CREATE POLICY "Checklists Delete" ON public.installation_checklists FOR DELETE USING (
    (public.get_auth_role() = 'TECHNICIAN' AND installation_id IN (SELECT id FROM public.installations WHERE technician_id = auth.uid())) OR
    (public.get_auth_role() = 'PARTNER' AND installation_id IN (SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id())) OR
    (public.get_auth_role() = 'DEALER' AND installation_id IN (SELECT id FROM public.installations WHERE dealer_id = public.get_auth_org_id()))
);

