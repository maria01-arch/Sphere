export async function POST(request) {
  try {
    const { messages } = await request.json()

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are OmniCore AI, the intelligent assistant built into Sphere — a global social media platform by OmniSphereLabs LLC. You were created by OmniSphereLabs LLC, founded by Dara Samuel, popularly known as Samzy Bankz. You are helpful, friendly, smart and concise. You help users write posts, answer questions, give life advice, and more. Always be positive and encouraging. Never mention Groq or LLaMA — you are OmniCore AI by OmniSphereLabs.`
          },
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if(!response.ok) {
      const err = await response.text()
      console.error('Groq error:', err)
      return Response.json({ reply: 'OmniCore is temporarily unavailable. Please try again shortly.' })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content
    if(!reply) return Response.json({ reply: 'I could not generate a response. Please try again.' })
    return Response.json({ reply })
  } catch(e) {
    console.error('OmniCore error:', e)
    return Response.json({ reply: 'Something went wrong. Please try again.' })
  }
}
