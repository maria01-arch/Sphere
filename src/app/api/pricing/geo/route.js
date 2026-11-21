import { currencyForCountry } from '@/lib/countryCurrency'

export const runtime = 'nodejs'

// Tells the page which currency to show (from the visitor's country, which Vercel adds to
// every request) and how many of that currency one Naira is worth right now.
// ?currency=GHS lets the visitor pick a different currency themselves.
export async function GET(req) {
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase()
  const asked = (new URL(req.url).searchParams.get('currency') || '').toUpperCase()
  const currency = /^[A-Z]{3}$/.test(asked) ? asked : currencyForCountry(country)
  let rate = null
  if (currency === 'NGN') rate = 1
  else {
    try {
      // Rates by Exchange Rate API (open.er-api.com). Cached for 6 hours.
      const r = await fetch('https://open.er-api.com/v6/latest/NGN', { next: { revalidate: 21600 } })
      const j = await r.json()
      const v = j?.rates?.[currency]
      if (typeof v === 'number' && v > 0) rate = v
    } catch {}
  }
  return Response.json({ country, currency, rate }, { headers: { 'Cache-Control': 'private, max-age=1800' } })
}
