// client/src/pages/NodeDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Node Detail — real-time sensor readings, irrigation control, reading requests.
// Route: /node/:deviceId
//
// Reading request state machine:
//   idle → pending  (captures baseline updatedAt, waits for a NEWER updatedAt)
//          ↓ new reading arrives in existing device onSnapshot
//        idle  (toast: "Fresh readings received")
//          ↓ 5-min timeout fires (no new reading)
//        idle  (toast: "No response from device")
//          ↓ offline when tapped
//        idle  (toast: SMS queued)
//
// Irrigation state machine: (see COMMAND_TIMEOUT_MS block below)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate }             from 'react-router-dom'
import {
  doc, onSnapshot,
  collection, setDoc, updateDoc,
  serverTimestamp,
}                                             from 'firebase/firestore'
import { db }                                 from '../firebase.js'
import api                                    from '../api/axiosInstance.js'
import ThemeToggle                            from '../components/ThemeToggle.jsx'
import Toast                                  from '../components/Toast.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes for irrigation ack
const READ_TIMEOUT_MS    = 5 * 60 * 1000  // 5 minutes for reading response

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
function toDate(ts) {
  if (!ts) return null
  return ts.toDate?.() ?? new Date(ts)
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
  const last = toDate(device.updatedAt)
  return last && (Date.now() - last.getTime()) < 3 * 60 * 1000
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
          boxShadow:  i < level ? '0 0 4px var(--color-primary-glow)' : 'none',
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
    <div className="sensor-card" style={{
      gridColumn: span ? '1 / -1' : undefined,
      borderColor: alert ? 'rgba(255,82,82,0.3)' : undefined,
      boxShadow: color ? `var(--shadow-sm), inset 0 1px 0 ${color}18` : undefined,
    }}>
      <span className="sensor-card__icon">{icon}</span>
      <span className="sensor-card__label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span className="sensor-card__value" style={{ color: color || 'var(--color-text)' }}>
          {value != null ? value : '—'}
        </span>
        {value != null && unit && <span className="sensor-card__unit">{unit}</span>}
      </div>
      {alert && (
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-danger)', marginTop: '2px', fontWeight: 600 }}>
          {alert}
        </span>
      )}
    </div>
  )
}

