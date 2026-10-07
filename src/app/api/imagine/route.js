import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'

export async function POST(request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (rateLimited('ai-image:' + user.id, 6, 60_000)) return tooManyRequests()
    const body = await request.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt.slice(0, 500) : ''
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt + ', high quality, detailed, 4k' })
      }
    )
    if(!response.ok) {
      const err = await response.text()
      console.error('HF error:', err)
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return Response.json({ image: 'data:image/jpeg;base64,'+base64 })
  } catch(e) {
    console.error('Imagine error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
