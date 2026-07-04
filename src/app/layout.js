import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Sphere — Connect Globally',
  description: 'Sphere is a social media platform to connect, share posts, reels, messages and more with people around the world.',
  keywords: 'Sphere, social media, connect, posts, reels, messages, OmniSphere',
  authors: [{ name: 'OmniSphere Labs' }],
  creator: 'OmniSphere Labs',
  publisher: 'OmniSphere Labs',
  metadataBase: new URL('https://sphereapp.qzz.io'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Sphere — Connect Globally',
    description: 'Join Sphere and connect with the world. Share posts, reels, send messages, join groups and more.',
    url: 'https://sphereapp.qzz.io',
    siteName: 'Sphere',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sphere Social Media' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sphere — Connect Globally',
    description: 'Join Sphere and connect with the world.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
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
