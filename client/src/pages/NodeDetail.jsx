// client/src/pages/NodeDetail.jsx
// Real-time sensor readings, irrigation controls for a single ESP32 node.
// Route: /node/:deviceId

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { doc, onSnapshot }             from 'firebase/firestore'
import { db }                          from '../firebase.js'
import api                             from '../api/axiosInstance.js'
import ThemeToggle                     from '../components/ThemeToggle.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(timestamp) {
  if (!timestamp) return 'Never'
  const date    = timestamp.toDate?.() ?? new Date(timestamp)
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1)  return 'Just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} ago`
}
function batteryPct(mv) {
  if (mv == null) return null
  return Math.min(100, Math.max(0, Math.round((mv - 3000) / 1200 * 100)))
}
function batteryColor(pct) {
  if (pct == null) return 'var(--color-text-dim)'
  if (pct < 20) return 'var(--color-danger)'
  if (pct < 40) return 'var(--color-warning)'
  return 'var(--color-primary)'
}
function isOnline(device) {
  if (!device?.updatedAt) return false
  const last = device.updatedAt.toDate?.() ?? new Date(device.updatedAt)
  return (Date.now() - last.getTime()) < 30 * 60 * 1000
}

// ── Signal Bars ───────────────────────────────────────────────────────────────
function SignalBars({ rssi }) {
  if (rssi == null) return <span className="text-xs text-dim">No signal data</span>
  const level = rssi > -70 ? 4 : rssi > -85 ? 3 : rssi > -100 ? 2 : 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
      {[8, 12, 16, 20].map((h, i) => (
        <div key={i} style={{
          width: '5px', height: `${h}px`, borderRadius: '2px',
          background: i < level ? 'var(--color-primary)' : 'var(--color-border)',
          boxShadow: i < level ? '0 0 4px var(--color-primary-glow)' : 'none',
          transition: 'background 0.3s',
        }} />
      ))}
      <span className="text-xs text-muted" style={{ marginLeft: '6px' }}>{rssi} dBm</span>
    </div>
  )
}

