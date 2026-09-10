import { createClient } from '@/lib/supabase/server'
import { uploadChunkDirect } from '@/lib/media/r2'

export const runtime = 'nodejs'

// Body: multipart/form-data with fields "uploadId", "index", "chunk".
// Each chunk is stored as its own small object — see r2.js for why this
// isn't real S3 multipart upload. Client sends these sequentially (or with
// limited concurrency) and then calls /api/upload/video-finish once every
// chunk has landed.
export async function POST(req) {
  const supabase = await createClient()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const form = await req.formData()
  const uploadId = form.get('uploadId')
  const index = form.get('index')
  const chunk = form.get('chunk')
  if (!uploadId || index === null || !chunk || typeof uploadId !== 'string') {
    return Response.json({ error: 'Missing uploadId, index, or chunk' }, { status: 400 })
  }
  // uploadId ends up in an R2 key — keep it to a safe character set so it
  // can never be used to write outside the tmp-uploads/ prefix.
  if (!/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    return Response.json({ error: 'Invalid uploadId' }, { status: 400 })
  }

  try {
    const bytes = Buffer.from(await chunk.arrayBuffer())
    await uploadChunkDirect(uploadId, Number(index), bytes)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message || 'Chunk upload failed' }, { status: 500 })
  }
}
