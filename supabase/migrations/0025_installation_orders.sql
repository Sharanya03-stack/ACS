-- 0025_installation_orders.sql

-- 1. Extend installations
ALTER TABLE public.installations
ADD COLUMN remarks TEXT,
ADD COLUMN tracking_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- 2. Create installation_documents
CREATE TABLE public.installation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 3. Enable RLS
ALTER TABLE public.installation_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS for installation_documents
CREATE POLICY "Users can view documents of visible installations"
ON public.installation_documents FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM public.installations
        WHERE id = installation_documents.installation_id
    )
);

CREATE POLICY "Users can upload documents for visible installations"
ON public.installation_documents FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id = installation_documents.installation_id
    )
);

CREATE POLICY "Uploader or admin can delete documents"
ON public.installation_documents FOR DELETE
TO authenticated
USING (
    auth.uid() = uploaded_by OR 
    public.get_auth_role() = 'ACS_ADMIN'
);

CREATE POLICY "Prevent updates to installation documents"
ON public.installation_documents FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- 5. Storage Bucket for installation-documents
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'installation-documents',
  'installation-documents',
  false,
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS Policies for installation-documents
CREATE POLICY "Users can upload documents for assigned installation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'installation-documents' AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id::text = (string_to_array(name, '/'))[1]
    )
);

CREATE POLICY "Users can view documents if they can view the installation"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'installation-documents' AND
    EXISTS (
        SELECT 1 FROM public.installations
        WHERE id::text = (string_to_array(name, '/'))[1]
    )
);

CREATE POLICY "Prevent updates to installation documents storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Uploader or admin can delete documents storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'installation-documents' AND
    (
        public.get_auth_role() = 'ACS_ADMIN' OR
        EXISTS (
            SELECT 1 FROM public.installation_documents
            WHERE storage_path = name AND uploaded_by = auth.uid()
        )
    )
);
