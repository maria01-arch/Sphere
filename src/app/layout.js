import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Xchord — Connect Globally',
  description: 'Xchord is a social media platform to connect, share posts, reels, messages and more with people around the world.',
  keywords: 'Xchord, social media, Xchord app, formerly Sphere, connect, posts, reels, messages',
  authors: [{ name: 'XChordLabs Corp' }],
  creator: 'XChordLabs Corp',
  publisher: 'XChordLabs Corp',
  metadataBase: new URL('https://xchord.space'),
  alternates: { canonical: '/' },
  verification: { google: '9XDPLjOPGXpC-aBASXvGyCogIS3P1jrATwQw0PXL8ZA' },
  openGraph: {
    title: 'Xchord — Connect Globally',
    description: 'Join Xchord and connect with the world. Share posts, reels, send messages, join groups and more.',
    url: 'https://xchord.space',
    siteName: 'Xchord',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Xchord Social Media' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xchord — Connect Globally',
    description: 'Join Xchord and connect with the world.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/xchord-logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var saved = localStorage.getItem('xchord-theme');
              var theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
              document.documentElement.setAttribute('data-theme', theme);
            }catch(e){}})();`
          }}
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1625129471311969"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
          strategy="afterInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({ appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''}" });
              });`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
