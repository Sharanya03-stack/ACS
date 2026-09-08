-- 0031_oem_installations_rls.sql
-- Allow OEM users to insert installation orders for their own organization

DROP POLICY IF EXISTS "Installations OEM Insert" ON public.installations;

CREATE POLICY "Installations OEM Insert" 
ON public.installations 
FOR INSERT 
WITH CHECK (
    public.get_auth_role() = 'OEM' 
    AND oem_id = public.get_auth_org_id()
);
