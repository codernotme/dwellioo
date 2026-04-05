-- =============================================================================
-- Storage Buckets & RLS Policies
-- Dwellioo SaaS Platform
-- Run in Supabase SQL Editor (after migration push) OR include in a migration
-- =============================================================================

-- Create all storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',             'avatars',             FALSE, 5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('property-assets',     'property-assets',     FALSE, 10485760,  ARRAY['image/jpeg','image/png','image/webp']),
  ('notice-attachments',  'notice-attachments',  FALSE, 52428800,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('event-gallery',       'event-gallery',       FALSE, 10485760,  ARRAY['image/jpeg','image/png','image/webp']),
  ('complaint-photos',    'complaint-photos',    FALSE, 10485760,  ARRAY['image/jpeg','image/png','image/webp']),
  ('provider-photos',     'provider-photos',     FALSE, 5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('receipts',            'receipts',            FALSE, 10485760,  ARRAY['application/pdf']),
  ('visitor-selfies',     'visitor-selfies',     FALSE, 5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('delivery-photos',     'delivery-photos',     FALSE, 5242880,   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- AVATARS — user uploads their own avatar
-- Path pattern: avatars/{profile_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY avatars_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (
      -- Own avatar
      (string_to_array(name, '/'))[1] = auth.uid()::TEXT
      -- Same account members
      OR EXISTS (
        SELECT 1 FROM profiles p1
        JOIN profiles p2 ON p2.account_id = p1.account_id
        WHERE p1.id = auth.uid()
          AND p2.id = ((string_to_array(name, '/'))[1])::UUID
      )
    )
  );

CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::TEXT
  );

CREATE POLICY avatars_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::TEXT
  );

CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::TEXT
  );

-- ---------------------------------------------------------------------------
-- PROPERTY ASSETS — managers upload; residents can view
-- Path pattern: property-assets/{property_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY property_assets_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-assets'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY property_assets_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-assets'
    AND auth.is_manager_of(((string_to_array(name, '/'))[1])::UUID)
  );

CREATE POLICY property_assets_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-assets'
    AND auth.is_manager_of(((string_to_array(name, '/'))[1])::UUID)
  );

-- ---------------------------------------------------------------------------
-- NOTICE ATTACHMENTS — managers upload; property members can read
-- Path pattern: notice-attachments/{property_id}/{notice_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY notice_attachments_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'notice-attachments'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY notice_attachments_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'notice-attachments'
    AND auth.is_manager_of(((string_to_array(name, '/'))[1])::UUID)
  );

-- ---------------------------------------------------------------------------
-- EVENT GALLERY — managers upload; all property members can view
-- Path pattern: event-gallery/{property_id}/{event_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY event_gallery_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-gallery'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY event_gallery_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-gallery'
    AND auth.is_manager_of(((string_to_array(name, '/'))[1])::UUID)
  );

-- ---------------------------------------------------------------------------
-- COMPLAINT PHOTOS — residents upload their own; staff can view
-- Path pattern: complaint-photos/{property_id}/{complaint_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY complaint_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'complaint-photos'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY complaint_photos_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-photos'
    AND auth.is_resident_of(((string_to_array(name, '/'))[1])::UUID)
  );

-- ---------------------------------------------------------------------------
-- PROVIDER PHOTOS — managers / providers upload; all property members view
-- Path pattern: provider-photos/{property_id}/{provider_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY provider_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-photos'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY provider_photos_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-photos'
    AND (
      auth.is_manager_of(((string_to_array(name, '/'))[1])::UUID)
      OR auth.is_resident_of(((string_to_array(name, '/'))[1])::UUID)
    )
  );

-- ---------------------------------------------------------------------------
-- RECEIPTS — backend only writes; residents can read their own
-- Path pattern: receipts/{account_id}/{property_id}/{receipt_number}.pdf
-- ---------------------------------------------------------------------------
CREATE POLICY receipts_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (
      ((string_to_array(name, '/'))[2])::UUID = ANY(auth.my_property_ids())
      OR auth.is_super_admin()
    )
  );

-- Only service role can insert receipts (PDF generated by Edge Function)

-- ---------------------------------------------------------------------------
-- VISITOR SELFIES — watchman uploads; resident + staff can view
-- Path pattern: visitor-selfies/{property_id}/{visitor_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY visitor_selfies_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'visitor-selfies'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY visitor_selfies_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'visitor-selfies'
    AND auth.is_staff_of(((string_to_array(name, '/'))[1])::UUID)
  );

-- ---------------------------------------------------------------------------
-- DELIVERY PHOTOS — watchman uploads; resident + staff can view
-- Path pattern: delivery-photos/{property_id}/{delivery_id}/{filename}
-- ---------------------------------------------------------------------------
CREATE POLICY delivery_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'delivery-photos'
    AND ((string_to_array(name, '/'))[1])::UUID = ANY(auth.my_property_ids())
  );

CREATE POLICY delivery_photos_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'delivery-photos'
    AND auth.is_staff_of(((string_to_array(name, '/'))[1])::UUID)
  );
