// client/src/pages/LinkDevice.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Manage Nodes page.
//   • Top section  — list of existing nodes with a Remove button on each
//   • Bottom section — form to add a new node (device ID, label, crop)
//
// Deleting a node:
//   1. Removes the device document from Firestore "devices" collection
//   2. Removes the device ID from the user's "users/{uid}/devices" array
//   3. The Dashboard's onSnapshot listener picks up the change in real-time
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import { useNavigate }                 from 'react-router-dom'
import {
  doc, setDoc, deleteDoc,
  updateDoc, arrayUnion, arrayRemove,
  collection, query, where, onSnapshot,
  serverTimestamp,
}                                      from 'firebase/firestore'
import { db }                          from '../firebase.js'
import { useAuth }                     from '../context/AuthContext.jsx'
import ThemeToggle                     from '../components/ThemeToggle.jsx'
import ConfirmDialog                   from '../components/ConfirmDialog.jsx'

// ── Crop options ──────────────────────────────────────────────────────────────
const CROPS = [
  { label: 'Cocoa Yam',        id: 'cocoa_yam' },
  { label: 'Yam',              id: 'yam' },
  { label: 'Sweet Potatoes',   id: 'sweet_potatoes' },
  { label: 'Cow Peas (Beans)', id: 'cow_peas_beans' },
  { label: 'Cassava',          id: 'cassava' },
  { label: 'Maize',            id: 'maize' },
  { label: 'Groundnuts',       id: 'groundnuts' },
  { label: 'Rice',             id: 'rice' },
]

// ── Online helper ─────────────────────────────────────────────────────────────
function isOnline(device) {
  if (!device?.updatedAt) return false
  const last = device.updatedAt.toDate?.() ?? new Date(device.updatedAt)
  return (Date.now() - last.getTime()) < 30 * 60 * 1000
}

