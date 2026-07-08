// xChord AI image generation — tries OpenRouter's image-capable models first
// (note: most image-output models on OpenRouter are paid, not free-tier, so this
// gracefully falls back to the existing HuggingFace path if OpenRouter can't deliver).
export const runtime = 'nodejs'

async function tryOpenRouterImage(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://sphereapp.qzz.io',
      'X-Title': 'xChord AI'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: prompt + ', high quality, detailed' }],
      modalities: ['image', 'text']
    })
  })
  if(!response.ok) throw new Error('OpenRouter image failed: ' + response.status)
  const data = await response.json()
  const imgField = data.choices?.[0]?.message?.images?.[0]
  const imageUrl = imgField?.image_url?.url || imgField
  if(!imageUrl || typeof imageUrl !== 'string') throw new Error('No image in OpenRouter response')
  return imageUrl // already a data: URL
}

async function tryHuggingFace(prompt) {
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
  if(!response.ok) throw new Error('HuggingFace failed: ' + response.status)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return 'data:image/jpeg;base64,' + base64
}

export async function POST(request) {
  try {
    const { prompt } = await request.json()
    if(!prompt?.trim()) return Response.json({ error: 'No prompt provided' }, { status: 400 })

    try {
      const image = await tryOpenRouterImage(prompt)
      return Response.json({ image })
    } catch(e) {
      console.error('OpenRouter image gen failed, falling back to HuggingFace:', e.message)
    }

    try {
      const image = await tryHuggingFace(prompt)
      return Response.json({ image })
    } catch(e) {
      console.error('HuggingFace image gen also failed:', e.message)
    }

    return Response.json({ error: 'Image generation is temporarily unavailable' }, { status: 500 })
  } catch(e) {
    console.error('Imagine route error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
