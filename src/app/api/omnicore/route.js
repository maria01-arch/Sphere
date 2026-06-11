export async function POST(request) {
  const { messages } = await request.json()
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [
        {
          role: 'system',
          content: `You are OmniCore AI, the intelligent assistant built into Sphere — a social media platform by OmniSphereLabs LLC. You are helpful, friendly, and concise. You can help users write posts, answer questions, give advice, and more. Always be positive and encouraging. Never mention that you are built on Groq or LLaMA — you are OmniCore AI by OmniSphereLabs.`
        },
        ...messages
      ],
      max_tokens: 1024,
      temperature: 0.7
    })
  })

  const data = await response.json()
  return Response.json({ reply: data.choices?.[0]?.message?.content || 'OmniCore is thinking...' })
}
