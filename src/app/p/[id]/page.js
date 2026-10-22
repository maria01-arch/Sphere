import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientRedirect from '@/components/ClientRedirect'
import { getPostPreview, previewMetadata } from '@/lib/preview'

export async function generateMetadata({ params }) {
  const { id } = await params
  const p = await getPostPreview(id)
  if (!p) return { title: 'Post not found — Flitters' }
  return previewMetadata(p)
}

export default async function PostPermalink({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not signed in (this includes the WhatsApp/Telegram preview robot): answer
  // with this page's preview tags, then send real people to sign in.
  if (!user) return <ClientRedirect to={'/auth?next=' + encodeURIComponent('/?openpost=' + id)} />

  const { data: post } = await supabase.from('posts').select('id').eq('id', id).maybeSingle()

  if (!post) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,fontFamily:'sans-serif'}}>
      <p style={{fontSize:20,fontWeight:700}}>Post not found</p>
      <p style={{color:'#555'}}>It may have been deleted.</p>
      <a href="/" style={{color:'#5B9CF6',fontSize:15}}>← Back to Flitters</a>
    </div>
  )

  redirect('/?openpost=' + id)
}
