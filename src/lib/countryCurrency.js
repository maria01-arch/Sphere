// Country (2-letter code) -> currency. Anything not listed falls back to USD.
const EUR = ['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK','MC','SM','VA','AD','ME','XK']
const XOF = ['BJ','BF','CI','GW','ML','NE','SN','TG']
const XAF = ['CM','CF','TD','CG','GQ','GA']
const MAP = {
  NG:'NGN', US:'USD', GB:'GBP', GH:'GHS', KE:'KES', ZA:'ZAR', CA:'CAD', AU:'AUD', NZ:'NZD', IN:'INR', AE:'AED', SA:'SAR', QA:'QAR', KW:'KWD',
  EG:'EGP', MA:'MAD', DZ:'DZD', TN:'TND', UG:'UGX', TZ:'TZS', RW:'RWF', ET:'ETB', ZM:'ZMW', ZW:'USD', BW:'BWP', NA:'NAD', MZ:'MZN', AO:'AOA',
  SL:'SLE', LR:'LRD', GM:'GMD', MW:'MWK', CD:'CDF', BR:'BRL', MX:'MXN', AR:'ARS', CL:'CLP', CO:'COP', PE:'PEN', JP:'JPY', CN:'CNY', KR:'KRW',
  HK:'HKD', SG:'SGD', MY:'MYR', ID:'IDR', TH:'THB', VN:'VND', PH:'PHP', PK:'PKR', BD:'BDT', LK:'LKR', NP:'NPR', TR:'TRY', IL:'ILS', RU:'RUB',
  UA:'UAH', PL:'PLN', CZ:'CZK', HU:'HUF', RO:'RON', BG:'BGN', SE:'SEK', NO:'NOK', DK:'DKK', CH:'CHF', IS:'ISK', JM:'JMD', TT:'TTD',
}
EUR.forEach(c => { MAP[c] = 'EUR' })
XOF.forEach(c => { MAP[c] = 'XOF' })
XAF.forEach(c => { MAP[c] = 'XAF' })
export const currencyForCountry = (cc) => MAP[(cc || '').toUpperCase()] || 'USD'
