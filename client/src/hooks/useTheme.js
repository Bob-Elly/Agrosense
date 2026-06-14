// client/src/hooks/useTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook for light/dark mode.
// - Reads persisted preference from localStorage (defaults to 'dark')
// - Applies data-theme attribute to <html> for CSS variable switching
// - Exposes { theme, toggleTheme, isDark } to any component
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

const STORAGE_KEY    = 'agrosense_theme'
const DEFAULT_THEME  = 'dark'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Read persisted value synchronously on first render
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME }
    catch { return DEFAULT_THEME }
  })

  // Whenever theme changes, apply it to the document and persist it
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
