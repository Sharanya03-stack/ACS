-- Drop the previous policy
DROP POLICY IF EXISTS "Installations Tech Update" ON public.installations;

-- Recreate the policy ensuring technician_id cannot be changed by the technician
CREATE POLICY "Installations Tech Update" ON public.installations FOR UPDATE USING (
    public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid()
) WITH CHECK (
    public.get_auth_role() = 'TECHNICIAN' 
    AND technician_id = auth.uid()
    AND partner_id = public.get_inst_partner_id(id)
    AND dealer_id = public.get_inst_dealer_id(id)
    AND oem_id = public.get_inst_oem_id(id)
    AND customer_id = public.get_inst_customer_id(id)
);
