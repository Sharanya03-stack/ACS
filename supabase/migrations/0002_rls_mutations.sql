-- 0002_rls_mutations.sql

-- 1. Helper functions to freeze fields during UPDATEs (avoids infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.get_inst_dealer_id(inst_id UUID) RETURNS UUID AS $$
    SELECT dealer_id FROM public.installations WHERE id = inst_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_inst_oem_id(inst_id UUID) RETURNS UUID AS $$
    SELECT oem_id FROM public.installations WHERE id = inst_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_inst_partner_id(inst_id UUID) RETURNS UUID AS $$
    SELECT partner_id FROM public.installations WHERE id = inst_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_inst_customer_id(inst_id UUID) RETURNS UUID AS $$
    SELECT customer_id FROM public.installations WHERE id = inst_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_note_inst_id(note_id UUID) RETURNS UUID AS $$
    SELECT installation_id FROM public.installation_notes WHERE id = note_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_photo_inst_id(photo_id UUID) RETURNS UUID AS $$
    SELECT installation_id FROM public.installation_photos WHERE id = photo_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. CUSTOMERS
CREATE POLICY "Customers Admin Insert" ON public.customers FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Customers Admin Update" ON public.customers FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Customers Dealer Insert" ON public.customers FOR INSERT WITH CHECK (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
);
CREATE POLICY "Customers Dealer Update" ON public.customers FOR UPDATE USING (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
) WITH CHECK (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
);


-- 3. VEHICLES
CREATE POLICY "Vehicles Admin Insert" ON public.vehicles FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Vehicles Admin Update" ON public.vehicles FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Vehicles Dealer Insert" ON public.vehicles FOR INSERT WITH CHECK (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id() 
    AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = public.get_auth_org_id())
);
CREATE POLICY "Vehicles Dealer Update" ON public.vehicles FOR UPDATE USING (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
) WITH CHECK (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
    AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = public.get_auth_org_id())
);


-- 4. CHARGERS
CREATE POLICY "Chargers Admin Insert" ON public.chargers FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Chargers Admin Update" ON public.chargers FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Chargers Dealer Insert" ON public.chargers FOR INSERT WITH CHECK (
    public.get_auth_role() = 'DEALER' 
    AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = public.get_auth_org_id())
);
CREATE POLICY "Chargers Dealer Update" ON public.chargers FOR UPDATE USING (
    public.get_auth_role() = 'DEALER' 
    AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = public.get_auth_org_id())
) WITH CHECK (
    public.get_auth_role() = 'DEALER' 
    AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = public.get_auth_org_id())
);


-- 5. INSTALLATIONS

-- Admin Insert/Update
CREATE POLICY "Installations Admin Insert" ON public.installations FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Installations Admin Update" ON public.installations FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );

-- Dealer Insert
CREATE POLICY "Installations Dealer Insert" ON public.installations FOR INSERT WITH CHECK (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
);

-- Dealer Update
CREATE POLICY "Installations Dealer Update" ON public.installations FOR UPDATE USING (
    public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()
) WITH CHECK (
    public.get_auth_role() = 'DEALER' 
    AND dealer_id = public.get_auth_org_id()
    AND oem_id = public.get_inst_oem_id(id) -- Prevent transferring to another OEM
    AND customer_id = public.get_inst_customer_id(id) -- Prevent swapping customers mid-flight
);

-- Partner Update
CREATE POLICY "Installations Partner Update" ON public.installations FOR UPDATE USING (
    public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()
) WITH CHECK (
    public.get_auth_role() = 'PARTNER' 
    AND partner_id = public.get_auth_org_id()
    AND dealer_id = public.get_inst_dealer_id(id)
    AND oem_id = public.get_inst_oem_id(id)
    AND customer_id = public.get_inst_customer_id(id)
);

-- Technician Update
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


-- 6. INSTALLATION NOTES
CREATE POLICY "Notes Admin Insert" ON public.installation_notes FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Notes Admin Update" ON public.installation_notes FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );

CREATE POLICY "Notes Insert" ON public.installation_notes FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
        (public.get_auth_role() = 'TECHNICIAN' AND installation_id IN (SELECT id FROM public.installations WHERE technician_id = auth.uid())) OR
        (public.get_auth_role() = 'PARTNER' AND installation_id IN (SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id())) OR
        (public.get_auth_role() = 'DEALER' AND installation_id IN (SELECT id FROM public.installations WHERE dealer_id = public.get_auth_org_id())) OR
        (public.get_auth_role() = 'OEM' AND installation_id IN (SELECT id FROM public.installations WHERE oem_id = public.get_auth_org_id()))
    )
);

CREATE POLICY "Notes Update" ON public.installation_notes FOR UPDATE USING (
    created_by = auth.uid()
) WITH CHECK (
    created_by = auth.uid() AND installation_id = public.get_note_inst_id(id)
);


-- 7. INSTALLATION PHOTOS
CREATE POLICY "Photos Admin Insert" ON public.installation_photos FOR INSERT WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );
CREATE POLICY "Photos Admin Update" ON public.installation_photos FOR UPDATE USING ( public.get_auth_role() = 'ACS_ADMIN' ) WITH CHECK ( public.get_auth_role() = 'ACS_ADMIN' );

CREATE POLICY "Photos Insert" ON public.installation_photos FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND (
        (public.get_auth_role() = 'TECHNICIAN' AND installation_id IN (SELECT id FROM public.installations WHERE technician_id = auth.uid())) OR
        (public.get_auth_role() = 'PARTNER' AND installation_id IN (SELECT id FROM public.installations WHERE partner_id = public.get_auth_org_id())) OR
        (public.get_auth_role() = 'DEALER' AND installation_id IN (SELECT id FROM public.installations WHERE dealer_id = public.get_auth_org_id()))
    )
);

CREATE POLICY "Photos Update" ON public.installation_photos FOR UPDATE USING (
    uploaded_by = auth.uid()
) WITH CHECK (
    uploaded_by = auth.uid() AND installation_id = public.get_photo_inst_id(id)
);


-- 8. DELETE POLICIES (Admin only)
CREATE POLICY "Admin Delete All Orgs" ON public.organizations FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Profiles" ON public.profiles FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Customers" ON public.customers FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Vehicles" ON public.vehicles FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Chargers" ON public.chargers FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Installations" ON public.installations FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Notes" ON public.installation_notes FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Photos" ON public.installation_photos FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
CREATE POLICY "Admin Delete All Checklists" ON public.installation_checklists FOR DELETE USING (public.get_auth_role() = 'ACS_ADMIN');
