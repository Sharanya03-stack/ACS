-- Drop the previous policy
DROP POLICY IF EXISTS "Installations Partner Update" ON public.installations;

-- Recreate the policy with strict technician ownership verification
CREATE POLICY "Installations Partner Update" ON public.installations FOR UPDATE USING (
    public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()
) WITH CHECK (
    public.get_auth_role() = 'PARTNER' 
    AND partner_id = public.get_auth_org_id()
    AND dealer_id = public.get_inst_dealer_id(id)
    AND oem_id = public.get_inst_oem_id(id)
    AND customer_id = public.get_inst_customer_id(id)
    -- NEW SECURITY BOUNDARY: Prevent cross-partner technician assignment
    AND (
        technician_id IS NULL OR 
        technician_id IN (
            SELECT id FROM public.profiles 
            WHERE role = 'TECHNICIAN' AND org_id = public.get_auth_org_id()
        )
    )
);
