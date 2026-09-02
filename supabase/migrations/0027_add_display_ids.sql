-- Add display_id columns
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE public.chargers ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- Create Sequences
CREATE SEQUENCE IF NOT EXISTS installations_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS customers_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS vehicles_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS chargers_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS oem_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dlr_display_seq START 1;
CREATE SEQUENCE IF NOT EXISTS ptr_display_seq START 1;

-- Installations Trigger
CREATE OR REPLACE FUNCTION set_installations_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'ORD-' || LPAD(nextval('installations_display_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_installations_display_id ON public.installations;
CREATE TRIGGER trg_set_installations_display_id
BEFORE INSERT ON public.installations
FOR EACH ROW
EXECUTE FUNCTION set_installations_display_id();

-- Customers Trigger
CREATE OR REPLACE FUNCTION set_customers_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'CUS-' || LPAD(nextval('customers_display_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_customers_display_id ON public.customers;
CREATE TRIGGER trg_set_customers_display_id
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION set_customers_display_id();

-- Vehicles Trigger
CREATE OR REPLACE FUNCTION set_vehicles_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'VEH-' || LPAD(nextval('vehicles_display_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_vehicles_display_id ON public.vehicles;
CREATE TRIGGER trg_set_vehicles_display_id
BEFORE INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION set_vehicles_display_id();

-- Chargers Trigger
CREATE OR REPLACE FUNCTION set_chargers_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'CHG-' || LPAD(nextval('chargers_display_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_chargers_display_id ON public.chargers;
CREATE TRIGGER trg_set_chargers_display_id
BEFORE INSERT ON public.chargers
FOR EACH ROW
EXECUTE FUNCTION set_chargers_display_id();

-- Organizations Trigger
CREATE OR REPLACE FUNCTION set_organizations_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        IF NEW.type = 'OEM' THEN
            NEW.display_id := 'OEM-' || LPAD(nextval('oem_display_seq')::text, 6, '0');
        ELSIF NEW.type = 'DEALER' THEN
            NEW.display_id := 'DLR-' || LPAD(nextval('dlr_display_seq')::text, 6, '0');
        ELSIF NEW.type = 'PARTNER' THEN
            NEW.display_id := 'PTR-' || LPAD(nextval('ptr_display_seq')::text, 6, '0');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_organizations_display_id ON public.organizations;
CREATE TRIGGER trg_set_organizations_display_id
BEFORE INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION set_organizations_display_id();

-- Backfill Existing Data
UPDATE public.installations SET display_id = 'ORD-' || LPAD(nextval('installations_display_seq')::text, 6, '0') WHERE display_id IS NULL;
UPDATE public.customers SET display_id = 'CUS-' || LPAD(nextval('customers_display_seq')::text, 6, '0') WHERE display_id IS NULL;
UPDATE public.vehicles SET display_id = 'VEH-' || LPAD(nextval('vehicles_display_seq')::text, 6, '0') WHERE display_id IS NULL;
UPDATE public.chargers SET display_id = 'CHG-' || LPAD(nextval('chargers_display_seq')::text, 6, '0') WHERE display_id IS NULL;

UPDATE public.organizations SET display_id = 'OEM-' || LPAD(nextval('oem_display_seq')::text, 6, '0') WHERE type = 'OEM' AND display_id IS NULL;
UPDATE public.organizations SET display_id = 'DLR-' || LPAD(nextval('dlr_display_seq')::text, 6, '0') WHERE type = 'DEALER' AND display_id IS NULL;
UPDATE public.organizations SET display_id = 'PTR-' || LPAD(nextval('ptr_display_seq')::text, 6, '0') WHERE type = 'PARTNER' AND display_id IS NULL;

