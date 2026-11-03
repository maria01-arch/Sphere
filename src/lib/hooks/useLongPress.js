import { useRef } from 'react'

// Long-press to do something extra (here: expand an image) without hijacking
// the plain tap, which keeps doing whatever it already did (opening the
// post). didFire() lets the click handler that follows a touch/mouse-up know
// whether the long-press already handled this interaction, so it can bail
// out instead of also firing.
export function useLongPress(onLongPress, delay=500) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)
  const start = () => {
    firedRef.current = false
    timerRef.current = setTimeout(()=>{ firedRef.current = true; onLongPress() }, delay)
  }
  const clear = () => clearTimeout(timerRef.current)
  return {
    onTouchStart:start, onTouchEnd:clear, onTouchMove:clear,
    onMouseDown:start, onMouseUp:clear, onMouseLeave:clear,
    didFire: () => firedRef.current
  }
}
