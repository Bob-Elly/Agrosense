// client/src/components/ConfirmDialog.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable modal confirmation dialog.
// Renders a blurred overlay with a card asking the user to confirm a
// destructive action. Returns null when not open so there's no DOM cost.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'

/**
 * @param {boolean}  isOpen    — whether the dialog is visible
 * @param {string}   title     — bold heading text
 * @param {string}   message   — descriptive sub-text
 * @param {string}   confirmLabel — text for the danger button (default "Delete")
 * @param {Function} onConfirm — called when the user clicks confirm
 * @param {Function} onCancel  — called when the user clicks cancel or backdrop
 */
function ConfirmDialog({ isOpen, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    // Backdrop
    <div
      onClick={onCancel}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        background:     'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1rem',
        animation:      'fadeIn 0.15s ease',
      }}
    >
      {/* Dialog card — stop click from bubbling to backdrop */}
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  '320px',
          width:     '100%',
          animation: 'slideUp 0.18s ease',
        }}
      >
        {/* Warning icon */}
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>⚠️</div>

        <p style={{ fontWeight: 700, fontSize: 'var(--font-lg)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {title}
        </p>

        {message && (
          <p className="text-sm text-muted" style={{ marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.6 }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            id="confirm-cancel-btn"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
