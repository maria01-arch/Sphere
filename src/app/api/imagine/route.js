export async function POST(request) {
  try {
    const { prompt } = await request.json()
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
