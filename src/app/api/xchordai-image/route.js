// xChord AI image generation — tries OpenRouter first, falls back through
// multiple HuggingFace models since the free serverless inference API can
// rate-limit or "cold start" (503) after a couple of requests.
export const runtime = 'nodejs'

async function tryOpenRouterImage(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://xchord.space',
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
  return imageUrl
}

async function tryHuggingFaceModel(model, prompt, attempt=1) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt + ', high quality, detailed, 4k' })
    }
  )

  if(response.status === 503 && attempt <= 2) {
    // Model is cold-starting — HF tells us roughly how long to wait
    let waitMs = 4000
    try { const info = await response.clone().json(); if(info?.estimated_time) waitMs = Math.min(info.estimated_time*1000, 15000) } catch(e){}
    await new Promise(r=>setTimeout(r, waitMs))
    return tryHuggingFaceModel(model, prompt, attempt+1)
  }

  if(response.status === 429) { const e = new Error(`${model} rate limited`); e.rateLimited = true; throw e }
  if(!response.ok) throw new Error(`${model} failed: ${response.status}`)

  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return 'data:image/jpeg;base64,' + base64
}

const HF_MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'black-forest-labs/FLUX.1-schnell'
]

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

    let rateLimited = false
    for(const model of HF_MODELS) {
      try {
        const image = await tryHuggingFaceModel(model, prompt)
        return Response.json({ image })
      } catch(e) {
        if(e.rateLimited) rateLimited = true
        console.error(`${model} failed:`, e.message)
      }
    }

    const message = rateLimited
      ? "Image generation is busy right now — please wait a moment and try again."
      : "Image generation is temporarily unavailable. Please try again shortly."
    return Response.json({ error: message }, { status: 503 })
  } catch(e) {
    console.error('Image route error:', e)
    return Response.json({ error: 'Something went wrong generating the image.' }, { status: 500 })
  }
}
