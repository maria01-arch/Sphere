// Cloudflare Stream handles video for us: it transcodes whatever gets
// uploaded into adaptive HLS, generates a thumbnail, and serves it from
// Cloudflare's edge — which is what makes reels start playing instantly
// instead of waiting on a single big file from origin.
//
// "Direct creator upload" gives the browser a one-time URL to POST the
// video file straight to Cloudflare — our server only ever asks for that
// URL, it never touches the video bytes itself.
export async function createVideoUploadUrl({ maxDurationSeconds = 180 } = {}) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: false,
      }),
    }
  )
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message || 'Cloudflare Stream request failed')
  }
  const uid = json.result.uid
  const uploadUrl = json.result.uploadURL
  const playbackUrl = `https://customer-${process.env.CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${uid}/manifest/video.m3u8`
  const thumbnailUrl = `https://customer-${process.env.CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg`
  return { uploadUrl, playbackUrl, thumbnailUrl, uid }
}
