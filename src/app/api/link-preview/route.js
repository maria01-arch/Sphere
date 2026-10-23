import dns from 'dns/promises'
import net from 'net'
import { rateLimited } from '@/lib/apiAuth'

export const runtime = 'nodejs'

// Blocks requests aimed at internal/private network targets — this route
// fetches whatever URL the client hands it, so without this check it would
// be a ready-made SSRF proxy into localhost, the cloud metadata endpoint, or
// any private IP the server can reach.
function isBlockedHost(hostname) {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true
  return false
}

// A host name can look harmless but RESOLVE to an internal address (for example
// 127.0.0.1.nip.io), so the name alone is not enough: look up what it points to
// and refuse anything private, loopback or reserved.
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase()
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:')
  }
  return true
}
async function assertPublicHost(hostname) {
  if (isBlockedHost(hostname)) throw new Error('blocked')
  const addrs = await dns.lookup(hostname, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('blocked')
}

function decodeEntities(s) {
  if (!s) return s
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
}

function pick(html, re) {
  const m = html.match(re)
  return m ? m[1].trim() : null
}

export async function GET(req) {
  // The preview route is public, so keep one address from hammering it.
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  if (rateLimited('link-preview:' + ip, 40, 60_000)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { searchParams } = new URL(req.url)
  let target = searchParams.get('url')
  if (!target) return Response.json({ error: 'Missing url' }, { status: 400 })
  if (!/^https?:\/\//i.test(target)) target = 'https://'+target

  let parsed
  try { parsed = new URL(target) } catch { return Response.json({ error: 'Invalid url' }, { status: 400 }) }
  if (!/^https?:$/.test(parsed.protocol)) return Response.json({ error: 'Invalid url' }, { status: 400 })
  if (isBlockedHost(parsed.hostname)) return Response.json({ error: 'That host cannot be previewed' }, { status: 400 })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(()=>controller.abort(), 5000)
    // Follow redirects by hand: every hop is checked BEFORE it is requested, so a
    // link can't bounce the server onto an internal address.
    let current = parsed
    let res
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicHost(current.hostname)
      res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlittersLinkPreview/1.0)' },
      })
      const location = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && location) {
        const next = new URL(location, current)
        if (!/^https?:$/.test(next.protocol)) { clearTimeout(timeout); return Response.json({ error: 'Invalid url' }, { status: 400 }) }
        current = next
        continue
      }
      break
    }
    clearTimeout(timeout)
    if (!res.ok) return Response.json({ error: 'Could not fetch that link' }, { status: 502 })

    const contentType = res.headers.get('content-type') || ''
    const domain = new URL(res.url).hostname.replace(/^www\./,'')
    if (!contentType.includes('text/html')) {
      return Response.json({ url: res.url, domain, title: null, description: null, image: null })
    }

    // og/meta tags always live near the top of <head> — no need to download
    // a whole multi-MB page just to read them.
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let html = ''
    let received = 0
    const MAX_BYTES = 300_000
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.length
      html += decoder.decode(value, { stream: true })
      if (html.includes('</head>')) break
    }
    reader.cancel().catch(()=>{})

    const title = pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
      || pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)
      || pick(html, /<title[^>]*>([^<]*)<\/title>/i)
    const description = pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
      || pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i)
      || pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      || pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
    let image = pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)
      || pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i)
    if (image && !/^https?:\/\//i.test(image)) {
      try { image = new URL(image, res.url).toString() } catch { image = null }
    }
    // Don't let an image URL that resolves to a blocked host slip through.
    if (image) { try { if (isBlockedHost(new URL(image).hostname)) image = null } catch { image = null } }

    return Response.json({
      url: res.url,
      domain,
      title: decodeEntities(title)?.slice(0,200) || null,
      description: decodeEntities(description)?.slice(0,200) || null,
      image: image || null,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Could not load preview' }, { status: 500 })
  }
}
