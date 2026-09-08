-- 0030_add_technician_display_id.sql

-- 1. Add display_id column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- 2. Create Sequence for Technician Display IDs
CREATE SEQUENCE IF NOT EXISTS technicians_display_seq START 1;

-- 3. Trigger Function to assign display_id for Technicians
CREATE OR REPLACE FUNCTION public.set_technicians_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'TECHNICIAN' AND NEW.display_id IS NULL THEN
        NEW.display_id := 'TECH-' || LPAD(nextval('technicians_display_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to public.profiles
DROP TRIGGER IF EXISTS trg_set_technicians_display_id ON public.profiles;
CREATE TRIGGER trg_set_technicians_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_technicians_display_id();

-- 5. Backfill Existing Technician Profiles Chronologically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id 
        FROM public.profiles 
        WHERE role = 'TECHNICIAN' AND display_id IS NULL 
        ORDER BY created_at ASC, id ASC
    LOOP
        UPDATE public.profiles
        SET display_id = 'TECH-' || LPAD(nextval('technicians_display_seq')::text, 6, '0')
        WHERE id = r.id;
    END LOOP;
END $$;
