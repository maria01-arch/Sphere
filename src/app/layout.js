import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Xchord — Connect Globally',
  description: 'Xchord is a social media platform to connect, share posts, reels, messages and more with people around the world.',
  keywords: 'Xchord, social media, Xchord app, formerly Sphere,, connect, posts, reels, messages, OmniSphere',
  authors: [{ name: 'Xchord Labs' }],
  creator: 'Xchord Labs',
  publisher: 'Xchord Labs',
  metadataBase: new URL('https://sphereapp.qzz.io'),
  alternates: { canonical: '/' },
  verification: { google: '9XDPLjOPGXpC-aBASXvGyCogIS3P1jrATwQw0PXL8ZA' },
  openGraph: {
    title: 'Xchord — Connect Globally',
    description: 'Join Sphere and connect with the world. Share posts, reels, send messages, join groups and more.',
    url: 'https://sphereapp.qzz.io',
    siteName: 'Xchord',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sphere Social Media' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xchord — Connect Globally',
    description: 'Join Sphere and connect with the world.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [{ url: '/xchord-logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/xchord-logo.svg', type: 'image/svg+xml' }],
    shortcut: ['/xchord-logo.svg'],
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
