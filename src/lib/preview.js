import { createClient } from '@supabase/supabase-js'

// Link previews (WhatsApp, Telegram, Facebook, ...) are fetched by a robot that
// is NOT signed in, so the page must be able to read the few public facts it
// shows (name, picture, first words of a post) without a login. This uses the
// server key, but ONLY ever returns what is safe to show, and nothing at all
// for private profiles. Never send the full row to the page.
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const SITE = 'https://xchord.space'
const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const absolute = (u) => (u && /^https?:\/\//i.test(u) ? u : null)

export const DEFAULT_PREVIEW = {
  title: 'Flitters — Connect Globally',
  description: 'Join Flitters and connect with the world. Share posts, reels, send messages, join groups and more.',
  image: null,
}

export async function getPostPreview(id) {
  try {
    const sb = client()
    const cols = 'content,image_url,video_url,user_id,author:profiles(display_name,username,avatar_url,is_private)'
    let { data: post, error } = await sb.from('posts').select(cols + ',thumbnail_url').eq('id', id).maybeSingle()
    // The thumbnail_url column may not exist yet.
    if (error) ({ data: post } = await sb.from('posts').select(cols).eq('id', id).maybeSingle())
    if (!post) return null
    const a = post.author || {}
    if (a.is_private) return { ...DEFAULT_PREVIEW, private: true }
    const name = a.display_name || a.username || 'Someone'
    let image = absolute(post.image_url) || absolute(post.thumbnail_url)
    if (!image && post.video_url) {
      // Older videos: a poster saved on the matching reel, if any.
      const { data: reel } = await sb.from('reels').select('thumbnail_url').eq('video_url', post.video_url).not('thumbnail_url', 'is', null).limit(1)
      image = absolute(reel?.[0]?.thumbnail_url)
    }
    if (!image) image = absolute(a.avatar_url)
    const text = clip(post.content, 160)
    return {
      title: `${name} on Flitters`,
      description: text || (post.video_url ? '🎥 Watch this video on Flitters' : 'shared a post on Flitters'),
      image,
      url: `${SITE}/p/${id}`,
    }
  } catch {
    return null
  }
}

export async function getProfilePreview(username) {
  try {
    const sb = client()
    const clean = String(username || '').replace(/^@/, '').replace(/[%_]/g, (m) => '\\' + m)
    const { data: p } = await sb
      .from('profiles')
      .select('id,display_name,username,bio,avatar_url,followers_count,is_private')
      .ilike('username', clean)
      .maybeSingle()
    if (!p) return null
    const name = p.display_name || p.username
    const followers = p.followers_count || 0
    return {
      id: p.id,
      title: `${name} (@${p.username}) on Flitters`,
      description: p.is_private ? 'This profile is private. Follow to see their posts.' : clip(p.bio, 160) || `${followers} follower${followers === 1 ? '' : 's'} on Flitters`,
      image: absolute(p.avatar_url),
      url: `${SITE}/u/${p.username}`,
    }
  } catch {
    return null
  }
}

export async function getGroupPreview(tag) {
  try {
    const sb = client()
    const clean = String(tag || '').replace(/^@/, '')
    const { data: g } = await sb.from('groups').select('name,tag,description,avatar_url').eq('tag', clean).maybeSingle()
    if (!g) return null
    return {
      title: `Join ${g.name} on Flitters`,
      description: clip(g.description, 160) || `@${g.tag} — a group on Flitters`,
      image: absolute(g.avatar_url),
      url: `${SITE}/join/${g.tag}`,
    }
  } catch {
    return null
  }
}

// Turns a preview into Next.js metadata (Open Graph + Twitter card).
export function previewMetadata(p, fallbackTitle) {
  const v = p || { ...DEFAULT_PREVIEW, title: fallbackTitle || DEFAULT_PREVIEW.title }
  const images = v.image ? [{ url: v.image }] : [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Flitters' }]
  return {
    title: v.title,
    description: v.description,
    openGraph: { title: v.title, description: v.description, url: v.url, siteName: 'Flitters', type: 'website', images },
    twitter: { card: 'summary_large_image', title: v.title, description: v.description, images: images.map((i) => i.url) },
  }
}
