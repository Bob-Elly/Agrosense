// client/src/hooks/useTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook for light/dark mode.
// - Reads persisted preference from localStorage (defaults to 'system')
// - Automatically updates actual theme if preference is 'system'
// - Exposes { theme, setThemePreference, toggleTheme, isDark }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

const STORAGE_KEY    = 'agrosense_theme_preference'
const DEFAULT_THEME  = 'system'

export function useTheme() {
  const [themePreference, setThemePreferenceState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME }
    catch { return DEFAULT_THEME }
  })

  const getActualTheme = (pref) => {
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return pref
  }

  const [actualTheme, setActualTheme] = useState(() => getActualTheme(themePreference))

  // System theme listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (themePreference === 'system') {
        const nextActual = mediaQuery.matches ? 'dark' : 'light'
        setActualTheme(nextActual)
        document.documentElement.setAttribute('data-theme', nextActual)
      }
    }
    
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handleChange)
    else mediaQuery.addListener(handleChange)
    
    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', handleChange)
      else mediaQuery.removeListener(handleChange)
    }
  }, [themePreference])

  // Sync state via custom event and storage event
  useEffect(() => {
    const handleSync = () => {
      try { 
        const newPref = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
        setThemePreferenceState(newPref)
        const nextActual = getActualTheme(newPref)
        setActualTheme(nextActual)
        document.documentElement.setAttribute('data-theme', nextActual)
      } catch {}
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('agrosense_theme_changed', handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('agrosense_theme_changed', handleSync)
    }
  }, [])

  const setThemePreference = (pref) => {
    try { localStorage.setItem(STORAGE_KEY, pref) } catch {}
    setThemePreferenceState(pref)
    const nextActual = getActualTheme(pref)
    setActualTheme(nextActual)
    document.documentElement.setAttribute('data-theme', nextActual)
    window.dispatchEvent(new Event('agrosense_theme_changed'))
  }

  function toggleTheme() {
    setThemePreference(actualTheme === 'dark' ? 'light' : 'dark')
  }

  // Ensure DOM is updated on initial mount if this is the first hook
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme)
  }, [actualTheme])

  return { theme: themePreference, setThemePreference, toggleTheme, isDark: actualTheme === 'dark' }
}
