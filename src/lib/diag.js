'use client'
// Small "something went wrong loading data" notes. They are shown by <DiagBanner/>
// (bottom of the screen) so a database/permission problem is visible and can be
// screenshotted, instead of just showing an empty list.
let last = null
const listeners = new Set()
export function diag(where, error) {
  if (!error) return
  const text = '[' + where + '] ' + (error.code ? error.code + ': ' : '') + (error.message || String(error))
  try { console.error(text, error) } catch {}
  last = { text, at: Date.now() }
  listeners.forEach(f => { try { f() } catch {} })
}
export const getDiag = () => last
export const clearDiag = () => { last = null; listeners.forEach(f => { try { f() } catch {} }) }
export const subscribeDiag = (f) => { listeners.add(f); return () => listeners.delete(f) }