function LinkDevice() {
  const { currentUser }           = useAuth()
  const navigate                  = useNavigate()

  // ── Existing nodes ────────────────────────────────────────────────────────
  const [devices, setDevices]     = useState([])
  const [nodesLoading, setNodesLoading] = useState(true)

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [targetDevice, setTargetDevice] = useState(null)   // { deviceId, label }
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  // ── Add node form ─────────────────────────────────────────────────────────
  const [deviceId, setDeviceId]   = useState('')
  const [label, setLabel]         = useState('')
  const [crop, setCrop]           = useState('')
  const [addError, setAddError]   = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // ── Real-time listener for this user's devices ────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'devices'),
      where('owner', '==', currentUser.uid)
    )
    const unsub = onSnapshot(q, snap => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setNodesLoading(false)
    }, err => { console.error(err); setNodesLoading(false) })
    return unsub
  }, [currentUser])

  // ── Delete node ───────────────────────────────────────────────────────────
  function promptDelete(device) {
    setTargetDevice(device)
    setDeleteError('')
    setConfirmOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!targetDevice) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const id = targetDevice.deviceId || targetDevice.id

      // 1. Delete the device document
      await deleteDoc(doc(db, 'devices', id))

      // 2. Remove from the user's devices array
      await updateDoc(doc(db, 'users', currentUser.uid), {
        devices: arrayRemove(id),
      })

      setConfirmOpen(false)
      setTargetDevice(null)
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleteError('Failed to remove node. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Add new node ──────────────────────────────────────────────────────────
  async function handleLink(e) {
    e.preventDefault()
    setAddError(''); setAddSuccess('')
    const trimmedId = deviceId.trim()
    if (!trimmedId) return setAddError('Please enter a device ID.')
    setAddLoading(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        devices: arrayUnion(trimmedId),
      })
      await setDoc(
        doc(db, 'devices', trimmedId),
        {
          deviceId: trimmedId,
          label:    label.trim() || trimmedId,
          crop:     crop || null,
          owner:    currentUser.uid,
          linkedAt: serverTimestamp(),
          status:   'offline',
        },
        { merge: true }
      )
      setAddSuccess(`✅ "${label.trim() || trimmedId}" linked successfully!`)
      setDeviceId(''); setLabel(''); setCrop('')
    } catch (err) {
      console.error(err); setAddError('Failed to link device. Please try again.')
    } finally { setAddLoading(false) }
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button id="back-from-link" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Manage Nodes</h1>
          <p className="text-xs text-muted">Add or remove your ESP32 sensor nodes</p>
        </div>
        <ThemeToggle />
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          EXISTING NODES
         ══════════════════════════════════════════════════════════════════ */}
      <p className="section-title">Linked Nodes</p>

      {nodesLoading ? (
        <div className="flex items-center gap-3" style={{ padding: 'var(--space-4) 0', marginBottom: 'var(--space-4)' }}>
          <div className="spinner" />
          <span className="text-sm text-muted">Loading nodes…</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="card-sm text-center" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📡</p>
          <p className="text-sm text-muted">No nodes linked yet. Add one below.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {devices.map(device => {
            const online = isOnline(device)
            const id     = device.deviceId || device.id
            return (
              <div
                key={device.id}
                style={{
                  background:   'var(--color-surface-card)',
                  border:       '1px solid var(--color-border)',
                  borderLeft:   '3px solid var(--color-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding:      'var(--space-4)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          'var(--space-3)',
                  boxShadow:    'var(--shadow-card)',
                }}
              >
                {/* Status dot */}
                <span className={`dot ${online ? 'dot-online' : 'dot-offline'}`}
                  style={{ flexShrink: 0 }} />

                {/* Node info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--font-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {device.label || id}
                  </p>
                  <p className="text-xs text-dim" style={{ marginTop: '2px' }}>
                    {id}
                    {device.crop ? <> &middot; 🌿 {device.crop}</> : null}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  id={`remove-node-${id}`}
                  onClick={() => promptDelete(device)}
                  title="Remove this node"
                  style={{
                    flexShrink:   0,
                    background:   'var(--color-danger-muted)',
                    border:       '1px solid rgba(255,82,82,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    color:        'var(--color-danger)',
                    fontSize:     'var(--font-xs)',
                    fontWeight:   600,
                    padding:      '0.35rem 0.65rem',
                    cursor:       'pointer',
                    transition:   'background var(--transition)',
                    whiteSpace:   'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,82,82,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger-muted)'}
                >
                  🗑 Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      {deleteError && (
        <p className="error-message" style={{ marginBottom: 'var(--space-3)' }}>{deleteError}</p>
      )}

      <div className="divider" />

      {/* ══════════════════════════════════════════════════════════════════════
          ADD NEW NODE
         ══════════════════════════════════════════════════════════════════ */}
      <p className="section-title">Add a New Node</p>
      <div className="card">
        <form onSubmit={handleLink} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="device-id">Device ID *</label>
            <input id="device-id" className="input" type="text"
              placeholder="e.g. esp32-node-01"
              value={deviceId} onChange={e => setDeviceId(e.target.value)}
              required autoCapitalize="none" />
            <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
              The unique ID programmed into your ESP32 firmware.
            </p>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="device-label">Friendly Name (optional)</label>
            <input id="device-label" className="input" type="text"
              placeholder="e.g. Field A – North Plot"
              value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="device-crop">Crop (optional)</label>
            <div style={{ position: 'relative' }}>
              <select id="device-crop" className="select" value={crop} onChange={e => setCrop(e.target.value)}>
                <option value="">— Select a crop —</option>
                {CROPS.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>▼</span>
            </div>
            <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
              Used to calibrate AI crop suggestions.
            </p>
          </div>

          {addError   && <p className="error-message">{addError}</p>}
          {addSuccess && (
            <p style={{
              color: 'var(--color-primary)', fontSize: 'var(--font-sm)',
              marginBottom: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(0,230,118,0.2)',
            }}>{addSuccess}</p>
          )}

          <button id="link-device-submit" className="btn btn-primary w-full"
            type="submit" disabled={addLoading} style={{ marginTop: 'var(--space-2)' }}>
            {addLoading ? 'Linking…' : '＋ Link Device'}
          </button>
        </form>
      </div>

      <button id="go-to-dashboard" className="btn btn-ghost w-full"
        style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/dashboard')}>
        ← Go to Dashboard
      </button>

      {/* ── Delete confirmation dialog ── */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Remove Node?"
        message={
          targetDevice
            ? `"${targetDevice.label || targetDevice.deviceId || targetDevice.id}" will be unlinked from your account. Historical data in Firestore will also be removed.`
            : ''
        }
        confirmLabel={deleteLoading ? 'Removing…' : 'Remove Node'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmOpen(false); setTargetDevice(null) }}
      />
    </div>
  )
}

export default LinkDevice
