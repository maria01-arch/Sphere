'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SphereApp from '@/components/SphereApp'

export default function Home() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#090B10',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#555'}}>Loading Sphere...</p>
    </div>
  )
  return <SphereApp currentUser={profile}/>
}
