import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 is S3-compatible, so the regular AWS S3 SDK talks to it
// directly — just point the endpoint at your account's R2 URL. R2 has zero
// egress fees, which is the whole reason images move here instead of
// staying in a normal S3/Supabase bucket.
let _client = null
function client() {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  return _client
}

// Returns a short-lived URL the browser can PUT the file to directly —
// the file bytes never pass through our server.
export async function createImageUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  })
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 300 })
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '')
  const publicUrl = `${base}/${key}`
  return { uploadUrl, publicUrl }
}
