-- Restrict ticket-attachments uploads to a safe MIME allowlist at the storage layer
DROP POLICY IF EXISTS "Editors upload ticket attachments" ON storage.objects;

CREATE POLICY "Editors upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND public.can_edit_tickets(auth.uid())
  AND (
    (storage.objects.metadata->>'mimetype') IN (
      'image/jpeg','image/png','image/gif','image/webp','image/heic',
      'application/pdf',
      'text/plain','text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip'
    )
  )
);