// client/src/components/ThemeToggle.jsx
// Sun/moon toggle button that appears in every page header.

import React from 'react'
import { useTheme } from '../hooks/useTheme.js'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-full)',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1rem',
        flexShrink: 0,
        transition: 'background var(--transition), border-color var(--transition)',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}

export default ThemeToggle
