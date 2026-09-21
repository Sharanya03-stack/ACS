-- 0032_flexible_entity_names.sql
-- Allow flexible text entry for Dealer and Partner names on installations

-- 1. Make installations.dealer_id nullable
ALTER TABLE public.installations ALTER COLUMN dealer_id DROP NOT NULL;

-- 2. Add custom display name columns
ALTER TABLE public.installations 
  ADD COLUMN IF NOT EXISTS custom_dealer_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_partner_name TEXT;

-- 3. Update enforce_oem_dealer_consistency trigger function so OEM/dealer check runs ONLY when NEW.dealer_id IS NOT NULL
CREATE OR REPLACE FUNCTION enforce_oem_dealer_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dealer_id IS NOT NULL THEN
        IF NEW.oem_id != (SELECT parent_org_id FROM public.organizations WHERE id = NEW.dealer_id) THEN
            RAISE EXCEPTION 'OEM ID does not match the Dealers parent OEM ID';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
