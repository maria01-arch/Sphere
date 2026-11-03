'use client'
import { useEffect, useRef } from 'react'

// Sits at the bottom of the rendered feed slice; fires onReached once when it
// scrolls near the viewport, which is what grows visibleCount by 10. Keeps
// the feed from rendering everything at once (10 at a time), and reveals
// more automatically instead of needing a "Load more" tap.
export function FeedLoadMoreSentinel({ onReached }) {
  const ref = useRef(null)
  useEffect(()=>{
    const el = ref.current
    if(!el) return
    const obs = new IntersectionObserver((entries)=>{
      if(entries[0].isIntersecting) onReached()
    }, { rootMargin: '600px' }) // trigger a bit before it's actually on screen, so more posts are ready by the time you scroll to them
    obs.observe(el)
    return ()=>obs.disconnect()
  },[onReached])
  return <div ref={ref} style={{height:1}}/>
}
