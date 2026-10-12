export async function GET() {
  return new Response('google-site-verification: google9121a928a1ad5106.html', {
    headers: { 'Content-Type': 'text/html' }
  })
}
