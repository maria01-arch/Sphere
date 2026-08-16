import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 is S3-compatible, so the regular AWS S3 SDK talks to it
// directly — just point the endpoint at your account's R2 URL. R2 has zero
// egress fees, which is the whole reason images move here instead of
// staying in a normal S3/Supabase bucket.

// Env vars entered by hand (e.g. pasted on a phone) can pick up an invisible
// trailing space or newline, which would silently corrupt the endpoint
// hostname below and could plausibly cause exactly the kind of low-level TLS
// rejection we've been chasing. Trim defensively so that class of bug is
// impossible regardless of what's actually sitting in Vercel's env var UI.
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim()
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim()
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim()
const BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim()
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '')

let _client = null
function client() {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
    // Recent @aws-sdk/client-s3 versions default to adding flexible-checksum
    // trailers on every request. R2 doesn't fully support that behavior, and
    // it can manifest as a low-level connection failure (TLS handshake
    // errors) rather than a clean API error — this is a known R2 + AWS SDK
    // v3 compatibility gotcha, not something specific to this app.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return _client
}

// Masked diagnostic info about the current env var config — safe to surface
// in an error message (no secrets), used to actually see what's configured
// instead of guessing blind from the outside.
export function debugConfig() {
  const mask = (s) => !s ? '(empty)' : `${s.slice(0,4)}...${s.slice(-4)} (len ${s.length})`
  return {
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accountId: mask(ACCOUNT_ID),
    accessKeyId: mask(ACCESS_KEY_ID),
    secretAccessKey: mask(SECRET_ACCESS_KEY),
    bucket: BUCKET_NAME || '(empty)',
    publicBaseUrl: PUBLIC_BASE_URL || '(empty)',
  }
}

// Returns a short-lived URL the browser can PUT the file to directly —
// the file bytes never pass through our server. (Kept for reference/future
// use — the image route below no longer uses this, see uploadImageDirect.)
export async function createImageUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  })
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 300 })
  const publicUrl = `${PUBLIC_BASE_URL}/${key}`
  return { uploadUrl, publicUrl }
}

// Uploads the file straight from our own server to R2 — the browser never
// talks to R2 directly, so R2's CORS policy is irrelevant. Slightly more
// load on our server per image, but it sidesteps cross-origin/WebView
// upload failures entirely, which matters since this app also ships
// wrapped in an Android WebView with unreliable CORS/cookie behavior.
export async function uploadImageDirect(key, bytes, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: bytes,
    ContentType: contentType || 'application/octet-stream',
  })
  await client().send(command)
  return { publicUrl: `${PUBLIC_BASE_URL}/${key}` }
}
