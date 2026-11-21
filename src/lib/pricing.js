// The ONE place the badge prices live (web). Prices are set in Naira; every other
// currency shown on the site is a live estimate of these.
//   Basic   N3,500 / month   yearly = 10% off  -> N37,800
//   Premium N10,000 / month  yearly = 20% off  -> N96,000
export const PLAN_PRICING = {
  basic:   { monthlyNGN: 3500,  annualDiscount: 0.10 },
  premium: { monthlyNGN: 10000, annualDiscount: 0.20 },
}

export const priceNGN = (plan, billing) => {
  const p = PLAN_PRICING[plan]
  if (!p) return 0
  return billing === 'annual' ? Math.round(p.monthlyNGN * 12 * (1 - p.annualDiscount)) : p.monthlyNGN
}

// Crypto is paid in dollars. Fixed amounts (about N1,356.6 per $1) so what people must send
// is always a clear number. Change these if the exchange rate moves a lot.
export const CRYPTO_USD = {
  basic:   { monthly: 2.58, annual: 27.86 },
  premium: { monthly: 7.37, annual: 70.77 },
}

// Adds one billing period to a date.
export function addPeriod(from, billing) {
  const d = new Date(from)
  if (billing === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

// Formats an amount in a currency, e.g. fmtMoney(3500,'NGN') -> "N3,500" (with the naira sign).
export function fmtMoney(amount, currency) {
  try {
    const big = currency === 'NGN' || amount >= 100
    return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : undefined, { style: 'currency', currency, maximumFractionDigits: big ? 0 : 2, minimumFractionDigits: big ? 0 : 2 }).format(amount)
  } catch { return currency + ' ' + Math.round(amount) }
}

// Currencies offered in the "change currency" picker.
export const CURRENCY_CHOICES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'INR', 'AED', 'XOF', 'UGX', 'TZS', 'EGP', 'BRL']
