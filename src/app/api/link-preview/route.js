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

function decodeEntities(s) {
  if (!s) return s
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
}

function pick(html, re) {
  const m = html.match(re)
  return m ? m[1].trim() : null
}

export async function GET(req) {
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
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlittersLinkPreview/1.0)' },
    })
    clearTimeout(timeout)
    if (!res.ok) return Response.json({ error: 'Could not fetch that link' }, { status: 502 })

    // Re-check the final (post-redirect) host too — a redirect could point
    // somewhere internal even if the original URL looked fine.
    if (isBlockedHost(new URL(res.url).hostname)) return Response.json({ error: 'That host cannot be previewed' }, { status: 400 })

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
