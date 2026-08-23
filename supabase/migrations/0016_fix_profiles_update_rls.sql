-- 0016_fix_profiles_update_rls.sql

-- First, ensure any existing faulty update policy is removed
DROP POLICY IF EXISTS "Profiles Update Own" ON public.profiles;

-- Create the correct Update policy for profiles
-- This allows any authenticated user to update their own profile row.
-- USING checks the existing row, WITH CHECK validates the new row data.
CREATE POLICY "Profiles Update Own" ON public.profiles 
FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());
