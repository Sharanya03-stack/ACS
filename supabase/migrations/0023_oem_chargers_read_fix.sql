DROP POLICY IF EXISTS "Chargers Read Access" ON public.chargers;

CREATE POLICY "Chargers Read Access" ON public.chargers FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR

        (
            public.get_auth_role() = 'DEALER'
            AND customer_id IN (
                SELECT id
                FROM public.customers
                WHERE dealer_id = public.get_auth_org_id()
            )
        ) OR

        (
            public.get_auth_role() = 'OEM'
            AND vehicle_id IN (
                SELECT id
                FROM public.vehicles
                WHERE oem_id = public.get_auth_org_id()
            )
        ) OR

        id IN (
            SELECT i.charger_id
            FROM public.installations i
            WHERE
                (
                    public.get_auth_role() = 'PARTNER'
                    AND i.partner_id = public.get_auth_org_id()
                )
                OR
                (
                    public.get_auth_role() = 'TECHNICIAN'
                    AND i.technician_id = auth.uid()
                )
        )
    )
);
