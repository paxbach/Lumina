import { supabase } from '@/lib/supabase'

/**
 * Family photo storage helpers — Phase 3 capture flow.
 *
 * Path convention (matches Supabase Storage bucket layout, fixed in
 * migration 0002 + 0004):
 *
 *   family-photos/{familyId}/{YYYY-MM}/{momentId}.jpg
 *
 * The Phase 3.1 capture flow will:
 *   1. let the kid take/pick a photo,
 *   2. run it through stripImageMetadata (existing helper, EXIF/GPS
 *      removal — see src/store/useAppStore.ts:52-95),
 *   3. upload to `family-photos` using the helpers below,
 *   4. call create_family_moment RPC with the resulting path,
 *   5. let Realtime push the new row to all connected tabs.
 */

const BUCKET = 'family-photos'

/**
 * Compose the storage path for a new moment photo. We mint a stable
 * id up-front (the row id will use the same value) so the DB row + the
 * object share an identifier and can be deleted as a pair.
 */
export function familyPhotoPath(input: {
  familyId: string
  momentId: string
  /** Optional date override — defaults to `now`. */
  date?: Date
  ext?: 'jpg' | 'jpeg' | 'png' | 'webp'
}): string {
  const d = input.date ?? new Date()
  const yyyy = d.getFullYear().toString()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const ext = input.ext ?? 'jpg'
  return `${input.familyId}/${yyyy}-${mm}/${input.momentId}.${ext}`
}

/**
 * Upload a blob/file to the `family-photos` bucket at the computed
 * path. The caller is responsible for EXIF/GPS stripping BEFORE
 * calling — pass the cleaned blob, not the raw camera output.
 *
 * Returns the storage path on success; throws on failure.
 */
export async function uploadFamilyPhoto(input: {
  familyId: string
  momentId: string
  file: Blob | File
  date?: Date
}): Promise<string> {
  const path = familyPhotoPath({
    familyId: input.familyId,
    momentId: input.momentId,
    date: input.date,
  })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, {
      cacheControl: '31536000', // immutable — path is unique per moment id
      upsert: false,
      contentType: input.file.type || 'image/jpeg',
    })
  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
  return path
}

/**
 * Synchronous resolver for the family-photos bucket. `getPublicUrl`
 * is, despite the name, a *pure local* string-builder in supabase-js
 * — no network call, no Promise needed. We expose a sync variant so
 * components can use it directly in render without a useState dance
 * (which previously caused a render-loop with Zustand v5 selectors).
 *
 * Returns `null` only when the path string is empty.
 */
export function familyPhotoPublicUrl(photoPath: string): string | null {
  if (!photoPath) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(photoPath)
  return data?.publicUrl ?? null
}

/**
 * Async wrapper, kept for forward-compat: once we tighten RLS to
 * `public: false`, this is the surface that'll mint signed URLs.
 * Today it's just `familyPhotoPublicUrl` wrapped in a Promise.
 */
export async function familyPhotoUrl(photoPath: string): Promise<string | null> {
  return familyPhotoPublicUrl(photoPath)
}

/**
 * Convenience: ask Supabase for a 1-hour signed URL (used when the
 * bucket is locked down in Phase 4).
 */
export async function familyPhotoSignedUrl(
  photoPath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(photoPath, expiresInSeconds)
  if (error) return null
  return data?.signedUrl ?? null
}
