// client/src/components/EditNodeModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal for editing an existing linked node.
// Editable: nickname, SIM number (phone-validated), crop selection.
// Read-only: Device ID (displayed but greyed out).
// On save: calls updateDoc on the Firestore device document.
// The Dashboard's real-time onSnapshot listener picks up the change instantly.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { doc, updateDoc }  from 'firebase/firestore'
import { db }              from '../firebase.js'

// ── Crop options (must match cropProfiles collection IDs) ─────────────────────
const CROPS = [
  { label: 'Cocoa Yam',              id: 'cocoa_yam' },
  { label: 'Yam',                    id: 'yam' },
  { label: 'Sweet Potatoes',         id: 'sweet_potatoes' },
  { label: 'Cow Peas (Beans)',        id: 'cow_peas_beans' },
  { label: 'Cassava',                id: 'cassava' },
  { label: 'Maize',                  id: 'maize' },
  { label: 'Groundnuts',             id: 'groundnuts' },
  { label: 'Rice (Lowland/Paddy)',   id: 'rice_lowland_paddy' },
  { label: 'Rice (Upland)',          id: 'rice_upland' },
]

// ── Phone number validation ───────────────────────────────────────────────────
// Accepts: optional +, then 7-15 digits (spaces, dashes, parens allowed).
function isValidPhone(raw) {
  const cleaned = raw.replace(/[\s\-()]/g, '')
  return /^\+?[\d]{7,15}$/.test(cleaned)
}

// ── Field styles ──────────────────────────────────────────────────────────────
const readOnlyStyle = {
  opacity: 0.45,
  cursor: 'not-allowed',
  background: 'var(--color-surface)',
  userSelect: 'all',      // still copyable
}

/**
 * @param {object}   device   — current device data from Firestore
 * @param {Function} onClose  — called when Cancel or backdrop is clicked
 * @param {Function} onSaved  — called after a successful save (show toast, etc.)
 */
function EditNodeModal({ device, onClose, onSaved }) {
  const deviceId = device.deviceId || device.id

  const [label,     setLabel]     = useState(device.label     || deviceId)
  const [simNumber, setSimNumber] = useState(device.simNumber || '')
  const [crop,      setCrop]      = useState(device.crop      || '')
  const [fieldError, setFieldError] = useState('')
  const [saving,    setSaving]    = useState(false)

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    if (!label.trim()) {
      setFieldError('Nickname cannot be empty.')
      return false
    }
    if (simNumber.trim() && !isValidPhone(simNumber)) {
      setFieldError('Enter a valid phone number (7–15 digits). Example: +233 24 000 0000')
      return false
    }
    setFieldError('')
    return true
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'devices', deviceId), {
        label:     label.trim(),
        simNumber: simNumber.trim() || null,
        crop:      crop || null,
      })
      onSaved(`"${label.trim()}" updated successfully!`)
    } catch (err) {
      console.error('Edit node error:', err)
      setFieldError('Failed to save. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        background:     'rgba(0, 0, 0, 0.70)',
        backdropFilter: 'blur(6px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1rem',
        animation:      'fadeIn 0.15s ease',
      }}
    >
      {/* Modal card */}
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  '400px',
          width:     '100%',
          maxHeight: '92dvh',
          overflowY: 'auto',
          animation: 'slideUp 0.18s ease',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display:        'flex',
            alignItems:     'flex-start',
            justifyContent: 'space-between',
            marginBottom:   'var(--space-5)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Edit Node</h2>
            <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
              Updating: <strong style={{ color: 'var(--color-text)' }}>{device.label || deviceId}</strong>
            </p>
          </div>
          {/* Close ✕ */}
          <button
            id="edit-modal-close"
            onClick={onClose}
            style={{
              background:   'var(--color-surface-alt)',
              border:       '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              width:        '30px',
              height:       '30px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              cursor:       'pointer',
              color:        'var(--color-text-muted)',
              fontSize:     '0.75rem',
              flexShrink:   0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Device ID (read-only) ── */}
        <div className="form-group">
          <label className="label">
            Device ID
            <span style={{
              marginLeft:    '0.5rem',
              fontSize:      'var(--font-xs)',
              color:         'var(--color-text-dim)',
              fontWeight:    500,
              background:    'var(--color-surface-alt)',
              padding:       '1px 6px',
              borderRadius:  'var(--radius-sm)',
              border:        '1px solid var(--color-border)',
            }}>
              🔒 read-only
            </span>
          </label>
          <input
            className="input"
            value={deviceId}
            readOnly
            tabIndex={-1}
            style={readOnlyStyle}
          />
          <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
            Device ID cannot be changed after linking.
          </p>
        </div>

        {/* ── Nickname ── */}
        <div className="form-group">
          <label className="label" htmlFor="edit-label">Nickname *</label>
          <input
            id="edit-label"
            className="input"
            type="text"
            placeholder="e.g. Field A – North Plot"
            value={label}
            onChange={e => { setLabel(e.target.value); setFieldError('') }}
            autoFocus
          />
        </div>

        {/* ── SIM Number ── */}
        <div className="form-group">
          <label className="label" htmlFor="edit-sim">SIM / Phone Number</label>
          <input
            id="edit-sim"
            className="input"
            type="tel"
            placeholder="+233 24 000 0000"
            value={simNumber}
            onChange={e => { setSimNumber(e.target.value); setFieldError('') }}
          />
          <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
            Optional. Used for SMS alerts. Include country code (e.g. +233 for Ghana).
          </p>
        </div>

        {/* ── Crop ── */}
        <div className="form-group">
          <label className="label" htmlFor="edit-crop">Crop</label>
          <div style={{ position: 'relative' }}>
            <select
              id="edit-crop"
              className="select"
              value={crop}
              onChange={e => setCrop(e.target.value)}
            >
              <option value="">— None selected —</option>
              {CROPS.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
            <span style={{
              position:      'absolute',
              right:         '0.875rem',
              top:           '50%',
              transform:     'translateY(-50%)',
              pointerEvents: 'none',
              color:         'var(--color-text-muted)',
              fontSize:      '0.7rem',
            }}>▼</span>
          </div>
          <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
            Changing the crop updates AI suggestion calibration immediately.
          </p>
        </div>

        {/* ── Error ── */}
        {fieldError && (
          <p className="error-message" style={{ marginBottom: 'var(--space-4)' }}>
            {fieldError}
          </p>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button
            id="edit-cancel-btn"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            id="edit-save-btn"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Saving…</>
              : '✓ Save Changes'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditNodeModal
