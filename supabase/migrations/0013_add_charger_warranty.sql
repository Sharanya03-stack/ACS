-- Add warranty tracking to chargers table
ALTER TABLE public.chargers
ADD COLUMN warranty_months INTEGER,
ADD COLUMN warranty_start_date DATE,
ADD COLUMN warranty_expiry_date DATE;

-- Since the existing RLS on chargers relies on the installations table join (already configured),
-- we do not need to alter RLS policies. The new columns are automatically protected.
