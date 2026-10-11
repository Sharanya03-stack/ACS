-- 0034_custom_technician_name.sql
-- Support manual name-based technician assignments and external uploads without registered profile

-- 1. Add custom_technician_name column to installations
ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS custom_technician_name TEXT;

-- 2. Make uploaded_by nullable on installation_photos while preserving foreign key constraint
ALTER TABLE public.installation_photos
  ALTER COLUMN uploaded_by DROP NOT NULL;
