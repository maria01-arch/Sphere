'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Shared rules for every video in the feed:
//  - only ONE video plays at a time (the one most recently scrolled into view or tapped)
//  - mute is global: once you unmute one video the next ones play with sound too
//  - Settings > Autoplay videos turns scroll-autoplay off (videos then wait for a tap)
const AUTOPLAY_KEY = 'flitters_autoplay'
let muted = true
let autoplay = true
try { autoplay = localStorage.getItem(AUTOPLAY_KEY) !== 'off' } catch {}
let version = 0
const listeners = new Set()
const notify = () => { version++; listeners.forEach(f => f()) }
const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }

const pausers = new Map()   // id -> pause function
let activeId = null
const claim = (id) => {
  if (activeId && activeId !== id) pausers.get(activeId)?.()
  activeId = id
}
const release = (id) => { if (activeId === id) activeId = null }

export function setVideoMuted(v) { muted = v; notify() }
export function setAutoplay(v) {
  autoplay = v
  try { localStorage.setItem(AUTOPLAY_KEY, v ? 'on' : 'off') } catch {}
  notify()
}
export function useVideoPrefs() {
  useSyncExternalStore(subscribe, () => version, () => 0)
  return { muted, autoplay, setMuted: setVideoMuted, setAutoplay }
}

let nextId = 1
// Attach to a <video> (videoRef) inside a wrapper (wrapRef).
export function useExclusiveVideo(videoRef, wrapRef, dep) {
  const idRef = useRef(null)
  if (idRef.current === null) idRef.current = 'v' + nextId++
  const { muted: m, autoplay: a } = useVideoPrefs()
  const visible = useRef(false)
  const [, force] = useState(0)

  // global mute follows into this element
  useEffect(() => { if (videoRef.current) videoRef.current.muted = m }, [m, videoRef, dep])

  useEffect(() => {
    const id = idRef.current
    const wrap = wrapRef.current
    const tryPlay = () => {
      const v = videoRef.current
      if (!v) return
      claim(id)
      v.muted = muted
      const p = v.play?.()
      if (p?.catch) p.catch(() => {
        // browser refused sound without a tap: play muted instead of not at all
        if (!v.muted) return
        v.muted = true; v.play?.().catch(() => {})
      })
    }
    pausers.set(id, () => videoRef.current?.pause?.())
    let io
    if (wrap && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => {
        const v = videoRef.current
        const on = e.isIntersecting && e.intersectionRatio >= 0.6
        visible.current = on
        if (on && autoplay) tryPlay()
        else if (!on) { v?.pause?.(); release(id) }
      }, { threshold: [0, 0.6, 1] })
      io.observe(wrap)
    }
    // tapping play yourself also takes over from whatever else was playing
    const v = videoRef.current
    const onPlay = () => claim(id)
    v?.addEventListener('play', onPlay)
    return () => { io?.disconnect(); v?.removeEventListener('play', onPlay); pausers.delete(id); release(id) }
  }, [a, dep, videoRef, wrapRef])
  return { muted: m, autoplay: a, force }
}
