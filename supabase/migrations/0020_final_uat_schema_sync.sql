-- 1. Apply warranty columns safely (from 0013)
ALTER TABLE public.chargers
ADD COLUMN IF NOT EXISTS warranty_months INTEGER,
ADD COLUMN IF NOT EXISTS warranty_start_date DATE,
ADD COLUMN IF NOT EXISTS warranty_expiry_date DATE;

-- 2. Vehicles OEM Policies (from 0018)
DROP POLICY IF EXISTS "Vehicles OEM Insert" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles OEM Update" ON public.vehicles;

CREATE POLICY "Vehicles OEM Insert" ON public.vehicles FOR INSERT WITH CHECK ( 
  public.get_auth_role() = 'OEM' 
  AND oem_id = public.get_auth_org_id()
  AND dealer_id IN (SELECT id FROM public.organizations WHERE parent_org_id = public.get_auth_org_id())
  AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = vehicles.dealer_id)
);

CREATE POLICY "Vehicles OEM Update" ON public.vehicles FOR UPDATE USING ( 
  public.get_auth_role() = 'OEM' 
  AND oem_id = public.get_auth_org_id()
) WITH CHECK ( 
  public.get_auth_role() = 'OEM' 
  AND oem_id = public.get_auth_org_id()
  AND dealer_id IN (SELECT id FROM public.organizations WHERE parent_org_id = public.get_auth_org_id())
  AND customer_id IN (SELECT id FROM public.customers WHERE dealer_id = vehicles.dealer_id)
);

-- 3. Chargers RLS Policies - Admin 
DROP POLICY IF EXISTS "Chargers Admin Insert" ON public.chargers;
DROP POLICY IF EXISTS "Chargers Admin Update" ON public.chargers;

CREATE POLICY "Chargers Admin Insert" ON public.chargers FOR INSERT WITH CHECK (
  public.get_auth_role() = 'ACS_ADMIN'
  AND customer_id IN (SELECT customer_id FROM public.vehicles WHERE id = chargers.vehicle_id)
);

CREATE POLICY "Chargers Admin Update" ON public.chargers FOR UPDATE USING (
  public.get_auth_role() = 'ACS_ADMIN'
) WITH CHECK (
  public.get_auth_role() = 'ACS_ADMIN'
  AND customer_id IN (SELECT customer_id FROM public.vehicles WHERE id = chargers.vehicle_id)
);

-- 4. Chargers RLS Policies - Dealer
DROP POLICY IF EXISTS "Chargers Dealer Insert" ON public.chargers;
DROP POLICY IF EXISTS "Chargers Dealer Update" ON public.chargers;

CREATE POLICY "Chargers Dealer Insert" ON public.chargers FOR INSERT WITH CHECK (
  public.get_auth_role() = 'DEALER' 
  AND vehicle_id IN (SELECT id FROM public.vehicles WHERE dealer_id = public.get_auth_org_id())
  AND customer_id IN (SELECT customer_id FROM public.vehicles WHERE id = chargers.vehicle_id)
);

CREATE POLICY "Chargers Dealer Update" ON public.chargers FOR UPDATE USING (
  public.get_auth_role() = 'DEALER' 
  AND vehicle_id IN (SELECT id FROM public.vehicles WHERE dealer_id = public.get_auth_org_id())
) WITH CHECK (
  public.get_auth_role() = 'DEALER' 
  AND vehicle_id IN (SELECT id FROM public.vehicles WHERE dealer_id = public.get_auth_org_id())
  AND customer_id IN (SELECT customer_id FROM public.vehicles WHERE id = chargers.vehicle_id)
);
