import './globals.css'
export const metadata = { title: 'Sphere', description: 'Connect Globally' }
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content'
}
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>
}
