// Triggered when someone tags @flittersai in a post or a comment. Reuses the
// same OpenRouter backend as the Flitters AI DM chat, but replies as a
// regular comment on the post instead of a private message.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const MODELS = [
  'poolside/laguna-m.1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openrouter/free'
]

const SYSTEM_PROMPT = `You are Flitters AI, replying as a public comment on a Flitters social media post — not a private chat. Someone tagged you with @flittersai. Read the post (and the comment that tagged you, if there is one) and respond helpfully: answer their question, summarize the post if asked, or offer a relevant suggestion. Keep it natural and concise (2-4 sentences unless the question genuinely needs more). Never mention the underlying AI model or provider — you are simply Flitters AI.`

export async function POST(req) {
  const supabase = await createClient()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { postId, postContent: rawPostContent, mentionText: rawMentionText, mentionCommentId } = await req.json()
  if (!postId) return Response.json({ error: 'Missing postId' }, { status: 400 })
  const postContent = (rawPostContent || '').slice(0, 2000)
  const mentionText = (rawMentionText || '').slice(0, 1000)

  const userPrompt = mentionCommentId
    ? `Post content: "${postContent || '(no text, image only)'}"\n\nA user commented and tagged you: "${mentionText}"\n\nReply as a comment.`
    : `A user tagged you in their own post. Post content: "${postContent || '(no text, image only)'}"\n\nReply as a comment reacting to or engaging with what they posted.`

  let replyText = null
  let lastErr = null
  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://xchord.space',
          'X-Title': 'Flitters AI'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        })
      })
      if (!res.ok) throw new Error(`${model} failed: ${res.status}`)
      const json = await res.json()
      replyText = json.choices?.[0]?.message?.content?.trim()
      if (replyText) break
    } catch (err) { lastErr = err; continue }
  }

  if (!replyText) return Response.json({ error: 'AI did not respond: ' + (lastErr?.message || 'unknown error') }, { status: 502 })

  // Service-role client needed here — RLS only allows inserting a comment as
  // yourself, but this comment needs to be authored by the AI account.
  const admin = createAdminClient()
  const { data: comment, error: insertErr } = await admin.from('comments').insert({
    post_id: postId,
    user_id: 'omnicore-ai',
    content: replyText,
    reply_to_comment_id: mentionCommentId || null,
  }).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })

  const { data: post } = await admin.from('posts').select('user_id').eq('id', postId).maybeSingle()
  if (post?.user_id && post.user_id !== user.id) {
    await admin.from('notifications').insert({ user_id: post.user_id, actor_id: 'omnicore-ai', type: 'comment', post_id: postId })
  }

  return Response.json({ comment })
}
