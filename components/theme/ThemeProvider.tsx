'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getThemeFromDOM(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
} | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = stored ?? (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', initial === 'dark')
    setThemeState(initial)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [mounted, theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  const value = mounted ? theme : getThemeFromDOM()

  return (
    <ThemeContext.Provider value={{ theme: value, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
