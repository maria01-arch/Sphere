'use client'
import { useEffect, useRef } from 'react'

// Same API as a plain <video> tag (pass muted, autoPlay, loop, playsInline,
// onClick, style, className, etc. straight through) — it just also knows
// how to play Cloudflare Stream's .m3u8 manifests. Safari plays HLS
// natively; everywhere else loads hls.js on demand. Non-HLS URLs (plain
// .mp4/.webm, e.g. old Supabase-hosted clips still in the DB) just get set
// as src directly, so this is safe to use everywhere a reel/video plays.
export default function HlsVideo({ src, videoRef: externalRef, ...props }) {
  const internalRef = useRef(null)
  const videoRef = externalRef || internalRef

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (!src.includes('.m3u8')) {
      video.src = src
      return
    }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      return
    }

    let hls
    let cancelled = false
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return
      if (Hls.isSupported()) {
        hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(video)
      } else {
        video.src = src
      }
    })
    return () => { cancelled = true; hls?.destroy() }
  }, [src, videoRef])

  return <video ref={videoRef} {...props} />
}
