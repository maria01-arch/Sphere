
// Strips trailing punctuation a sentence would naturally have right after a
// URL ("check http://x.com!" shouldn't swallow the "!" into the link).
export function splitTrailingPunct(url) {
  const m = url.match(/^(.*?)([.,!?;:'"\)\]\}]*)$/)
  return [m[1], m[2]]
}

export const URL_TOKEN_RE = /^https?:\/\//i

export const URL_TOKEN_RE2 = /^www\.[a-zA-Z0-9]/i

export function isUrlToken(token) { return URL_TOKEN_RE.test(token) || URL_TOKEN_RE2.test(token) }

export function urlHref(cleanToken) { return URL_TOKEN_RE.test(cleanToken) ? cleanToken : 'https://'+cleanToken }

// First URL found in a block of text, normalized to an absolute href — used
// to decide whether to attach a LinkPreviewCard below a message/post.
export function getFirstUrl(text) {
  if(!text) return null
  const m = text.match(/(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][^\s]*)/i)
  if(!m) return null
  const [clean] = splitTrailingPunct(m[0])
  return urlHref(clean)
}
