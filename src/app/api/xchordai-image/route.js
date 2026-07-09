// xChord AI image generation — uses Hugging Face's Inference Providers (the
// current, supported routing layer as of 2026; the old api-inference.huggingface.co
// REST endpoints are deprecated for most image models). Falls back to OpenRouter
// if HuggingFace is unavailable.
import { InferenceClient } from '@huggingface/inference'

export const runtime = 'nodejs'

// General-purpose, safe image models only.
// Each entry pins the provider that actually hosts it, since 'auto' routing
// can fail to find a free/available provider even when the model itself works.
const HF_MODELS = [
  { model: 'RudySen/Krea2-realism-V1', provider: 'fal-ai' },
  { model: 'black-forest-labs/FLUX.1-schnell', provider: 'auto' },
  { model: 'stabilityai/stable-diffusion-xl-base-1.0', provider: 'auto' }
]

async function tryHuggingFace(prompt) {
  const client = new InferenceClient(process.env.HF_TOKEN)
  let lastError = null
  for (const { model, provider } of HF_MODELS) {
    try {
      const blob = await client.textToImage({
        model,
        inputs: prompt + ', high quality, detailed, 4k',
        provider
      })
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mime = blob.type || 'image/jpeg'
      return `data:${mime};base64,${base64}`
    } catch (e) {
      lastError = e
      console.error(`${model} (${provider}) failed:`, e.message)
    }
  }
  throw lastError || new Error('All HuggingFace models failed')
}

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

export async function POST(request) {
  try {
    const { prompt } = await request.json()
    if(!prompt?.trim()) return Response.json({ error: 'No prompt provided' }, { status: 400 })

    let hfError = null
    try {
      const image = await tryHuggingFace(prompt)
      return Response.json({ image })
    } catch(e) {
      hfError = e.message
      console.error('HuggingFace image gen failed, falling back to OpenRouter:', e.message)
    }

    let orError = null
    try {
      const image = await tryOpenRouterImage(prompt)
      return Response.json({ image })
    } catch(e) {
      orError = e.message
      console.error('OpenRouter image gen also failed:', e.message)
    }

    // Surface real error detail so failures are diagnosable instead of a
    // generic message every time.
    return Response.json({
      error: `Image generation is temporarily unavailable. (${hfError || 'HF failed'} / ${orError || 'OR failed'})`
    }, { status: 503 })
  } catch(e) {
    console.error('Image route error:', e)
    return Response.json({ error: 'Something went wrong generating the image: ' + e.message }, { status: 500 })
  }
}
