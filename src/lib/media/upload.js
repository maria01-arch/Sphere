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
//   const { publicUrl } = await uploadMedia(file, 'avatars/'+uid+'.png')
//
// Images go to Cloudflare R2, videos go to Cloudflare Stream. The file
// itself is sent straight from the browser to Cloudflare — our server only
// hands out a one-time upload URL.
export async function uploadMedia(file, path) {
  if (!file) throw new Error('No file selected')
  const isVideo = file.type?.startsWith('video/')
  return isVideo ? uploadVideo(file) : uploadImage(file, path)
}

// Exposed directly (bypassing the video/image auto-routing in uploadMedia)
// for cases like stickers: short looping clips that are small enough to
// just live as a plain file in R2 rather than go through Stream's
// transcode pipeline, so they keep working with the app's existing
// file-extension-based "is this a video sticker" check.
export async function uploadToR2(file, path) {
  return uploadImage(file, path)
}

async function uploadImage(file, path) {
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ path, contentType: file.type || 'application/octet-stream' }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Could not start upload')

  const put = await fetch(json.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!put.ok) throw new Error('Image upload failed')

  return { publicUrl: json.publicUrl }
}

async function uploadVideo(file, { maxDurationSeconds } = {}) {
  const res = await fetch('/api/upload/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(maxDurationSeconds ? { maxDurationSeconds } : {}),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Could not start upload')

  const form = new FormData()
  form.append('file', file)
  const put = await fetch(json.uploadUrl, { method: 'POST', body: form })
  if (!put.ok) throw new Error('Video upload failed')

  return { publicUrl: json.publicUrl, thumbnailUrl: json.thumbnailUrl }
}
