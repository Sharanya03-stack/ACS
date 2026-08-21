-- 0010_installation_reviews.sql

CREATE TABLE public.installation_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id),
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    decision TEXT NOT NULL CHECK (decision IN ('VERIFIED', 'REVISIT_REQUIRED')),
    reason TEXT CHECK (
        (decision = 'VERIFIED') OR 
        (decision = 'REVISIT_REQUIRED' AND reason IS NOT NULL AND length(trim(reason)) > 0)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installation_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Admin can view all reviews"
ON public.installation_reviews FOR SELECT
USING (public.get_auth_role() = 'ACS_ADMIN');

CREATE POLICY "Partners can view reviews for their installations"
ON public.installation_reviews FOR SELECT
USING (
    public.get_auth_role() = 'PARTNER' AND 
    installation_id IN (
        SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id()
    )
);

-- Atomic RPC for Verification
CREATE OR REPLACE FUNCTION public.review_installation_atomic(
    p_installation_id UUID,
    p_reviewer_id UUID,
    p_decision TEXT,
    p_reason TEXT
) RETURNS VOID AS $$
DECLARE
    v_current_status installation_status;
BEGIN
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

-- Restrict execution to service role only
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.review_installation_atomic(UUID, UUID, TEXT, TEXT) TO service_role;
