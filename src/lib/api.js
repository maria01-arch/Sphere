import { createClient } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase/instance'

// Detects an @flittersai mention and, if found, asks the AI to reply as a
// comment on the post — used after both posting and commenting, since you
// can tag it either way.
// Headers for API routes that require sign-in. Sends the Bearer token so it
// works inside the Android WebView wrapper too, where cookies can be flaky.
export async function authJsonHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data: { session } } = await createClient().auth.getSession()
    if (session?.access_token) headers.Authorization = 'Bearer ' + session.access_token
  } catch {}
  return headers
}

export const AI_MENTION_RE = /@flittersai\b/i

export async function triggerAiMentionReply({ postId, postContent, mentionText, mentionCommentId }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    const res = await fetch('/api/flittersai/mention-reply', {
      method: 'POST',
      headers,
      body: JSON.stringify({ postId, postContent, mentionText, mentionCommentId }),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(()=>({}))
      // Temporary: surfaced directly since this can't be reproduced/tested
      // from outside the app — remove once confirmed working reliably.
      alert('AI mention failed (' + res.status + '): ' + (errJson.error || 'unknown error'))
    }
  } catch (err) {
    alert('AI mention request failed to send: ' + err.message)
  }
}
