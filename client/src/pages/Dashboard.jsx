// client/src/pages/Dashboard.jsx
// Home page — real-time node list + farm health summary.

import React, { useEffect, useState } from 'react'
import { useNavigate }                 from 'react-router-dom'
import { signOut }                     from 'firebase/auth'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db }                    from '../firebase.js'
import { useAuth }                     from '../context/AuthContext.jsx'
import ThemeToggle                     from '../components/ThemeToggle.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isOnline(device) {
  if (!device.updatedAt) return false
  const last = device.updatedAt.toDate?.() ?? new Date(device.updatedAt)
  return (Date.now() - last.getTime()) < 30 * 60 * 1000
}
function batteryPct(mv) {
  if (mv == null) return null
  return Math.min(100, Math.max(0, Math.round((mv - 3000) / 1200 * 100)))
}
function average(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v))
  if (!valid.length) return null
  return (valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1)
}
function batteryColor(pct) {
  if (pct == null) return 'var(--color-text-dim)'
  if (pct < 20) return 'var(--color-danger)'
  if (pct < 40) return 'var(--color-warning)'
  return 'var(--color-primary)'
}
function moistureColor(v) {
  if (v == null) return 'var(--color-text-dim)'
  if (v < 30 || v > 80) return 'var(--color-danger)'
  if (v < 45 || v > 70) return 'var(--color-warning)'
  return 'var(--color-primary)'
}
function phColor(v) {
  if (v == null) return 'var(--color-text-dim)'
  if (v < 5.5 || v > 7.5) return 'var(--color-danger)'
  if (v < 6.0 || v > 7.0) return 'var(--color-warning)'
  return 'var(--color-primary)'
}

// ── Node Card ─────────────────────────────────────────────────────────────────
function NodeCard({ device, onClick }) {
  const online = isOnline(device)
  const pct    = batteryPct(device.lastReading?.batteryMv)
  return (
    <div className="card-interactive" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>
            {device.label || device.deviceId}
          </p>
          {device.crop && (
            <p className="text-sm text-muted" style={{ marginTop: '2px' }}>🌿 {device.crop}</p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <span className={`badge ${online ? 'badge-online' : 'badge-offline'}`}>
            <span className={`dot ${online ? 'dot-online' : 'dot-offline'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
          {pct != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: 'var(--font-xs)', color: batteryColor(pct), fontWeight: 700 }}>
                {pct}%
              </span>
              <div style={{ width: '36px', height: '5px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: batteryColor(pct), borderRadius: '3px' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-dim" style={{ marginTop: '0.75rem' }}>Tap for readings &rsaquo;</p>
    </div>
  )
}

// ── Health Metric ─────────────────────────────────────────────────────────────
function HealthMetric({ label, value, unit, color, status }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--color-surface-alt)',
      border: '1px solid var(--color-border-soft)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
    }}>
      <p className="text-xs text-muted" style={{ marginBottom: '0.3rem' }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, color: color || 'var(--color-text)', lineHeight: 1 }}>
        {value != null ? `${value}${unit}` : '—'}
      </p>
      {status && <p style={{ fontSize: 'var(--font-xs)', color, marginTop: '4px', fontWeight: 600 }}>{status}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function Dashboard() {
  const { currentUser }       = useAuth()
  const navigate              = useNavigate()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'devices'), where('owner', '==', currentUser.uid))
    const unsub = onSnapshot(q, (snap) => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })
    return unsub
  }, [currentUser])

  const avgMoisture = average(devices.map(d => d.lastReading?.moisture))
  const avgPH       = average(devices.map(d => d.lastReading?.ph))
  const onlineCount = devices.filter(isOnline).length

  const moistureStatus = avgMoisture == null ? null
    : avgMoisture < 30 ? '⚠ Too dry' : avgMoisture > 80 ? '⚠ Too wet' : '✓ Good'
  const phStatus = avgPH == null ? null
    : (avgPH < 5.5 || avgPH > 7.5) ? '⚠ Out of range' : '✓ Good'

  return (
    <div className="page">
      {/* ── Header ── */}
      <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          {/* AgroSense gradient logo */}
          <p className="logo-gradient" style={{ fontSize: 'var(--font-sm)', fontWeight: 700, letterSpacing: '0.05em' }}>
            🌱 AGROSENSE
          </p>
          <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginTop: '2px' }}>
            {currentUser?.displayName?.split(' ')[0] || 'Farmer'} <span className="text-muted" style={{ fontSize: 'var(--font-lg)', fontWeight: 400 }}>👋</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ThemeToggle />
          <button id="sign-out-btn" className="btn btn-ghost btn-sm" onClick={() => signOut(auth).then(() => navigate('/'))}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Node list ── */}
      <p className="section-title">Sensor Nodes</p>
      {loading ? (
        <div className="flex items-center gap-3" style={{ padding: 'var(--space-4) 0' }}>
          <div className="spinner" />
          <span className="text-sm text-muted">Loading nodes…</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="card text-center" style={{ padding: 'var(--space-8) var(--space-4)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📡</p>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No nodes linked yet</p>
          <p className="text-sm text-muted">Add your first ESP32 sensor node to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {devices.map(device => (
            <NodeCard
              key={device.id}
              device={device}
              onClick={() => navigate(`/node/${device.deviceId || device.id}`)}
            />
          ))}
        </div>
      )}

      <button
        id="manage-nodes-btn"
        className="btn btn-ghost w-full"
        style={{ marginTop: 'var(--space-4)' }}
        onClick={() => navigate('/link-device')}
      >
        ＋ Manage Nodes
      </button>

      <div className="divider" />

      {/* ── Farm Health ── */}
      <p className="section-title">Farm Health Summary</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <HealthMetric label="Avg Soil Moisture" value={avgMoisture} unit="%" color={moistureColor(avgMoisture)} status={moistureStatus} />
        <HealthMetric label="Avg Soil pH"        value={avgPH}       unit="" color={phColor(avgPH)}            status={phStatus} />
      </div>

      {devices.length > 0 && (
        <div className="card-sm flex items-center justify-between">
          <span className="text-sm text-muted">Nodes online</span>
          <span style={{ fontWeight: 700 }}>
            <span className="text-primary">{onlineCount}</span>
            <span className="text-muted"> / {devices.length}</span>
          </span>
        </div>
      )}
    </div>
  )
}

export default Dashboard
