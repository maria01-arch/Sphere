import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientRedirect from '@/components/ClientRedirect'
import { getProfilePreview, previewMetadata } from '@/lib/preview'

export async function generateMetadata({ params }) {
  const { username } = await params
  const p = await getProfilePreview(username)
  return previewMetadata(p, 'Profile not found — Flitters')
}

export default async function ProfileLink({ params }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const p = await getProfilePreview(username)

  if (!user) return <ClientRedirect to={'/auth?next=' + encodeURIComponent('/u/' + username)} />
  redirect(p?.id ? '/?openuser=' + p.id : '/')
}
