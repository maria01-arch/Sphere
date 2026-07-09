'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'xchord-theme'

export function useTheme() {
  const [theme, setThemeState] = useState('dark')
  const [isManual, setIsManual] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark'
    setThemeState(current)
    setIsManual(!!localStorage.getItem(STORAGE_KEY))

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onSystemChange = (e) => {
      // Only auto-follow system changes if the person hasn't manually chosen a theme
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = e.matches ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        setThemeState(next)
      }
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  const setTheme = useCallback((next) => {
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
    setIsManual(true)
  }, [])

  const useSystemTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const next = mq.matches ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setThemeState(next)
    setIsManual(false)
  }, [])

  return { theme, setTheme, isManual, useSystemTheme }
}
