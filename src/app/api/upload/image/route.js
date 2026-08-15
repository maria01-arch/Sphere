import { createClient } from '@/lib/supabase/server'
import { createImageUploadUrl } from '@/lib/media/r2'

export const runtime = 'nodejs'

// Body: { path: 'avatars/uid.png', contentType: 'image/png' }
// Returns: { uploadUrl, publicUrl } — client PUTs the file directly to
// uploadUrl, then saves publicUrl into the same DB columns as before.
export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { path, contentType } = await req.json()
  if (!path || typeof path !== 'string') {
    return Response.json({ error: 'Missing path' }, { status: 400 })
  }
  // Keep uploads scoped to a clean relative key — no leading slashes, no ..
  const key = path.replace(/^\/+/, '').replace(/\.\./g, '')

  try {
    const { uploadUrl, publicUrl } = await createImageUploadUrl(key, contentType)
    return Response.json({ uploadUrl, publicUrl })
  } catch (err) {
    return Response.json({ error: err.message || 'Could not create upload URL' }, { status: 500 })
  }
}
