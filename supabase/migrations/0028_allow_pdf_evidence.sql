UPDATE storage.buckets
SET allowed_mime_types = '{"image/jpeg","image/png","image/webp","application/pdf"}'
WHERE id = 'installation-evidence';
