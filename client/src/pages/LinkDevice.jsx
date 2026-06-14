// client/src/pages/LinkDevice.jsx
// Add / manage ESP32 nodes with crop selector.

import React, { useState } from 'react'
import { useNavigate }     from 'react-router-dom'
import { doc, updateDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db }              from '../firebase.js'
import { useAuth }         from '../context/AuthContext.jsx'
import ThemeToggle         from '../components/ThemeToggle.jsx'

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

function LinkDevice() {
  const { currentUser }             = useAuth()
  const navigate                    = useNavigate()
  const [deviceId, setDeviceId]     = useState('')
  const [label, setLabel]           = useState('')
  const [crop, setCrop]             = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [loading, setLoading]       = useState(false)

  async function handleLink(e) {
    e.preventDefault(); setError(''); setSuccess('')
    const trimmedId = deviceId.trim()
    if (!trimmedId) return setError('Please enter a device ID.')
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { devices: arrayUnion(trimmedId) })
      await setDoc(doc(db, 'devices', trimmedId), {
        deviceId: trimmedId,
        label:    label.trim() || trimmedId,
        crop:     crop || null,
        owner:    currentUser.uid,
        linkedAt: serverTimestamp(),
        status:   'offline',
      }, { merge: true })
      setSuccess(`✅ "${label.trim() || trimmedId}" linked successfully!`)
      setDeviceId(''); setLabel(''); setCrop('')
    } catch (err) {
      console.error(err); setError('Failed to link device. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button id="back-from-link" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Manage Nodes</h1>
          <p className="text-xs text-muted">Add or update your ESP32 sensor nodes</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Add a New Node</p>
        <form onSubmit={handleLink} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="device-id">Device ID *</label>
            <input id="device-id" className="input" type="text"
              placeholder="e.g. esp32-node-01" value={deviceId}
              onChange={e => setDeviceId(e.target.value)} required autoCapitalize="none" />
            <p className="text-xs text-dim" style={{ marginTop: '0.3rem' }}>
              The unique ID programmed into your ESP32 firmware.
            </p>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="device-label">Friendly Name (optional)</label>
            <input id="device-label" className="input" type="text"
              placeholder="e.g. Field A – North Plot" value={label}
              onChange={e => setLabel(e.target.value)} />
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

          {error && <p className="error-message">{error}</p>}
          {success && (
            <p style={{ color: 'var(--color-primary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)', background: 'var(--color-primary-muted)',
              borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,230,118,0.2)' }}>
              {success}
            </p>
          )}

          <button id="link-device-submit" className="btn btn-primary w-full"
            type="submit" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
            {loading ? 'Linking…' : '＋ Link Device'}
          </button>
        </form>
      </div>

      <button id="go-to-dashboard" className="btn btn-ghost w-full"
        style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/dashboard')}>
        ← Go to Dashboard
      </button>
    </div>
  )
}

export default LinkDevice
