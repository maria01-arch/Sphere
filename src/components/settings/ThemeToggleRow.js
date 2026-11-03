'use client'
import { Settings } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function ThemeToggleRow() {
  const { theme, setTheme, isManual, useSystemTheme } = useTheme()
  const opt = (id, icon, label) => {
    const active = id === 'system' ? !isManual : (isManual && theme === id)
    return (
      <button
        onClick={() => id === 'system' ? useSystemTheme() : setTheme(id)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
          border: active ? '1.5px solid #A855F7' : '1px solid var(--border-color-2)',
          background: active ? 'rgba(168,85,247,0.1)' : 'var(--bg-card)',
          color: active ? '#A855F7' : 'var(--text-tertiary)',
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      </button>
    )
  }
  return (
    <div style={{ padding: '4px 20px 18px', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>Appearance</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {opt('light', '☀️', 'Light')}
        {opt('dark', '🌙', 'Dark')}
        {opt('system', <Settings size={18}/>, 'System')}
      </div>
    </div>
  )
}
