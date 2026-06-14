// client/src/pages/Analytics.jsx
// Historical readings + AI crop suggestions via Gemini.
// Route: /analytics/:deviceId

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import api                             from '../api/axiosInstance.js'
import ThemeToggle                     from '../components/ThemeToggle.jsx'

function Analytics() {
  const { deviceId }                = useParams()
  const navigate                    = useNavigate()
  const [readings, setReadings]     = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError]   = useState('')
  const [limit, setLimit]           = useState(50)
  const [suggestion, setSuggestion] = useState(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState('')

  useEffect(() => {
    if (deviceId) fetchHistory()
  }, [deviceId, limit]) // eslint-disable-line

  async function fetchHistory() {
    setHistLoading(true); setHistError('')
    try {
      const res = await api.get('/api/history', { params: { deviceId, limit } })
      setReadings(res.data.readings || [])
    } catch { setHistError('Failed to load history.') }
    finally { setHistLoading(false) }
  }

  async function fetchSuggestions() {
    setAiLoading(true); setAiError(''); setSuggestion(null)
    try {
      const res = await api.get(`/api/suggestions/${deviceId}`)
      setSuggestion(res.data)
    } catch (err) {
      setAiError(err.response?.data?.error || 'Failed to generate suggestions. Ensure GEMINI_API_KEY is set in server/.env')
    } finally { setAiLoading(false) }
  }

  const v    = (val, d = 1) => val != null ? Number(val).toFixed(d) : '—'
  const fmtT = ts => { try { return new Date(ts).toLocaleString() } catch { return '—' } }

  return (
    <div className="page">
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <button id="back-from-analytics" className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/node/${deviceId}`)}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Analytics</h1>
          <p className="text-xs text-muted">{deviceId}</p>
        </div>
        <ThemeToggle />
      </header>

      {/* ── AI Suggestions ── */}
      <p className="section-title">AI Crop Recommendations</p>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        {!suggestion && !aiLoading && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
              Get personalised, Gemini-powered advice based on your latest sensor readings
              and optimal ranges for your selected crop.
            </p>
            <button id="get-suggestions-btn" className="btn btn-primary w-full"
              onClick={fetchSuggestions} disabled={aiLoading}>
              ✨ Generate AI Suggestions
            </button>
          </>
        )}

        {aiLoading && (
          <div className="flex items-center gap-3" style={{ padding: 'var(--space-4) 0' }}>
            <div className="spinner" />
            <span className="text-sm text-muted">Analysing soil data with Gemini…</span>
          </div>
        )}

        {aiError && (
          <div>
            <p className="error-message">{aiError}</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={fetchSuggestions}>
              Try again
            </button>
          </div>
        )}

        {suggestion && (
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <p className="text-xs text-muted">Crop: <strong className="text-primary">{suggestion.crop}</strong></p>
                <p className="text-xs text-dim" style={{ marginTop: '2px' }}>
                  Generated {new Date(suggestion.generatedAt).toLocaleTimeString()}
                </p>
              </div>
              <button id="refresh-suggestions-btn" className="btn btn-ghost btn-sm"
                onClick={fetchSuggestions} disabled={aiLoading}>Refresh</button>
            </div>

            {/* AI response text */}
            <div style={{
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              border: '1px solid var(--color-border-soft)',
              borderLeft: '3px solid var(--color-primary)',
              lineHeight: 1.75,
            }}>
              {suggestion.recommendation.split('\n').map((line, i) => {
                if (!line.trim()) return null
                const isWarn = /warning|urgent|critical/i.test(line)
                return (
                  <p key={i} style={{
                    fontSize: 'var(--font-sm)',
                    color: isWarn ? 'var(--color-warning)' : 'var(--color-text)',
                    marginBottom: '0.4rem',
                    paddingLeft: line.trim().startsWith('-') || line.trim().startsWith('•') ? '0.75rem' : undefined,
                  }}>
                    {line}
                  </p>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* ── History ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
        <p className="section-title" style={{ margin: 0 }}>Historical Readings</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <label className="text-xs text-muted" htmlFor="hist-limit">Show</label>
          <select id="hist-limit" className="select" value={limit} onChange={e => setLimit(Number(e.target.value))}
            style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: 'var(--font-xs)' }}>
            {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {histError && <p className="error-message" style={{ marginBottom: 'var(--space-3)' }}>{histError}</p>}

      {histLoading ? (
        <div className="flex items-center gap-3" style={{ padding: 'var(--space-4) 0' }}>
          <div className="spinner" /><span className="text-sm text-muted">Loading history…</span>
        </div>
      ) : readings.length === 0 ? (
        <div className="card text-center" style={{ padding: 'var(--space-6)' }}>
          <p className="text-muted text-sm">No readings recorded yet.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Time</th><th>Moist%</th><th>Temp°C</th><th>Hum%</th>
              <th>N</th><th>P</th><th>K</th><th>pH</th>
            </tr></thead>
            <tbody>
              {readings.map(r => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmtT(r.timestamp)}</td>
                  <td style={{ color: 'var(--color-accent)',   fontWeight: 600 }}>{v(r.moisture)}</td>
                  <td style={{ color: 'var(--color-warning)' }}>{v(r.temperature)}</td>
                  <td>{v(r.humidity)}</td>
                  <td style={{ color: 'var(--color-primary)' }}>{v(r.nitrogen, 0)}</td>
                  <td style={{ color: 'var(--color-warning)' }}>{v(r.phosphorus, 0)}</td>
                  <td style={{ color: 'var(--color-accent)'  }}>{v(r.potassium, 0)}</td>
                  <td style={{ color: 'var(--color-primary)' }}>{v(r.ph)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Analytics
