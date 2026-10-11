import React, { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts'
import { db } from '../firebase.js'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { CROPS, getCropProfile } from '../data/crops.js'

// Helper to determine crop category
function getCropCategory(name) {
  const lower = name.toLowerCase()
  if (/(yam|cassava|potato)/.test(lower)) return 'Tubers & Root Crops'
  if (/(maize|corn|rice)/.test(lower)) return 'Cereals & Grains'
  if (/(pea|bean|groundnut)/.test(lower)) return 'Legumes'
  return 'General Crops'
}

// Helper to get educational content based on category
function getCategoryInfo(category) {
  switch (category) {
    case 'Tubers & Root Crops':
      return {
        suboptimal: "Poor soil moisture or imbalanced pH restricts root expansion, leading to stunted or malformed tubers, while excess moisture causes rot.",
        benefit: "Maintaining deep, consistent moisture and optimal N-P-K ratios encourages rapid cell division and maximum tuber bulking.",
        yieldInc: "Up to 35% Yield Increase"
      }
    case 'Cereals & Grains':
      return {
        suboptimal: "Drought stress or nitrogen deficiency during the silking or flowering stage results in poor grain fill and shriveled kernels.",
        benefit: "Precise moisture tracking ensures the crop survives the critical tasseling/flowering phase, while optimal nitrogen powers rapid vegetative growth.",
        yieldInc: "Up to 28% Yield Increase"
      }
    case 'Legumes':
      return {
        suboptimal: "Excessive nitrogen or poor drainage suppresses the plant's natural nitrogen-fixing bacteria, reducing pod formation.",
        benefit: "Optimal phosphorus application stimulates early root growth and nodule formation, maximizing the plant's ability to fix atmospheric nitrogen.",
        yieldInc: "Up to 25% Yield Increase"
      }
    default:
      return {
        suboptimal: "Improper conditions cause stress, making the plant vulnerable to pests and diseases.",
        benefit: "Optimal conditions ensure rapid growth and maximum resilience.",
        yieldInc: "Up to 20% Yield Increase"
      }
  }
}

// ── Custom Tooltip for Radar ──
const RadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        padding: '0.75rem',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--color-text)'
      }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-primary)' }}>{data.subject}</p>
        <p className="text-sm">Ideal Range: <strong style={{ color: 'var(--color-text)' }}>{data.actualMin} - {data.actualMax} {data.unit}</strong></p>
      </div>
    );
  }
  return null;
}

