/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Pages and API stay uncached, but Next's hashed files under /_next/static never change, so
        // they are allowed their normal long cache instead of re-downloading on every visit.
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
