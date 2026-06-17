import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

function CropLibrary() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'cropProfiles'))
        const fetchedCrops = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort alphabetically by name
        fetchedCrops.sort((a, b) => a.name.localeCompare(b.name))
        console.log("Fetched crop profiles from Firestore:", fetchedCrops)
        setCrops(fetchedCrops)
      } catch (err) {
        console.error('Failed to fetch crop profiles:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCrops()
  }, [])

  const filteredCrops = crops.filter(c => 
    c.name && c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4">
        <h2>Crop Library</h2>
        <ThemeToggle />
      </div>

      <div className="card mb-4" style={{ padding: '1rem' }}>
        <input 
          type="text" 
          placeholder="Search crops..." 
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="spinner" />
        </div>
      ) : filteredCrops.length === 0 ? (
        <div className="card text-center py-8 text-muted">
          No crops found matching "{search}"
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
          {filteredCrops.map(crop => {
            const isExpanded = expandedId === crop.id;
            return (
              <div key={crop.id} className="card-sm" style={{ padding: 0, overflow: 'hidden' }}>
                <button 
                  onClick={() => toggleExpand(crop.id)}
                  className="w-full flex items-center justify-between border-none text-left"
                  style={{ padding: '1.25rem', cursor: 'pointer', background: 'transparent' }}
                >
                  <span className="font-semibold text-primary" style={{ fontSize: '1.1rem' }}>{crop.name}</span>
                  <svg 
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--color-text-muted)' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="text-sm" style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--color-border-soft)', marginTop: '0.5rem', paddingTop: '1.25rem' }}>
                    
                    {crop.notes && (
                      <div className="text-muted" style={{ fontStyle: 'italic', lineHeight: '1.6', marginBottom: '2rem' }}>
                        {crop.notes}
                      </div>
                    )}
                    
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Optimal Soil Conditions</div>
                    <div className="flex flex-col gap-2" style={{ marginBottom: '2rem' }}>
                      <div className="flex justify-between">
                        <span className="text-muted">Moisture:</span>
                        <span className="font-semibold">{crop.moisture?.min}% - {crop.moisture?.max}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Temperature:</span>
                        <span className="font-semibold">{crop.temperature?.min}°C - {crop.temperature?.max}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">pH Level:</span>
                        <span className="font-semibold">{crop.ph?.min} - {crop.ph?.max}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Optimal Nutrients (mg/kg)</div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Nitrogen (N):</span>
                        <span className="font-semibold">{crop.nitrogen?.min} - {crop.nitrogen?.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Phosphorus (P):</span>
                        <span className="font-semibold">{crop.phosphorus?.min} - {crop.phosphorus?.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Potassium (K):</span>
                        <span className="font-semibold">{crop.potassium?.min} - {crop.potassium?.max}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CropLibrary
