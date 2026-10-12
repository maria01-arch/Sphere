'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'flitters-theme'
// Every component calling useTheme() previously had its own independent
// state — switching the theme in Settings correctly updated the shared DOM
// attribute (which is why pure-CSS-var styling switched instantly), but any
// OTHER component's own copy of this hook's local state never got notified,
// so anything reading `theme` directly in JS (like the header logo's filter)
// stayed stale until a full page refresh remounted it. This listener set
// fixes that: every mounted instance is notified the moment any one of them
// changes the theme.
const listeners = new Set()
function notifyAll(next) {
  listeners.forEach(fn => fn(next))
}

export function useTheme() {
  const [theme, setThemeState] = useState('dark')
  const [isManual, setIsManual] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark'
    setThemeState(current)
    setIsManual(!!localStorage.getItem(STORAGE_KEY))
    listeners.add(setThemeState)

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = (e) => {
      // Only auto-follow system changes if the person hasn't manually chosen a theme
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = e.matches ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        setThemeState(next)
        notifyAll(next)
      }
    }
    mq.addEventListener('change', onSystemChange)
    return () => { mq.removeEventListener('change', onSystemChange); listeners.delete(setThemeState) }
  }, [])

  const setTheme = useCallback((next) => {
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
    setIsManual(true)
    notifyAll(next)
  }, [])

  const useSystemTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const next = mq.matches ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setThemeState(next)
    setIsManual(false)
    notifyAll(next)
  }, [])

  return { theme, setTheme, isManual, useSystemTheme }
}