// ── Irrigation Message Banner ─────────────────────────────────────────────────
function IrrigMessage({ msg }) {
  if (!msg) return null
  const palette = {
    success: { bg: 'var(--color-primary-muted)',  border: 'rgba(0,230,118,0.3)',   color: 'var(--color-primary)' },
    warning: { bg: 'var(--color-warning-muted)',  border: 'rgba(255,215,64,0.35)', color: 'var(--color-warning)' },
    error:   { bg: 'var(--color-danger-muted)',   border: 'rgba(255,82,82,0.3)',   color: 'var(--color-danger)'  },
    info:    { bg: 'var(--color-surface-alt)',     border: 'var(--color-border-soft)', color: 'var(--color-text-muted)' },
  }
  const s = palette[msg.type] || palette.info
  return (
    <div style={{
      marginTop: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-md)', background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 'var(--font-sm)', fontWeight: 500, lineHeight: 1.5,
      animation: 'fadeIn 0.2s ease',
    }}>
      {msg.text}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════
function NodeDetail() {
  const { deviceId }          = useParams()
  const navigate              = useNavigate()

  const [device,  setDevice]  = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)   // { message, type } | null

  // ── Reading request state ──────────────────────────────────────────────────
  // 'idle' | 'pending'
  const [readState, setReadState]     = useState('idle')
  const readPendingRef  = useRef(false)   // mirrors readState for use inside closures
  const readBaseTimeRef = useRef(null)    // updatedAt captured at button-press
  const readTimerRef    = useRef(null)    // 5-min timeout handle

  // ── Irrigation state machine ───────────────────────────────────────────────
  const [irrigState,  setIrrigState]  = useState('idle')
  const [irrigSecs,   setIrrigSecs]   = useState(null)
  const [irrigMsg,    setIrrigMsg]    = useState(null)
  const irrigUnsubRef  = useRef(null)
  const irrigTimerRef  = useRef(null)
  const irrigCmdDocRef = useRef(null)

  // ── Device real-time listener ──────────────────────────────────────────────
  // This single listener also detects fresh readings arriving after a request.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'devices', deviceId),
      (snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null
        setDevice(data)
        setLoading(false)

        // ── Reading detection ──────────────────────────────────────────────
        // If a read request is pending, check whether the incoming updatedAt
        // is strictly AFTER the baseline we captured at button-press time.
        if (readPendingRef.current && data?.updatedAt) {
          const newTime  = toDate(data.updatedAt)
          const baseTime = readBaseTimeRef.current

          if (newTime && baseTime && newTime > baseTime) {
            // ✅ Fresh reading confirmed
            clearTimeout(readTimerRef.current)
            readTimerRef.current   = null
            readPendingRef.current = false
            setReadState('idle')
            setToast({ message: '✓ Fresh readings received', type: 'success' })
          }
        }
      },
      (err) => { console.error(err); setLoading(false) }
    )
    return unsub
  }, [deviceId])

  // ── Global cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (readTimerRef.current)   clearTimeout(readTimerRef.current)
      if (irrigUnsubRef.current)  irrigUnsubRef.current()
      if (irrigTimerRef.current)  clearTimeout(irrigTimerRef.current)
    }
  }, [])

  // ── Cancel irrigation tracking (helper) ───────────────────────────────────
  function cancelIrrigTracking() {
    if (irrigUnsubRef.current) { irrigUnsubRef.current(); irrigUnsubRef.current = null }
    if (irrigTimerRef.current) { clearTimeout(irrigTimerRef.current); irrigTimerRef.current = null }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUEST READING NOW
  // ═══════════════════════════════════════════════════════════════════════════
  async function handleReadRequest() {
    if (readState === 'pending') return

    const online = isOnline(device)

    // ── OFFLINE PATH ──────────────────────────────────────────────────────
    if (!online) {
      setToast({ message: '📵 Node offline — request queued for SMS delivery', type: 'warning' })
      // Still fire the API call so the SMS fallback can queue it
      try { await api.post('/api/command', { deviceId, action: 'read' }) } catch {}
      return
    }

    // ── ONLINE PATH ──────────────────────────────────────────────────────
    // Capture the current updatedAt as baseline BEFORE changing any state.
    // We convert to a plain JS Date so it survives React re-renders without
    // being affected by Firestore Timestamp reference changes.
    const rawTs = device?.updatedAt
    readBaseTimeRef.current = rawTs ? toDate(rawTs) : new Date(0)
    readPendingRef.current  = true
    setReadState('pending')

    // Send the read command (best-effort — don't block the pending state)
    try { await api.post('/api/command', { deviceId, action: 'read' }) } catch {}

    // 5-minute timeout — if no new reading arrives, give up and inform user
    readTimerRef.current = setTimeout(() => {
      readPendingRef.current = false
      setReadState('idle')
      setToast({ message: '⏱ No response from device', type: 'warning' })
      readTimerRef.current = null
    }, READ_TIMEOUT_MS)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IRRIGATION CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  async function handleIrrigate(seconds) {
    if (irrigState === 'pending') return
    cancelIrrigTracking()
    setIrrigMsg(null)

    const online = isOnline(device)

    if (!online) {
      setIrrigMsg({ text: '📵 Node is offline — command queued for SMS delivery', type: 'warning' })
      try { await api.post('/api/command', { deviceId, action: 'irrigate', payload: { durationSeconds: seconds } }) } catch {}
      return
    }

    // Write command doc to Firestore first (so listener is set before server response)
    const cmdDocRef = doc(collection(db, 'commands', deviceId, 'queue'))
    irrigCmdDocRef.current = cmdDocRef
    const commandId = cmdDocRef.id

    try {
      await setDoc(cmdDocRef, {
        deviceId, action: 'irrigate', payload: { durationSeconds: seconds },
        status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
    } catch {
      setIrrigMsg({ text: '❌ Failed to queue command. Check connection.', type: 'error' })
      return
    }

    setIrrigState('pending')
    setIrrigSecs(seconds)
    setIrrigMsg({ text: `💧 Irrigation (${seconds}s) sent — waiting for device acknowledgement…`, type: 'info' })

    try {
      await api.post('/api/command', { deviceId, commandId, action: 'irrigate', payload: { durationSeconds: seconds } })
    } catch { /* device may poll Firestore directly */ }

    const unsub = onSnapshot(cmdDocRef, snap => {
      if (!snap.exists()) return
      const { status } = snap.data()
      if (status === 'acknowledged') {
        cancelIrrigTracking()
        setIrrigState('idle'); setIrrigSecs(null)
        setIrrigMsg({ text: `✓ Irrigation started — running for ${seconds}s`, type: 'success' })
        setTimeout(() => setIrrigMsg(null), 8000)
      } else if (status === 'failed') {
        cancelIrrigTracking()
        setIrrigState('idle'); setIrrigSecs(null)
        setIrrigMsg({ text: '❌ Device reported command failure.', type: 'error' })
      }
    })
    irrigUnsubRef.current = unsub

    irrigTimerRef.current = setTimeout(async () => {
      cancelIrrigTracking()
      try { await updateDoc(cmdDocRef, { status: 'timeout', updatedAt: new Date() }) } catch {}
      setIrrigState('idle'); setIrrigSecs(null)
      setIrrigMsg({ text: '⚠ Device unreachable — command may be delivered via SMS fallback', type: 'warning' })
    }, COMMAND_TIMEOUT_MS)
  }

  async function handleStop() {
    cancelIrrigTracking()
    if (irrigState === 'pending' && irrigCmdDocRef.current) {
      try { await updateDoc(irrigCmdDocRef.current, { status: 'cancelled', updatedAt: new Date() }) } catch {}
    }
    setIrrigState('idle'); setIrrigSecs(null)
    setIrrigMsg({ text: '⏹ Sending stop command…', type: 'info' })
    try {
      await api.post('/api/command', { deviceId, action: 'stop' })
      setIrrigMsg({ text: '⏹ Stop command sent', type: 'success' })
    } catch {
      setIrrigMsg({ text: '❌ Failed to send stop command', type: 'error' })
    }
    setTimeout(() => setIrrigMsg(null), 4000)
  }

  // ── Loading / not-found ────────────────────────────────────────────────────
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
    ? reading.moisture < 25 ? 'Critically dry!' : reading.moisture > 85 ? 'Waterlogged!' : null : null
  const phAlert = reading?.ph != null
    ? (reading.ph < 5.0 || reading.ph > 8.0) ? 'Critical range!' : null : null

  // ── Render ─────────────────────────────────────────────────────────────────
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
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{device.label || deviceId}</h1>
            {device.crop && <p className="text-sm text-muted" style={{ marginTop: '2px' }}>🌿 {device.crop}</p>}
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

      {/* ── Sensor readings grid ── */}
      <p className="section-title">Sensor Readings</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <SensorCard icon="💧" label="Soil Moisture"
          value={reading?.moisture != null ? reading.moisture.toFixed(1) : null}
          unit="%" color="var(--color-accent)" alert={moistureAlert} />
        <SensorCard icon="🌡️" label="Temperature"
          value={reading?.temperature != null ? reading.temperature.toFixed(1) : null}
          unit="°C" color="var(--color-warning)" />
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
          unit=" mg/kg" color="var(--color-accent)" />
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

      {/* ── Request Reading Now ── */}
      <button
        id="request-reading-btn"
        className="btn btn-ghost w-full"
        style={{ marginBottom: 'var(--space-4)' }}
        onClick={handleReadRequest}
        disabled={readState === 'pending'}
        title={readState === 'pending' ? 'Waiting for fresh readings…' : 'Ask the node to send an immediate reading'}
      >
        {readState === 'pending'
          ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
              Requesting…
            </span>
          )
          : '📡 Request Reading Now'
        }
      </button>

      {/* Pending hint text */}
      {readState === 'pending' && (
        <p className="text-xs text-dim" style={{ marginTop: '-var(--space-3)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          Waiting for device to send fresh data. Will time out in 5 minutes.
        </p>
      )}

      <div className="divider" />

      {/* ── Irrigation Control ── */}
      <p className="section-title">Irrigation Control</p>
      <div className="card-sm" style={{ marginBottom: 'var(--space-4)' }}>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
          {irrigState === 'pending'
            ? `⏳ Waiting for device to acknowledge the ${irrigSecs}s command…`
            : online
              ? 'Start irrigation for a set duration, or stop the pump immediately.'
              : '📵 Device offline — commands will be queued via SMS fallback.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
          {[30, 60, 120].map(s => {
            const isThisPending = irrigState === 'pending' && irrigSecs === s
            return (
              <button key={s} id={`irrigate-${s}s`}
                className={`btn btn-sm ${isThisPending ? 'btn-irrig-pending' : 'btn-primary'}`}
                onClick={() => handleIrrigate(s)}
                disabled={irrigState === 'pending'}
                title={isThisPending ? 'Awaiting acknowledgement…' : `Irrigate for ${s}s`}
              >
                {isThisPending ? '⏳ …' : `${s}s`}
              </button>
            )
          })}
          <button id="stop-irrigation-btn" className="btn btn-danger btn-sm" onClick={handleStop}>
            Stop
          </button>
        </div>
        <IrrigMessage msg={irrigMsg} />
        {irrigState === 'pending' && (
          <p className="text-xs text-dim" style={{ marginTop: 'var(--space-2)' }}>
            Will show SMS fallback warning if no response in 5 minutes.
          </p>
        )}
      </div>

      {/* ── Analytics CTA ── */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <button id="analytics-btn" className="btn btn-ghost btn-sm text-primary"
          onClick={() => navigate(`/analytics/${deviceId}`)}>
          View Analytics & AI Suggestions
        </button>
      </div>

      {/* ── Toast notification ── */}
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

export default NodeDetail
