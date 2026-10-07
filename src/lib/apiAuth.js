import { createClient } from '@/lib/supabase/server'

// One place for "who is calling this API route?" — accepts either a Bearer
// token (the native app and the Android WebView wrapper send this) or the
// normal session cookie (regular browsers). Returns the user or null.
export async function getRequestUser(req) {
  const supabase = await createClient()
  const header = req.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  return user || null
}

export function unauthorized() {
  return Response.json({ error: 'Not signed in' }, { status: 401 })
}

// Best-effort, per-server-instance rate limiter. On serverless hosting each
// instance keeps its own counters, so this is a brake on casual abuse (a
// script hammering one endpoint), not a hard global quota.
const buckets = new Map()
export function rateLimited(key, max, windowMs) {
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs)
  if (hits.length >= max) {
    buckets.set(key, hits)
    return true
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some(t => now - t < windowMs)) buckets.delete(k)
  }
  return false
}

export function tooManyRequests() {
  return Response.json({ error: 'Too many requests — please slow down and try again in a minute.' }, { status: 429 })
}

// Top-level folders uploads may go into. Anything else is rejected.
const ALLOWED_PREFIXES = new Set([
  'avatars', 'posts', 'messages', 'voice', 'stickers', 'chats', 'groups',
  'reels', 'store', 'ads', 'stories', 'comments', 'verification-ids',
])
// Folders that belong to one person: whatever comes right after the folder
// name must start with that person's own user id, so nobody can write into
// (or overwrite files in) someone else's area.
const OWNED_PREFIXES = new Set([
  'avatars', 'posts', 'messages', 'reels', 'store', 'stickers', 'comments', 'verification-ids',
])

// Returns { key } for a safe storage key, or { error } explaining why not.
export function validateUploadKey(rawPath, userId) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return { error: 'Missing path' }
  if (rawPath.length > 400) return { error: 'Path too long' }
  if (/[\u0000-\u001f\\]/.test(rawPath) || rawPath.includes('..')) return { error: 'Invalid path' }
  const key = rawPath.replace(/^\/+/, '')
  const parts = key.split('/')
  if (parts.some(p => !p)) return { error: 'Invalid path' }
  if (parts.length < 2) return { error: 'Invalid path' }
  const prefix = parts[0]
  if (!ALLOWED_PREFIXES.has(prefix)) return { error: 'Upload location not allowed' }
  if (OWNED_PREFIXES.has(prefix) && !parts[1].startsWith(userId)) {
    return { error: 'You can only upload into your own folder' }
  }
  return { key }
}

// Blocks content types that a browser could execute if served from our
// public storage domain (SVG, HTML, scripts). Images, video and audio only
// — plus a missing / generic type, which just downloads.
export function isAllowedContentType(type) {
  const t = (type || '').toLowerCase().split(';')[0].trim()
  if (!t || t === 'application/octet-stream') return true
  if (t === 'image/svg+xml') return false
  return /^(image|video|audio)\//.test(t)
}
