import React, { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts'
import { db } from '../firebase.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

// Helper to determine crop category
function getCropCategory(name) {
  const lower = name.toLowerCase()
  if (/(yam|cassava|potato)/.test(lower)) return 'Tubers & Root Crops'
  if (/(maize|rice)/.test(lower)) return 'Cereals & Grains'
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
  const [viewMode, setViewMode] = useState('chart') // 'chart' or 'data'

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'cropProfiles'))
        const fetchedCrops = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort alphabetically
        fetchedCrops.sort((a, b) => a.name.localeCompare(b.name))
        setCrops(fetchedCrops)
        if (fetchedCrops.length > 0) {
          setActiveCropId(fetchedCrops[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch crop profiles:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCrops()
  }, [])

  const activeCrop = useMemo(() => crops.find(c => c.id === activeCropId) || null, [crops, activeCropId])

  // Prepare normalized data for the Radar Chart
  const radarData = useMemo(() => {
    if (!activeCrop) return []
    
    // Define max scales for normalization to ensure the chart looks balanced
    // 100%, 14pH, 200mg N, 100mg P, 200mg K, 50C
    const scales = {
      moisture: { scale: 100, unit: '%' },
      ph: { scale: 14, unit: '' },
      nitrogen: { scale: 200, unit: 'mg' },
      phosphorus: { scale: 100, unit: 'mg' },
      potassium: { scale: 200, unit: 'mg' },
      temperature: { scale: 50, unit: '°C' },
    }

    const mkAxis = (subject, key) => {
      const c = activeCrop[key] || { min: 0, max: 0 }
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
  }, [activeCrop])

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

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2>Crop Library</h2>
        <ThemeToggle />
      </div>

      {/* ── General Info Banner ── */}
      <div className="card" style={{ 
        marginBottom: 'var(--space-5)', 
        background: 'var(--color-primary-muted)', 
        border: '1px solid rgba(0, 230, 118, 0.25)',
        padding: '1.25rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💡 Why optimal conditions matter
        </h3>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '1.5rem', 
          color: 'var(--color-text)', 
          fontSize: 'var(--font-sm)',
          lineHeight: 1.6
        }}>
          <li><strong>Reduced fertilizer costs:</strong> Target exactly what the soil needs.</li>
          <li><strong>Natural pest resistance:</strong> Healthy plants fight off diseases naturally.</li>
          <li><strong>Eliminated growth stunting:</strong> Consistent conditions ensure steady growth.</li>
        </ul>
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
                    <span className="badge" style={{ marginTop: '0.5rem' }}>{getCropCategory(activeCrop.name)}</span>
                  </div>
                </div>
                
                {activeCrop.notes && (
                  <p className="text-muted" style={{ fontStyle: 'italic', lineHeight: '1.6', marginTop: 'var(--space-3)' }}>
                    "{activeCrop.notes}"
                  </p>
                )}
              </div>

              {/* Dynamic View: Chart or Data */}
              {viewMode === 'chart' ? (
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
                  
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Optimal Nutrients (mg/kg)</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Nitrogen (N):</span>
                      <span className="font-semibold">{activeCrop.nitrogen?.min} - {activeCrop.nitrogen?.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Phosphorus (P):</span>
                      <span className="font-semibold">{activeCrop.phosphorus?.min} - {activeCrop.phosphorus?.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Potassium (K):</span>
                      <span className="font-semibold">{activeCrop.potassium?.min} - {activeCrop.potassium?.max}</span>
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
                    onClick={() => setViewMode(prev => prev === 'chart' ? 'data' : 'chart')}
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    {viewMode === 'chart' ? '📋 View Raw Data List' : '🕸️ View Radar Chart'}
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
