-- Drop existing objects for clean rebuild
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.installation_photos CASCADE;
DROP TABLE IF EXISTS public.installation_checklists CASCADE;
DROP TABLE IF EXISTS public.installation_notes CASCADE;
DROP TABLE IF EXISTS public.installations CASCADE;
DROP TABLE IF EXISTS public.chargers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP FUNCTION IF EXISTS enforce_oem_dealer_consistency() CASCADE;

DROP TYPE IF EXISTS org_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS installation_status CASCADE;
DROP TYPE IF EXISTS checklist_status CASCADE;

-- ENUMS
CREATE TYPE org_type AS ENUM ('OEM', 'DEALER', 'PARTNER', 'ACS');
CREATE TYPE user_role AS ENUM ('ACS_ADMIN', 'OEM', 'DEALER', 'PARTNER', 'TECHNICIAN');
CREATE TYPE installation_status AS ENUM (
    'NEW', 
    'PARTNER_ASSIGNED', 
    'TECHNICIAN_ASSIGNED', 
    'SCHEDULED', 
    'IN_PROGRESS', 
    'COMPLETED', 
    'UNDER_VERIFICATION', 
    'VERIFIED', 
    'ON_HOLD', 
    'RESCHEDULED', 
    'REVISIT_REQUIRED', 
    'CANCELLED', 
    'FAILED'
);
CREATE TYPE checklist_status AS ENUM ('PENDING', 'YES', 'NO', 'N/A');

-- 1. organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type org_type NOT NULL,
    name TEXT NOT NULL,
    parent_org_id UUID REFERENCES public.organizations(id),
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 2. profiles
-- Links 1:1 to auth.users (handled via RLS and triggers typically, but FK enforces data integrity)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    org_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 3. customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT UNIQUE,
    dealer_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    gps_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 4. vehicles
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    dealer_id UUID NOT NULL REFERENCES public.organizations(id),
    oem_id UUID NOT NULL REFERENCES public.organizations(id),
    model TEXT NOT NULL,
    sale_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 5. chargers
CREATE TABLE public.chargers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    model TEXT NOT NULL,
    power_rating TEXT NOT NULL,
    supplied_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 6. installations
CREATE TABLE public.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT UNIQUE,
    status installation_status NOT NULL DEFAULT 'NEW',
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    charger_id UUID NOT NULL REFERENCES public.chargers(id),
    dealer_id UUID NOT NULL REFERENCES public.organizations(id),
    oem_id UUID NOT NULL REFERENCES public.organizations(id),
    partner_id UUID REFERENCES public.organizations(id),
    technician_id UUID REFERENCES public.profiles(id),
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- OEM/Dealer Consistency Constraint via Trigger
CREATE OR REPLACE FUNCTION enforce_oem_dealer_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.oem_id != (SELECT parent_org_id FROM public.organizations WHERE id = NEW.dealer_id) THEN
        RAISE EXCEPTION 'OEM ID does not match the Dealers parent OEM ID';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_oem_dealer_consistency
BEFORE INSERT OR UPDATE ON public.installations
FOR EACH ROW EXECUTE FUNCTION enforce_oem_dealer_consistency();

-- 7. installation_notes
CREATE TABLE public.installation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 8. installation_checklists
CREATE TABLE public.installation_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id),
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    status checklist_status NOT NULL DEFAULT 'PENDING',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    remarks TEXT,
    checked_by UUID REFERENCES public.profiles(id),
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. installation_photos
CREATE TABLE public.installation_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    category TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. audit_logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get current user org_id
CREATE OR REPLACE FUNCTION public.get_auth_org_id() RETURNS UUID AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations RLS
CREATE POLICY "Orgs Read Access" ON public.organizations FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        id = public.get_auth_org_id() OR
        parent_org_id = public.get_auth_org_id() OR
        (public.get_auth_role() = 'PARTNER' AND type = 'DEALER') -- Partners can see dealers for assignments
    )
);

-- Profiles RLS
CREATE POLICY "Profiles Read Access" ON public.profiles FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        id = auth.uid() OR
        org_id = public.get_auth_org_id()
    )
);

-- Installations RLS
CREATE POLICY "Installations Read Access" ON public.installations FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        (public.get_auth_role() = 'OEM' AND oem_id = public.get_auth_org_id()) OR
        (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
        (public.get_auth_role() = 'PARTNER' AND partner_id = public.get_auth_org_id()) OR
        (public.get_auth_role() = 'TECHNICIAN' AND technician_id = auth.uid())
    )
);

-- Customers RLS (Derives from Installations/Dealers)
CREATE POLICY "Customers Read Access" ON public.customers FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
        (public.get_auth_role() = 'OEM' AND dealer_id IN (SELECT id FROM public.organizations WHERE parent_org_id = public.get_auth_org_id())) OR
        (public.get_auth_role() IN ('PARTNER', 'TECHNICIAN') AND id IN (SELECT customer_id FROM public.installations WHERE (partner_id = public.get_auth_org_id() OR technician_id = auth.uid())))
    )
);

-- Vehicles and Chargers similarly restricted
CREATE POLICY "Vehicles Read Access" ON public.vehicles FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        (public.get_auth_role() = 'DEALER' AND dealer_id = public.get_auth_org_id()) OR
        (public.get_auth_role() = 'OEM' AND oem_id = public.get_auth_org_id()) OR
        (public.get_auth_role() IN ('PARTNER', 'TECHNICIAN') AND id IN (SELECT vehicle_id FROM public.installations WHERE (partner_id = public.get_auth_org_id() OR technician_id = auth.uid())))
    )
);

CREATE POLICY "Chargers Read Access" ON public.chargers FOR SELECT USING (
    deleted_at IS NULL AND (
        public.get_auth_role() = 'ACS_ADMIN' OR
        id IN (
            SELECT c.id FROM public.chargers c
            JOIN public.installations i ON i.charger_id = c.id
            WHERE 
                (public.get_auth_role() = 'OEM' AND i.oem_id = public.get_auth_org_id()) OR
                (public.get_auth_role() = 'DEALER' AND i.dealer_id = public.get_auth_org_id()) OR
                (public.get_auth_role() = 'PARTNER' AND i.partner_id = public.get_auth_org_id()) OR
                (public.get_auth_role() = 'TECHNICIAN' AND i.technician_id = auth.uid())
        )
    )
);
