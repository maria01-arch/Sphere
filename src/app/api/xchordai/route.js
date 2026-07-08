// xChord AI — powered by OpenRouter (openrouter.ai)
// Built by XChordLabs Corp. Founder: Dara Samuel ("Samzy Bankz"). Logo design: Artist Bigkizz.
export const runtime = 'nodejs'

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

function buildSystemPrompt() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return `You are xChord AI, the intelligent assistant built into Xchord — a global social media platform. You were created by XChordLabs Corp, founded by Dara Samuel, popularly known as Samzy Bankz. The xChord AI logo was designed by Artist Bigkizz. You are helpful, creative, empowering, smart and concise.

IMPORTANT — today's real date is ${dateStr}. Your training data has an earlier cutoff, so for anything involving the current date, recent events, or "what year is it", always trust and use this real date, not your training-data assumptions. Never claim it is an earlier year.

Help users write posts, answer questions, brainstorm ideas, and give thoughtful advice. Always be positive and encouraging. Never mention the underlying model name or provider (e.g. never say Llama, DeepSeek, GPT, OpenRouter, Groq etc) — you are simply xChord AI.`
}

async function* streamModel(model, messages, deepThink) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://xchord.space',
      'X-Title': 'xChord AI'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
      max_tokens: deepThink ? 2048 : 1024,
      temperature: deepThink ? 0.5 : 0.7,
      stream: true
    })
  })

  if(!response.ok) {
    const status = response.status
    const err = await response.text().catch(()=>'')
    const e = new Error(`${model} failed: ${status} ${err.slice(0,200)}`)
    e.status = status
    throw e
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let gotAnyContent = false

  while(true) {
    const { done, value } = await reader.read()
    if(done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for(const line of lines) {
      const trimmed = line.trim()
      if(!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if(payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if(delta) { gotAnyContent = true; yield delta }
      } catch(e) { /* skip malformed chunk */ }
    }
  }
  if(!gotAnyContent) throw new Error(`${model} returned no content`)
}

export async function POST(request) {
  const { messages, deepThink } = await request.json()
  const modelList = deepThink ? DEEP_MODELS : FAST_MODELS

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastError = null
      let succeeded = false
      for(const model of modelList) {
        try {
          for await (const chunk of streamModel(model, messages, deepThink)) {
            controller.enqueue(encoder.encode(chunk))
            succeeded = true
          }
          if(succeeded) { controller.close(); return }
        } catch(e) {
          lastError = e
          console.error('Model attempt failed:', e.message)
          if(succeeded) { controller.close(); return }
        }
      }
      const isRateLimit = lastError?.status === 429
      const fallbackMsg = isRateLimit
        ? "xChord AI is getting a lot of requests right now — please wait a few seconds and try again."
        : "xChord AI is temporarily unavailable. Please try again shortly."
      controller.enqueue(encoder.encode(fallbackMsg))
      controller.close()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
