import { createClient } from '@/lib/supabase/server'
import { createVideoUploadUrl } from '@/lib/media/stream'

export const runtime = 'nodejs'

// Returns: { uploadUrl, publicUrl, thumbnailUrl } — client POSTs the file
// (as multipart/form-data, field name "file") directly to uploadUrl.
// publicUrl is an HLS manifest (.m3u8) — play it with the HlsVideo component.
export async function POST(req) {
  const supabase = await createClient()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let maxDurationSeconds = 180
  try {
    const body = await req.json()
    if (body?.maxDurationSeconds) maxDurationSeconds = body.maxDurationSeconds
  } catch { /* no body sent — use default */ }

  try {
    const { uploadUrl, playbackUrl, thumbnailUrl } = await createVideoUploadUrl({ maxDurationSeconds })
    return Response.json({ uploadUrl, publicUrl: playbackUrl, thumbnailUrl })
  } catch (err) {
    return Response.json({ error: err.message || 'Could not create upload URL' }, { status: 500 })
  }
}
