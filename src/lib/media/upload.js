import { createClient } from '@/lib/supabase/client'

// Cookie-based auth (via middleware) is unreliable inside the Android
// WebView wrapper this app also ships in — cookies can fail to persist there
// even though the in-memory/localStorage Supabase session works fine for
// every other call in the app. So instead of relying on the browser sending
// auth cookies to our API route, we grab the access token from the session
// that's already working and send it explicitly. The server verifies that
// token directly — no cookies required.
async function authHeader() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

// Drop-in replacement for the old pattern:
//   const {error} = await supabase.storage.from('avatars').upload(path, file, {...})
//   const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
//
// Usage:
//   const { publicUrl } = await uploadToR2(file, 'avatars/'+uid+'.png')
//
// Everything (images, stickers, voice notes, reels) lives in R2 — no
// Cloudflare Stream. R2 has zero egress fees and a generous free tier, so
// there's no fixed monthly cost the way Stream's storage billing has, which
// matters a lot for a pre-revenue app.
export async function uploadToR2(file, path) {
  return uploadImage(file, path)
}

async function uploadImage(file, path) {
  const form = new FormData()
  form.append('file', file)
  form.append('path', path)
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: await authHeader(), // no Content-Type here — the browser sets the multipart boundary itself
    body: form,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Image upload failed')
  return { publicUrl: json.publicUrl }
}

// Reads how long a video file is without uploading it anywhere — used to
// enforce the free/verified duration caps before spending any bandwidth.
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error("Couldn't read that video file — it may be corrupted or an unsupported format."))
    }
    video.src = URL.createObjectURL(file)
  })
}

const CHUNK_SIZE = 3.5 * 1024 * 1024 // comfortably under Vercel's fixed 4.5MB request-body limit

// Uploads a video straight to R2 in small chunks (see api/upload/video-chunk
// + video-finish for why — Vercel's per-request body limit and S3/R2's
// multipart-upload minimum part size are mutually exclusive, so this uses a
// simpler custom scheme instead of real multipart upload). Validates
// duration and file size against the caller's limits before doing any
// network work at all.
export async function uploadVideoChunked(file, path, { maxDurationSeconds, maxSizeBytes, onProgress } = {}) {
  if (maxDurationSeconds) {
    const duration = await getVideoDuration(file)
    if (duration > maxDurationSeconds + 0.5) { // small grace period for container rounding
      throw new Error(`That video is ${Math.round(duration)}s — the limit here is ${maxDurationSeconds}s.`)
    }
  }
  if (maxSizeBytes && file.size > maxSizeBytes) {
    throw new Error(`That file is ${(file.size/1024/1024).toFixed(1)}MB — the limit here is ${(maxSizeBytes/1024/1024).toFixed(0)}MB. Try a shorter or lower-resolution clip.`)
  }

  const uploadId = (crypto.randomUUID?.() || (Date.now()+'-'+Math.random().toString(36).slice(2))).replace(/[^a-zA-Z0-9_-]/g,'')
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE))
  const headers = await authHeader()

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i*CHUNK_SIZE, Math.min((i+1)*CHUNK_SIZE, file.size))
    const form = new FormData()
    form.append('uploadId', uploadId)
    form.append('index', String(i))
    form.append('chunk', chunk)
    const res = await fetch('/api/upload/video-chunk', { method: 'POST', headers, body: form })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `Upload failed on part ${i+1}/${totalChunks}`)
    onProgress?.((i+1)/totalChunks)
  }

  const finishRes = await fetch('/api/upload/video-finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ uploadId, totalChunks, path, contentType: file.type || 'video/mp4' }),
  })
  const finishJson = await finishRes.json()
  if (!finishRes.ok) throw new Error(finishJson.error || 'Could not finish video upload')
  return { publicUrl: finishJson.publicUrl }
}
