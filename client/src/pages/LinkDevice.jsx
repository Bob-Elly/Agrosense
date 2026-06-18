// client/src/pages/LinkDevice.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Manage Nodes page.
//   • Lists all linked nodes in real-time (onSnapshot)
//   • Each node has [Edit] and [🗑 Remove] buttons
//   • Edit opens EditNodeModal → updateDoc → instant dashboard update
//   • Remove opens ConfirmDialog → deleteDoc + arrayRemove
//   • Add New Node form at the bottom
//   • Success/error feedback via Toast component
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import { useNavigate }                 from 'react-router-dom'
import {
  doc, setDoc, deleteDoc,
  updateDoc, arrayUnion, arrayRemove,
  collection, query, where, onSnapshot,
  serverTimestamp, addDoc
}                                      from 'firebase/firestore'
import { db }                          from '../firebase.js'
import { useAuth }                     from '../context/AuthContext.jsx'
import ThemeToggle                     from '../components/ThemeToggle.jsx'
import ConfirmDialog                   from '../components/ConfirmDialog.jsx'
import EditNodeModal                   from '../components/EditNodeModal.jsx'
import Toast                           from '../components/Toast.jsx'

// ── Crop options ──────────────────────────────────────────────────────────────
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

// ── Online helper ─────────────────────────────────────────────────────────────
function isOnline(device) {
  if (!device?.updatedAt) return false
  const last = device.updatedAt.toDate?.() ?? new Date(device.updatedAt)
  return (Date.now() - last.getTime()) < 30 * 60 * 1000
}