function CropLibrary() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCropId, setActiveCropId] = useState(null)
  const [viewMode, setViewMode] = useState('instantaneous') // 'instantaneous' (default) or 'seasonal'
  const [displayFormat, setDisplayFormat] = useState('chart') // 'chart' or 'data'

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'cropProfiles'))
        let fetchedCrops = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fallback to static CROPS dataset if Firestore collection is empty
        if (!fetchedCrops.length) {
          fetchedCrops = Object.values(CROPS)
        } else {
          // Merge static instantaneous/seasonal definitions with Firestore docs
          fetchedCrops = fetchedCrops.map(c => {
            const staticDef = getCropProfile(c.id) || getCropProfile(c.name)
            return {
              ...staticDef,
              ...c,
              instantaneous: c.instantaneous || staticDef?.instantaneous,
              seasonal: c.seasonal || staticDef?.seasonal,
            }
          })
        }

        // Deduplicate aliases (e.g. cocoa_yam / cocoyam) for clean presentation
        const seen = new Set()
        const uniqueCrops = []
        for (const c of fetchedCrops) {
          const canonicalName = c.name
          if (!seen.has(canonicalName)) {
            seen.add(canonicalName)
            uniqueCrops.push(c)
          }
        }

        uniqueCrops.sort((a, b) => a.name.localeCompare(b.name))
        setCrops(uniqueCrops)
        if (uniqueCrops.length > 0) {
          setActiveCropId(uniqueCrops[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch crop profiles:', err)
        // Fallback to static dataset if network error
        const fallback = Object.values(CROPS)
        setCrops(fallback)
        if (fallback.length > 0) setActiveCropId(fallback[0].id)
      } finally {
        setLoading(false)
      }
    }
    fetchCrops()
  }, [])

  const activeCrop = useMemo(() => crops.find(c => c.id === activeCropId) || null, [crops, activeCropId])

  // Helper to resolve nutrient ranges based on active viewMode
  const getNutrientRange = (crop, key) => {
    if (!crop) return { min: 0, max: 0 }
    const shortKey = key === 'nitrogen' ? 'n' : key === 'phosphorus' ? 'p' : key === 'potassium' ? 'k' : key
    const tier = crop[viewMode] || (viewMode === 'instantaneous' ? crop.instantaneous : crop.seasonal)
    if (tier && (tier[shortKey] || tier[key])) {
      return tier[shortKey] || tier[key]
    }
    return crop[key] || crop[shortKey] || { min: 0, max: 0 }
  }

  // Prepare normalized data for the Radar Chart
  const radarData = useMemo(() => {
    if (!activeCrop) return []
    
    // Define max scales for normalization to ensure the chart looks balanced in both modes
    const scales = viewMode === 'instantaneous' ? {
      moisture: { scale: 100, unit: '%' },
      ph: { scale: 14, unit: '' },
      nitrogen: { scale: 15, unit: 'mg/kg' },
      phosphorus: { scale: 10, unit: 'mg/kg' },
      potassium: { scale: 30, unit: 'mg/kg' },
      temperature: { scale: 50, unit: '°C' },
    } : {
      moisture: { scale: 100, unit: '%' },
      ph: { scale: 14, unit: '' },
      nitrogen: { scale: 200, unit: 'mg/kg' },
      phosphorus: { scale: 100, unit: 'mg/kg' },
      potassium: { scale: 200, unit: 'mg/kg' },
      temperature: { scale: 50, unit: '°C' },
    }

    const mkAxis = (subject, key) => {
      const isNutrient = ['nitrogen', 'phosphorus', 'potassium'].includes(key)
      const c = isNutrient ? getNutrientRange(activeCrop, key) : (activeCrop[key] || { min: 0, max: 0 })
      const s = scales[key]
      return {
        subject,
        minNorm: (c.min / s.scale) * 100,
        maxNorm: (c.max / s.scale) * 100,
        actualMin: c.min,
        actualMax: c.max,
        unit: s.unit
      }
    }

    return [
      mkAxis('Moisture', 'moisture'),
      mkAxis('Nitrogen', 'nitrogen'),
      mkAxis('Phosphorus', 'phosphorus'),
      mkAxis('Potassium', 'potassium'),
      mkAxis('pH Level', 'ph'),
      mkAxis('Temp', 'temperature'),
    ]
  }, [activeCrop, viewMode])

  return (
    <div className="page">
      <style>{`
        .tab-strip {
          display: flex;
          overflow-x: auto;
          gap: var(--space-2);
          padding-bottom: var(--space-2);
          margin-bottom: var(--space-4);
          scrollbar-width: none; /* Firefox */
        }
        .tab-strip::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }
        .pill-tab {
          flex-shrink: 0;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 600;
          font-size: var(--font-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--color-border);
          background: var(--color-surface-card);
          color: var(--color-text-muted);
        }
        .pill-tab:hover {
          background: var(--color-surface-alt);
        }
        .pill-tab.active {
          background: var(--color-primary);
          color: var(--color-bg);
          border-color: var(--color-primary);
        }
      `}</style>

      {/* ── Header & Toolbar ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2>Crop Library</h2>
          {/* Toggle between "Instantaneous" (Default) and "Seasonal" */}
          <button
            id="toggle-threshold-mode-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => setViewMode(prev => prev === 'instantaneous' ? 'seasonal' : 'instantaneous')}
            title="Toggle between in-situ sensor instantaneous detection and lab seasonal reserve thresholds"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: 'var(--font-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>{viewMode === 'instantaneous' ? '⚡ Instantaneous' : '🌱 Seasonal'}</span>
          </button>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Mode Info Banner ── */}
      <div className="card" style={{ 
        marginBottom: 'var(--space-4)', 
        background: viewMode === 'instantaneous' ? 'var(--color-primary-muted)' : 'var(--color-surface-alt)', 
        border: viewMode === 'instantaneous' ? '1px solid rgba(0, 230, 118, 0.25)' : '1px solid var(--color-border)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-sm)' }}>
          <span>{viewMode === 'instantaneous' ? '⚡' : '🌱'}</span>
          <span>
            {viewMode === 'instantaneous' ? (
              <>
                <strong>Active Mode: Instantaneous In-Situ Detection</strong> (Calibrated for RS485 7-in-1 probe active ionic pore flux, 2–24 mg/kg)
              </>
            ) : (
              <>
                <strong>Active Mode: Seasonal Lab Reference</strong> (Traditional soil extractable reserves, 15–200 mg/kg)
              </>
            )}
          </span>
        </div>
        <span className="text-xs text-muted">
          Unit: <strong>mg/kg</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="spinner" />
        </div>
      ) : crops.length === 0 ? (
        <div className="card text-center py-8 text-muted">
          No crops found in the library.
        </div>
      ) : (
        <>
          {/* ── Horizontal Tab Strip ── */}
          <div className="tab-strip">
            {crops.map(crop => (
              <button
                key={crop.id}
                className={`pill-tab ${activeCropId === crop.id ? 'active' : ''}`}
                onClick={() => setActiveCropId(crop.id)}
              >
                {crop.name}
              </button>
            ))}
          </div>

          {/* ── Content Panel ── */}
          {activeCrop && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{activeCrop.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge">{getCropCategory(activeCrop.name)}</span>
                      <span className="badge" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                        {viewMode === 'instantaneous' ? '⚡ Instantaneous Scale' : '🌱 Seasonal Scale'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {activeCrop.notes && (
                  <p className="text-muted" style={{ fontStyle: 'italic', lineHeight: '1.6', marginTop: 'var(--space-3)' }}>
                    "{activeCrop.notes}"
                  </p>
                )}
              </div>

              {/* Dynamic View: Chart or Data */}
              {displayFormat === 'chart' ? (
                <div style={{ width: '100%', height: 350, background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border-soft)', borderBottom: '1px solid var(--color-border-soft)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--color-border-soft)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Tooltip content={<RadarTooltip />} />
                      <Radar 
                        name="Maximum" 
                        dataKey="maxNorm" 
                        stroke="rgba(0, 230, 118, 0.4)" 
                        fill="var(--color-primary)" 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Minimum" 
                        dataKey="minNorm" 
                        stroke="var(--color-primary)" 
                        fill="var(--color-bg)" 
                        fillOpacity={1} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border-soft)', borderBottom: '1px solid var(--color-border-soft)' }}>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Optimal Soil Conditions</div>
                  <div className="flex flex-col gap-2" style={{ marginBottom: '2rem' }}>
                    <div className="flex justify-between">
                      <span className="text-muted">Moisture:</span>
                      <span className="font-semibold">{activeCrop.moisture?.min}% - {activeCrop.moisture?.max}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Temperature:</span>
                      <span className="font-semibold">{activeCrop.temperature?.min}°C - {activeCrop.temperature?.max}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">pH Level:</span>
                      <span className="font-semibold">{activeCrop.ph?.min} - {activeCrop.ph?.max}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex justify-between items-center">
                    <span>Optimal Nutrients (mg/kg)</span>
                    <span style={{ fontSize: '0.75rem', color: viewMode === 'instantaneous' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {viewMode === 'instantaneous' ? '⚡ Instantaneous' : '🌱 Seasonal'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Nitrogen (N):</span>
                      <span className="font-semibold">{getNutrientRange(activeCrop, 'nitrogen').min} - {getNutrientRange(activeCrop, 'nitrogen').max} mg/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Phosphorus (P):</span>
                      <span className="font-semibold">{getNutrientRange(activeCrop, 'phosphorus').min} - {getNutrientRange(activeCrop, 'phosphorus').max} mg/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Potassium (K):</span>
                      <span className="font-semibold">{getNutrientRange(activeCrop, 'potassium').min} - {getNutrientRange(activeCrop, 'potassium').max} mg/kg</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Educational Section */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-card)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Why this matters</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      <strong style={{ fontSize: 'var(--font-sm)' }}>Suboptimal Risk</strong>
                      <p className="text-sm text-muted" style={{ marginTop: '0.2rem', lineHeight: 1.5 }}>
                        {getCategoryInfo(getCropCategory(activeCrop.name)).suboptimal}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✅</span>
                    <div>
                      <strong style={{ fontSize: 'var(--font-sm)' }}>Optimal Benefit</strong>
                      <p className="text-sm text-muted" style={{ marginTop: '0.2rem', lineHeight: 1.5 }}>
                        {getCategoryInfo(getCropCategory(activeCrop.name)).benefit}
                      </p>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: '0.5rem',
                    padding: '0.75rem', 
                    background: 'var(--color-primary-muted)', 
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>📈</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-md)' }}>
                      {getCategoryInfo(getCropCategory(activeCrop.name)).yieldInc}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                  <button 
                    className="btn btn-ghost w-full" 
                    onClick={() => setDisplayFormat(prev => prev === 'chart' ? 'data' : 'chart')}
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    {displayFormat === 'chart' ? '📋 View Raw Data List' : '🕸️ View Radar Chart'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CropLibrary
