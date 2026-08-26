CREATE POLICY "Chargers OEM Insert"
ON public.chargers
FOR INSERT
WITH CHECK (
    public.get_auth_role() = 'OEM'
    AND vehicle_id IN (
        SELECT id
        FROM public.vehicles
        WHERE oem_id = public.get_auth_org_id()
    )
);
