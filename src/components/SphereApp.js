'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const COLORS = ['#FF6B35','#00C9A7','#845EF7','#F7B731','#FF4757','#5B9CF6','#A29BFE','#FD79A8']
const getColor = (id) => COLORS[(id?.charCodeAt(0)||0) % COLORS.length]

function timeAgo(ts) {
  if (!ts) return ''
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

function Avatar({ url, name='', color='#5B9CF6', size=42, online=false }) {
  const i = (name||'?').trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??'
  return (
    <div style={{position:'relative',flexShrink:0,display:'inline-block'}}>
      {url
        ? <img src={url} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',boxShadow:`0 0 0 2px #090B10`}}/>
        : <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${color}88,${color})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.36,fontWeight:800,color:'#fff',boxShadow:`0 0 0 2px #090B10`}}>{i}</div>
      }
      {online&&<div style={{position:'absolute',bottom:1,right:1,width:size*0.27,height:size*0.27,borderRadius:'50%',background:'#00C9A7',border:'2px solid #090B10'}}/>}
    </div>
  )
}

// ... [All other code remains the same] ...

// FIXED saveProfile function
function SettingsView({ currentUser, supabase, onBack, onSignOut, onAvatarUpdate }) {
  // ... all your existing state and functions ...

  const saveProfile = async () => {
    setSaving(true);

    // Block emojis in display name
    const emojiRegex = /\p{Emoji}/u;
    if (emojiRegex.test(displayName)) {
      showMsg('Emojis are not allowed in display names', false);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        display_name: displayName, 
        bio, 
        location 
      })
      .eq('id', currentUser.id);

    if (error) {
      showMsg(error.message, false);
    } else {
      currentUser.display_name = displayName;
      currentUser.bio = bio;
      currentUser.location = location;
      showMsg('Profile saved!');
    }

    setSaving(false);
  };

  // ... rest of your SettingsView function ...
}

// Note: This is a partial file for demonstration. Please use the replacement method for the full file.
print("File created at /home/workdir/fixed_SphereApp.js")
