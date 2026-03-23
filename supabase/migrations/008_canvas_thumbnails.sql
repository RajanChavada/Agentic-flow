-- Add thumbnail_url column to canvases
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create thumbnails bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access to thumbnails
CREATE POLICY "Public thumbnail access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Grant authenticated user upload access
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (auth.uid() = owner));

-- Grant authenticated user update/delete access
CREATE POLICY "Authenticated users can update own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails' AND (auth.uid() = owner));

CREATE POLICY "Authenticated users can delete own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails' AND (auth.uid() = owner));
