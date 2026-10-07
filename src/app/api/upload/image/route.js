import { uploadImageDirect } from '@/lib/media/r2'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests, validateUploadKey, isAllowedContentType } from '@/lib/apiAuth'

export const runtime = 'nodejs'

const MAX_BYTES = 30 * 1024 * 1024

// Body: multipart/form-data with fields "file" and "path" (e.g. 'avatars/<uid>.png')
// Returns: { publicUrl } — the file already lives in R2 by the time this
// responds; nothing further for the client to upload.
//
// Bytes go through our own server (not a presigned URL straight to R2) so
// R2's CORS policy never matters — that broke inside the Android WebView.
//
// Hardening: the caller must be signed in, the path must be inside an
// allowed folder (and, for personal folders, inside the caller's own area),
// and only image/video/audio content types are accepted (no SVG/HTML).
export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('upload:' + user.id, 120, 60_000)) return tooManyRequests()

  const form = await req.formData()
  const file = form.get('file')
  const path = form.get('path')
  if (!file || typeof file === 'string' || !path) {
    return Response.json({ error: 'Missing file or path' }, { status: 400 })
  }

  const checked = validateUploadKey(path, user.id)
  if (checked.error) return Response.json({ error: checked.error }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'File too large' }, { status: 413 })
  if (!isAllowedContentType(file.type)) return Response.json({ error: 'File type not allowed' }, { status: 415 })

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const { publicUrl } = await uploadImageDirect(checked.key, bytes, file.type)
    return Response.json({ publicUrl })
  } catch (err) {
    // Details stay in the server log only — never sent back to the client.
    console.error('Upload failed:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
