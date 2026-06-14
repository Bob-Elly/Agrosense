// client/src/components/Toast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight animated toast notification.
// Auto-dismisses after `duration` ms (default 3 s).
// Can also be dismissed by clicking.
//
// Usage:
//   const [toast, setToast] = useState(null)
//   setToast({ message: '✓ Saved!', type: 'success' })
//   {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react'

function Toast({ message, type = 'success', duration = 3000, onDismiss }) {
  // Auto-dismiss after `duration` ms
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  const isSuccess = type === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      style={{
        position:     'fixed',
        bottom:       '1.75rem',
        left:         '50%',
        transform:    'translateX(-50%)',
        zIndex:       2000,
        background:   isSuccess ? 'var(--color-primary)' : 'var(--color-danger)',
        color:        isSuccess ? '#021a0a' : '#fff',
        padding:      '0.65rem 1.375rem',
        borderRadius: 'var(--radius-full)',
        fontWeight:   700,
        fontSize:     'var(--font-sm)',
        boxShadow:    isSuccess
          ? '0 4px 24px rgba(0, 230, 118, 0.35), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 4px 24px rgba(255, 82, 82, 0.35), 0 2px 8px rgba(0,0,0,0.3)',
        animation:    'toastIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        whiteSpace:   'nowrap',
        display:      'flex',
        alignItems:   'center',
        gap:          '0.5rem',
        cursor:       'pointer',
        userSelect:   'none',
        maxWidth:     'calc(100vw - 2rem)',
        textOverflow: 'ellipsis',
        overflow:     'hidden',
      }}
    >
      <span style={{ fontSize: '1rem' }}>
        {isSuccess ? '✓' : '✕'}
      </span>
      {message}
    </div>
  )
}

export default Toast