// ── Small action button ───────────────────────────────────────────────────────
function ActionBtn({ id, onClick, color, bg, border, hoverBg, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        flexShrink:   0,
        background:   hovered ? hoverBg : bg,
        border:       `1px solid ${border}`,
        borderRadius: 'var(--radius-sm)',
        color,
        fontSize:     'var(--font-xs)',
        fontWeight:   600,
        padding:      '0.35rem 0.65rem',
        cursor:       'pointer',
        transition:   'background var(--transition)',
        whiteSpace:   'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════
function LinkDevice() {
  const { currentUser }           = useAuth()
  const navigate                  = useNavigate()

  // ── Existing nodes ────────────────────────────────────────────────────────
  const [devices, setDevices]         = useState([])
  const [nodesLoading, setNodesLoading] = useState(true)

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editDevice, setEditDevice]   = useState(null)   // device obj or null

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [targetDevice, setTargetDevice]   = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)   // { message, type } or null

  // ── Add node form ─────────────────────────────────────────────────────────
  const [deviceId, setDeviceId]     = useState('')
  const [label, setLabel]           = useState('')
  const [crop, setCrop]             = useState('')
  const [addError, setAddError]     = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // ── Real-time listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'devices'),
      where('owner', '==', currentUser.uid)
    )
    const unsub = onSnapshot(
      q,
      snap => { setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setNodesLoading(false) },
      err  => { console.error(err); setNodesLoading(false) }
    )
    return unsub
  }, [currentUser])

  // ── Edit handlers ─────────────────────────────────────────────────────────
  function openEdit(device) {
    setEditDevice(device)
  }

  function handleSaved(message) {
    setEditDevice(null)
    setToast({ message, type: 'success' })
  }

  // ── Delete handlers ───────────────────────────────────────────────────────
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
      await deleteDoc(doc(db, 'devices', id))
      await updateDoc(doc(db, 'users', currentUser.uid), { devices: arrayRemove(id) })
      
      // Emit Notification
      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        title: 'Node Removed',
        message: `Device ${targetDevice.label || id} was unlinked from your account.`,
        type: 'info',
        read: false,
        timestamp: new Date()
      })

      setConfirmOpen(false)
      setTargetDevice(null)
      setToast({ message: 'Node removed successfully.', type: 'success' })
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleteError('Failed to remove node. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Add node handler ──────────────────────────────────────────────────────
  async function handleLink(e) {
    e.preventDefault()
    setAddError('')
    const trimmedId = deviceId.trim()
    if (!trimmedId) return setAddError('Please enter a device ID.')
    setAddLoading(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { devices: arrayUnion(trimmedId) })
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

      // Emit Notification (In-App)
      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        title: 'Node Linked',
        message: `Device ${label.trim() || trimmedId} was successfully added to your account.`,
        type: 'success',
        read: false,
        timestamp: new Date()
      })

      // Dispatch Email Notification via backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      fetch(`${apiUrl}/api/notifications/node-linked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: currentUser.email, 
          deviceId: trimmedId, 
          label: label.trim() 
        })
      }).catch(err => console.error('Failed to dispatch email:', err))

      setToast({ message: `"${label.trim() || trimmedId}" linked successfully!`, type: 'success' })
      setDeviceId(''); setLabel(''); setCrop('')
    } catch (err) {
      console.error(err)
      setAddError('Failed to link device. Please try again.')
    } finally {
      setAddLoading(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button id="back-from-link" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Manage Nodes</h1>
          <p className="text-xs text-muted">Add, edit, or remove your ESP32 sensor nodes</p>
        </div>
        <ThemeToggle />
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          EXISTING NODES LIST
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
                  boxShadow:    'var(--shadow-card)',
                }}
              >
                {/* Top row: dot + name + buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {/* Status dot */}
                  <span className={`dot ${online ? 'dot-online' : 'dot-offline'}`} style={{ flexShrink: 0 }} />

                  {/* Node info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--font-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {device.label || id}
                    </p>
                    <p className="text-xs text-dim" style={{ marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {id}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                    {/* Edit */}
                    <ActionBtn
                      id={`edit-node-${id}`}
                      onClick={() => openEdit(device)}
                      color="var(--color-primary)"
                      bg="var(--color-primary-muted)"
                      border="rgba(0, 230, 118, 0.25)"
                      hoverBg="rgba(0, 230, 118, 0.18)"
                    >
                      ✏️ Edit
                    </ActionBtn>
                    {/* Remove */}
                    <ActionBtn
                      id={`remove-node-${id}`}
                      onClick={() => promptDelete(device)}
                      color="var(--color-danger)"
                      bg="var(--color-danger-muted)"
                      border="rgba(255,82,82,0.25)"
                      hoverBg="rgba(255,82,82,0.18)"
                    >
                      🗑 Remove
                    </ActionBtn>
                  </div>
                </div>

                {/* Meta row: crop + SIM */}
                {(device.crop || device.simNumber) && (
                  <div style={{
                    marginTop:    'var(--space-3)',
                    paddingTop:   'var(--space-2)',
                    borderTop:    '1px solid var(--color-border-soft)',
                    display:      'flex',
                    gap:          'var(--space-4)',
                    flexWrap:     'wrap',
                  }}>
                    {device.crop && (
                      <span className="text-xs text-muted">🌿 {device.crop}</span>
                    )}
                    {device.simNumber && (
                      <span className="text-xs text-muted">📱 {device.simNumber}</span>
                    )}
                  </div>
                )}
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
              placeholder="e.g. A4:CF:12:7B:3E:9D"
              value={deviceId} onChange={e => setDeviceId(e.target.value)}
              required autoCapitalize="none" />
            <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
              This is the MAC address of your ESP32 node.
            </p>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="device-label">Nickname (optional)</label>
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
          </div>

          {addError && <p className="error-message">{addError}</p>}

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

      {/* ── Modals & notifications ── */}

      {/* Edit node modal */}
      {editDevice && (
        <EditNodeModal
          device={editDevice}
          onClose={() => setEditDevice(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Remove Node?"
        message={
          targetDevice
            ? `"${targetDevice.label || targetDevice.deviceId || targetDevice.id}" will be unlinked. Historical sensor data in Firestore will also be removed.`
            : ''
        }
        confirmLabel={deleteLoading ? 'Removing…' : 'Remove Node'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmOpen(false); setTargetDevice(null) }}
      />

      {/* Success / error toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default LinkDevice
