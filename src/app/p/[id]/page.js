import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('posts').select('content,image_url,author:profiles(display_name,username)').eq('id', id).maybeSingle()
  if (!post) return { title: 'Post not found — Flitters' }
  const name = post.author?.display_name || 'Someone'
  const desc = (post.content || 'shared a post').slice(0, 150)
  return {
    title: `${name} on Flitters`,
    description: desc,
    openGraph: {
      title: `${name} on Flitters`,
      description: desc,
      images: post.image_url ? [post.image_url] : undefined,
    },
  }
}

export default async function PostPermalink({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=' + encodeURIComponent('/?openpost=' + id))

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
