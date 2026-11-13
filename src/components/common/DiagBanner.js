'use client'
import { useEffect, useState } from 'react'
import { clearDiag, getDiag, subscribeDiag } from '@/lib/diag'

export function DiagBanner() {
  const [d, setD] = useState(null)
  useEffect(() => { setD(getDiag()); return subscribeDiag(() => setD(getDiag())) }, [])
  if (!d) return null
  return (
    <div onClick={clearDiag} style={{ position: 'fixed', left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', zIndex: 2147483000, background: '#7f1d1d', color: '#fff', fontSize: 12, lineHeight: 1.4, padding: '10px 12px', borderRadius: 10, fontFamily: 'monospace', wordBreak: 'break-word', cursor: 'pointer' }}>
      {d.text}<div style={{ opacity: 0.7, marginTop: 4 }}>tap to dismiss</div>
    </div>
  )
}
