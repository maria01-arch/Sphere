import { createClient } from '@/lib/supabase/server'
import { finishChunkedUpload } from '@/lib/media/r2'

export const runtime = 'nodejs'
export const maxDuration = 60 // reassembling ~60s of video (a few tens of MB) needs more than the 10s default

// Body (JSON): { uploadId, totalChunks, path, contentType }
// Fetches every chunk back from R2 in order, concatenates them, and writes
// the result as one normal object at `path`. Returns { publicUrl }.
export async function POST(req) {
  const supabase = await createClient()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { uploadId, totalChunks, path, contentType } = await req.json()
  if (!uploadId || !totalChunks || !path || typeof path !== 'string' || typeof uploadId !== 'string') {
    return Response.json({ error: 'Missing uploadId, totalChunks, or path' }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    return Response.json({ error: 'Invalid uploadId' }, { status: 400 })
  }
  const key = path.replace(/^\/+/, '').replace(/\.\./g, '')

  try {
    const { publicUrl } = await finishChunkedUpload(uploadId, totalChunks, key, contentType)
    return Response.json({ publicUrl })
  } catch (err) {
    return Response.json({ error: err.message || 'Could not finish upload' }, { status: 500 })
  }
}
