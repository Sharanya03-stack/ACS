-- 0006_rls_select_policies.sql

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

-- We also need Checklists Admin Insert/Update and Checklists Insert/Update
-- Oh wait, let's verify if checklist mutations were added in 0002!
