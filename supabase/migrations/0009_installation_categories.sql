-- Add installation_category type
CREATE TYPE public.installation_category AS ENUM (
    'INSTALLATION_ONLY',
    'INSTALLATION_AND_EARTHING'
);

-- Add category column to installations, defaulting to INSTALLATION_AND_EARTHING
-- to remain backward compatible with all the UI expecting earthing photos so far
ALTER TABLE public.installations 
ADD COLUMN category public.installation_category NOT NULL DEFAULT 'INSTALLATION_AND_EARTHING';

-- We do not alter any RLS policies here as the existing policies on `installations` 
-- automatically cover this new column. It will be readable/writable based on existing rules.
