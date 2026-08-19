-- 0007_storage_installation_photos.sql

-- 1. Create the private bucket 'installation-evidence' if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'installation-evidence',
  'installation-evidence',
  false,
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Storage RLS Policies

-- Policy: Allow technicians to upload to their assigned installations
-- Path convention: {installation_id}/{uuid}.{ext}
-- We extract the first part of the path (installation_id) and verify the user is the assigned technician.
CREATE POLICY "Technician can upload evidence for assigned installation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'installation-evidence' AND
    (auth.uid() IN (
        SELECT technician_id FROM public.installations
        WHERE id::text = (string_to_array(name, '/'))[1]
    ))
);

-- Policy: Allow users to view evidence if they can view the installation
-- Since installations has its own SELECT policies (e.g., admin sees all, dealer sees their own, tech sees assigned)
-- we just check if the installation_id exists in the viewable installations for this user.
CREATE POLICY "Users can view evidence if they can view the installation"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'installation-evidence' AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id::text = (string_to_array(name, '/'))[1]
    )
);

-- Policy: Prevent updates to existing evidence
CREATE POLICY "Prevent updates to installation evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Policy: Allow technicians to delete evidence for their assigned installation (e.g. before submission)
-- In a strict setup we might prevent deletion, but we allow it if the status is IN_PROGRESS 
-- or just if they are the technician.
CREATE POLICY "Technicians can delete evidence for their assigned installation"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'installation-evidence' AND
    (auth.uid() IN (
        SELECT technician_id FROM public.installations
        WHERE id::text = (string_to_array(name, '/'))[1]
        AND status = 'IN_PROGRESS'
    ))
);


-- 3. Database RLS Policies for installation_photos table

-- Drop any existing policies on installation_photos just in case
DROP POLICY IF EXISTS "Users can view photos of visible installations" ON public.installation_photos;
DROP POLICY IF EXISTS "Technicians can insert photos for their installations" ON public.installation_photos;
DROP POLICY IF EXISTS "Technicians can delete photos for their installations" ON public.installation_photos;

-- SELECT: Users can view photos if they can view the installation
CREATE POLICY "Users can view photos of visible installations"
ON public.installation_photos FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id = installation_photos.installation_id
    )
);

-- INSERT: Technicians can insert photos if they own the installation and it's in progress
CREATE POLICY "Technicians can insert photos for their installations"
ON public.installation_photos FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id = installation_photos.installation_id
        AND technician_id = auth.uid()
        AND status = 'IN_PROGRESS'
    )
);

-- DELETE: Technicians can delete photos before submission
CREATE POLICY "Technicians can delete photos for their installations"
ON public.installation_photos FOR DELETE
TO authenticated
USING (
    auth.uid() = uploaded_by AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id = installation_photos.installation_id
        AND technician_id = auth.uid()
        AND status = 'IN_PROGRESS'
    )
);

-- UPDATE: No updates allowed on photo metadata
CREATE POLICY "Prevent updates to installation photos"
ON public.installation_photos FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
