import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Flitters — Connect Globally',
  description: 'Flitters is a social media platform to connect, share posts, reels, messages and more with people around the world.',
  keywords: 'Flitters, social media, Flitters app, formerly Sphere, connect, posts, reels, messages',
  authors: [{ name: 'Flitters Labs Corp' }],
  creator: 'Flitters Labs Corp',
  publisher: 'Flitters Labs Corp',
  metadataBase: new URL('https://flitters.app'),
  alternates: { canonical: '/' },
  verification: { google: '9XDPLjOPGXpC-aBASXvGyCogIS3P1jrATwQw0PXL8ZA' },
  openGraph: {
    title: 'Flitters — Connect Globally',
    description: 'Join Flitters and connect with the world. Share posts, reels, send messages, join groups and more.',
    url: 'https://flitters.app',
    siteName: 'Flitters',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Flitters Social Media' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flitters — Connect Globally',
    description: 'Join Flitters and connect with the world.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/flitters-logo.svg', type: 'image/svg+xml' },
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
              var saved = localStorage.getItem('flitters-theme');
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
      </head>
      <body>{children}</body>
    </html>
  )
}
