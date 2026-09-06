-- 0029_per_year_installation_number.sql

-- 1. Create counter table
CREATE TABLE IF NOT EXISTS public.installation_number_counters (
    year INT PRIMARY KEY,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on installation_number_counters
ALTER TABLE public.installation_number_counters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can read counters
DROP POLICY IF EXISTS "Authenticated users can view installation counters" ON public.installation_number_counters;
CREATE POLICY "Authenticated users can view installation counters"
ON public.installation_number_counters FOR SELECT
TO authenticated
USING (true);

-- 2. SECURITY DEFINER function to safely increment counter table bypassing RLS restrictions securely
CREATE OR REPLACE FUNCTION public.generate_next_installation_display_id(p_created_at TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INT;
    v_val INT;
BEGIN
    v_year := EXTRACT(YEAR FROM COALESCE(p_created_at, NOW()))::INT;

    -- Atomic UPSERT with row-level lock
    INSERT INTO public.installation_number_counters (year, last_number, updated_at)
    VALUES (v_year, 1, NOW())
    ON CONFLICT (year) 
    DO UPDATE SET 
        last_number = public.installation_number_counters.last_number + 1,
        updated_at = NOW()
    RETURNING last_number INTO v_val;

    RETURN 'ACS-INS-' || v_year::text || '-' || LPAD(v_val::text, 4, '0');
END;
$$;

-- 3. Installation Trigger Function
CREATE OR REPLACE FUNCTION public.set_installations_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL OR NEW.display_id LIKE 'ORD-%' THEN
        NEW.display_id := public.generate_next_installation_display_id(NEW.created_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_installations_display_id ON public.installations;
CREATE TRIGGER trg_set_installations_display_id
BEFORE INSERT ON public.installations
FOR EACH ROW
EXECUTE FUNCTION public.set_installations_display_id();

-- 4. Backfill existing installations chronologically & sync counter table
DO $$
DECLARE
    r RECORD;
    v_year INT;
    v_max_val INT;
BEGIN
    -- Chronologically assign ACS-INS-YYYY-XXXX to existing installations
    WITH numbered_installations AS (
        SELECT 
            id,
            created_at,
            EXTRACT(YEAR FROM created_at)::INT AS yr,
            ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at, id) AS seq_num
        FROM public.installations
    )
    UPDATE public.installations i
    SET display_id = 'ACS-INS-' || n.yr::text || '-' || LPAD(n.seq_num::text, 4, '0')
    FROM numbered_installations n
    WHERE i.id = n.id;

    -- Synchronize installation_number_counters for all historical years
    FOR r IN SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT AS yr FROM public.installations LOOP
        v_year := r.yr;
        
        SELECT COALESCE(MAX(
            NULLIF(REGEXP_REPLACE(display_id, '^ACS-INS-\d{4}-', ''), '')::INT
        ), 0) INTO v_max_val
        FROM public.installations
        WHERE EXTRACT(YEAR FROM created_at) = v_year;

        INSERT INTO public.installation_number_counters (year, last_number, updated_at)
        VALUES (v_year, v_max_val, NOW())
        ON CONFLICT (year) 
        DO UPDATE SET last_number = v_max_val, updated_at = NOW();
    END LOOP;
END $$;
