-- 0033_flexible_customer_vehicle_dealer.sql
-- Allow flexible text entry for Dealer names on customers and vehicles

-- 1. Make customers.dealer_id and vehicles.dealer_id nullable
ALTER TABLE public.customers ALTER COLUMN dealer_id DROP NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN dealer_id DROP NOT NULL;

-- 2. Add custom_dealer_name text columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS custom_dealer_name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS custom_dealer_name TEXT;

-- 3. Update "Customers OEM Insert" RLS policy to allow NULL dealer_id
DROP POLICY IF EXISTS "Customers OEM Insert" ON public.customers;
CREATE POLICY "Customers OEM Insert" ON public.customers FOR INSERT WITH CHECK (
  public.get_auth_role() = 'OEM' AND (
    dealer_id IS NULL OR 
    dealer_id IN ( SELECT id FROM public.organizations WHERE parent_org_id = public.get_auth_org_id() )
  )
);