// ── Sensor Card ───────────────────────────────────────────────────────────────
function SensorCard({ icon, label, value, unit, color, alert, span }) {
  return (
    <div
      className="sensor-card"
      style={{
        gridColumn: span ? '1 / -1' : undefined,
        borderColor: alert ? 'rgba(255,82,82,0.3)' : undefined,
        boxShadow: color
          ? `var(--shadow-sm), inset 0 1px 0 ${color}18`
          : undefined,
      }}
    >
      <span className="sensor-card__icon">{icon}</span>
      <span className="sensor-card__label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span className="sensor-card__value" style={{ color: color || 'var(--color-text)' }}>
          {value != null ? value : '—'}
        </span>
        {value != null && unit && (
          <span className="sensor-card__unit">{unit}</span>
        )}
      </div>
      {alert && (
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-danger)', marginTop: '2px', fontWeight: 600 }}>
          {alert}
        </span>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function NodeDetail() {
  const { deviceId }            = useParams()
  const navigate                = useNavigate()
  const [device, setDevice]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [cmdLoading, setCmdLoading] = useState(false)
  const [cmdMsg, setCmdMsg]     = useState('')

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'devices', deviceId),
      snap => { setDevice(snap.exists() ? { id: snap.id, ...snap.data() } : null); setLoading(false) },
      err  => { console.error(err); setLoading(false) }
    )
    return unsub
  }, [deviceId])

  async function sendCommand(action, payload = {}) {
    setCmdLoading(true); setCmdMsg('')
    try {
      await api.post('/api/command', { deviceId, action, payload })
      const labels = { irrigate: `💧 Irrigating for ${payload.durationSeconds}s`, stop: '⏹ Stop command sent', read: '📡 Reading requested' }
      setCmdMsg(labels[action] || `✅ "${action}" sent`)
    } catch { setCmdMsg('❌ Failed. Check connection.') }
    finally { setCmdLoading(false); setTimeout(() => setCmdMsg(''), 4000) }
  }

  if (loading) return <div className="page-centered"><div className="spinner" /></div>

  if (!device) return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      <div className="card text-center" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-8)' }}>
        <p style={{ fontSize: '2rem' }}>📡</p>
        <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>Device not found</p>
        <p className="text-sm text-muted">{deviceId}</p>
      </div>
    </div>
  )

  const reading = device.lastReading
  const online  = isOnline(device)
  const pct     = batteryPct(reading?.batteryMv)

  const moistureAlert = reading?.moisture != null
    ? reading.moisture < 25 ? 'Critically dry!' : reading.moisture > 85 ? 'Waterlogged!' : null
    : null
  const phAlert = reading?.ph != null
    ? (reading.ph < 5.0 || reading.ph > 8.0) ? 'Critical range!' : null
    : null

  return (
    <div className="page">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <button id="back-btn" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <ThemeToggle />
      </div>

      {/* ── Node identity ── */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>
              {device.label || deviceId}
            </h1>
            {device.crop && (
              <p className="text-sm text-muted" style={{ marginTop: '2px' }}>🌿 {device.crop}</p>
            )}
          </div>
          <span className={`badge ${online ? 'badge-online' : 'badge-offline'}`}>
            <span className={`dot ${online ? 'dot-online' : 'dot-offline'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p className="text-sm text-muted">
            🕐 Last updated:{' '}
            <strong style={{ color: 'var(--color-text)' }}>{timeAgo(device.updatedAt)}</strong>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="text-xs text-muted">Signal:</span>
            <SignalBars rssi={reading?.rssi} />
          </div>
        </div>
      </div>

      {/* ── Sensor grid ── */}
      <p className="section-title">Sensor Readings</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <SensorCard icon="💧" label="Soil Moisture"
          value={reading?.moisture != null ? reading.moisture.toFixed(1) : null}
          unit="%" color="var(--color-accent)" alert={moistureAlert} />
        <SensorCard icon="🌡️" label="Temperature"
          value={reading?.temperature != null ? reading.temperature.toFixed(1) : null}
          unit="°C" color="var(--color-warning)" />
        <SensorCard icon="🌫️" label="Humidity"
          value={reading?.humidity != null ? reading.humidity.toFixed(1) : null}
          unit="%" color="var(--color-accent)" />
        <SensorCard icon="🧪" label="Soil pH"
          value={reading?.ph != null ? reading.ph.toFixed(1) : null}
          color="var(--color-primary)" alert={phAlert} />
        <SensorCard icon="🌿" label="Nitrogen (N)"
          value={reading?.nitrogen != null ? Math.round(reading.nitrogen) : null}
          unit=" mg/kg" color="var(--color-primary)" />
        <SensorCard icon="🪨" label="Phosphorus (P)"
          value={reading?.phosphorus != null ? Math.round(reading.phosphorus) : null}
          unit=" mg/kg" color="var(--color-warning)" />
        <SensorCard icon="⚡" label="Potassium (K)"
          value={reading?.potassium != null ? Math.round(reading.potassium) : null}
          unit=" mg/kg" color="var(--color-accent)" span />
      </div>

      {/* ── Battery ── */}
      {pct != null && (
        <div className="card-sm" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
            <span className="text-sm text-muted">🔋 Battery</span>
            <span style={{ fontWeight: 700, color: batteryColor(pct) }}>{pct}%</span>
          </div>
          <div className="battery-bar">
            <div className="battery-bar__fill" style={{ width: `${pct}%`, background: batteryColor(pct) }} />
          </div>
          {reading?.batteryMv && (
            <p className="text-xs text-dim" style={{ marginTop: '0.25rem' }}>
              {(reading.batteryMv / 1000).toFixed(2)} V
            </p>
          )}
        </div>
      )}

      {/* ── Request reading ── */}
      <button id="request-reading-btn" className="btn btn-ghost w-full"
        style={{ marginBottom: 'var(--space-4)' }}
        onClick={() => sendCommand('read')} disabled={cmdLoading}>
        📡 Request Reading Now
      </button>

      <div className="divider" />

      {/* ── Irrigation ── */}
      <p className="section-title">Irrigation Control</p>
      <div className="card-sm" style={{ marginBottom: 'var(--space-4)' }}>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
          Start irrigation for a set duration or stop immediately.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
          {[30, 60, 120].map(s => (
            <button key={s} id={`irrigate-${s}s`}
              className="btn btn-primary btn-sm"
              onClick={() => sendCommand('irrigate', { durationSeconds: s })}
              disabled={cmdLoading}>{s}s</button>
          ))}
          <button id="stop-irrigation-btn" className="btn btn-danger btn-sm"
            onClick={() => sendCommand('stop')} disabled={cmdLoading}>Stop</button>
        </div>
        {cmdMsg && (
          <p className="text-sm" style={{
            marginTop: 'var(--space-3)',
            color: cmdMsg.startsWith('❌') ? 'var(--color-danger)' : 'var(--color-primary)',
          }}>{cmdMsg}</p>
        )}
      </div>

      {/* ── Analytics CTA ── */}
      <button id="analytics-btn" className="btn w-full"
        onClick={() => navigate(`/analytics/${deviceId}`)}
        style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'var(--color-primary-muted)' }}>
        📊 View Analytics &amp; AI Suggestions
      </button>
    </div>
  )
}

export default NodeDetail
