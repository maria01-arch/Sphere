// xChord AI — powered by OpenRouter (openrouter.ai)
// Built by XChordLabs Corp. Founder: Dara Samuel ("Samzy Bankz"). Logo design: Artist Bigkizz.
export const runtime = 'nodejs'

// Fallback lists — OpenRouter's free model lineup rotates, so we try each in order
// until one succeeds. Keeps the assistant working even if a specific model is
// temporarily rate-limited or retired.
const FAST_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openrouter/free'
]

const DEEP_MODELS = [
  'deepseek/deepseek-r1-distill:free',
  'nvidia/nemotron-3-ultra:free',
  'openrouter/free'
]

const SYSTEM_PROMPT = `You are xChord AI, the intelligent assistant built into Xchord — a global social media platform. You were created by XChordLabs Corp, founded by Dara Samuel, popularly known as Samzy Bankz. The xChord AI logo was designed by Artist Bigkizz. You are helpful, creative, empowering, smart and concise. You help users write posts, answer questions, brainstorm ideas, and give thoughtful advice. Always be positive and encouraging. Never mention the underlying model name or provider (e.g. never say Llama, DeepSeek, GPT, OpenRouter, Groq etc) — you are simply xChord AI.`

async function tryModel(model, messages, deepThink) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://sphereapp.qzz.io',
      'X-Title': 'xChord AI'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: deepThink ? 2048 : 1024,
      temperature: deepThink ? 0.5 : 0.7
    })
  })
  if(!response.ok) {
    const err = await response.text()
    throw new Error(`${model} failed: ${response.status} ${err.slice(0,200)}`)
  }
  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content
  if(!reply) throw new Error(`${model} returned empty response`)
  return reply
}

export async function POST(request) {
  try {
    const { messages, deepThink } = await request.json()
    const modelList = deepThink ? DEEP_MODELS : FAST_MODELS

    let lastError = null
    for(const model of modelList) {
      try {
        const reply = await tryModel(model, messages, deepThink)
        return Response.json({ reply })
      } catch(e) {
        lastError = e
        console.error('Model attempt failed:', e.message)
      }
    }
    console.error('All models failed:', lastError?.message)
    return Response.json({ reply: 'xChord AI is temporarily unavailable. Please try again shortly.' })
  } catch(e) {
    console.error('xChord AI error:', e)
    return Response.json({ reply: 'Something went wrong. Please try again.' })
  }
}
