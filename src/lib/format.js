
// ── VOICE NOTES (shared by DM + GroupChat) ──────────────────────────────────
// Tap-to-record rather than WhatsApp's press-and-hold-with-slide-to-cancel —
// that gesture needs careful drag-distance tracking to feel right and this
// is a wrapped WebView as much as a touch surface, so a plain tap to start /
// tap to stop (with an explicit cancel button) is the more reliable choice,
// same tradeoff Telegram Web and Instagram DM's web client make.
export function formatVoiceDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds||0))
  const m = Math.floor(s/60)
  const r = s%60
  return m+':'+String(r).padStart(2,'0')
}
