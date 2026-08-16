import { createClient } from '@/lib/supabase/server'
import { uploadImageDirect } from '@/lib/media/r2'

export const runtime = 'nodejs'

// Body: multipart/form-data with fields "file" and "path" (e.g. 'avatars/uid.png')
// Returns: { publicUrl } — the file already lives in R2 by the time this
// responds; nothing further for the client to upload.
//
// Earlier version handed the browser a presigned URL and had it PUT the file
// straight to R2. That requires R2's CORS policy to allow the calling origin,
// which broke inside this app's Android WebView wrapper ("Failed to fetch").
// Routing the bytes through our own server instead sidesteps CORS entirely.
export async function POST(req) {
  const supabase = await createClient()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  const path = form.get('path')
  if (!file || !path || typeof path !== 'string') {
    return Response.json({ error: 'Missing file or path' }, { status: 400 })
  }
  // Keep uploads scoped to a clean relative key — no leading slashes, no ..
  const key = path.replace(/^\/+/, '').replace(/\.\./g, '')

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const { publicUrl } = await uploadImageDirect(key, bytes, file.type)
    return Response.json({ publicUrl })
  } catch (err) {
    return Response.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
