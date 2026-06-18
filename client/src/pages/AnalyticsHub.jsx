import React, { useState, useEffect } from 'react'
import { useNavigate }                 from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db }                          from '../firebase.js'
import { useAuth }                     from '../context/AuthContext.jsx'
import ThemeToggle                     from '../components/ThemeToggle.jsx'

function AnalyticsHub() {
  const { currentUser }           = useAuth()
  const navigate                  = useNavigate()
  const [devices, setDevices]         = useState([])
  const [nodesLoading, setNodesLoading] = useState(true)

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

  return (
    <div className="page">
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Analytics Hub</h1>
          <p className="text-xs text-muted">Select a node to view its analysis and history</p>
        </div>
        <ThemeToggle />
      </header>

      {nodesLoading ? (
        <div className="flex items-center gap-3" style={{ padding: 'var(--space-4) 0' }}>
          <div className="spinner" />
          <span className="text-sm text-muted">Loading nodes…</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="card-sm text-center" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📊</p>
          <p className="text-sm text-muted">No nodes linked yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {devices.map(device => {
            const id = device.deviceId || device.id
            return (
              <button
                key={id}
                onClick={() => navigate(`/analytics/${id}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '3px solid var(--color-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-card)'}
              >
                <p style={{ fontWeight: 600, fontSize: 'var(--font-md)', color: 'var(--color-text)' }}>
                  {device.label || id}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '0.2rem' }}>
                  <p className="text-xs text-dim">ID: {id}</p>
                  {device.crop && <span className="text-xs text-muted">🌿 {device.crop}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AnalyticsHub
