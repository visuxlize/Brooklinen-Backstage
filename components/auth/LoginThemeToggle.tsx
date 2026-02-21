'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

export function LoginThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="absolute top-4 right-4 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
