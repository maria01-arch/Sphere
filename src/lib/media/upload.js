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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
