import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

function CropLibrary() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page" style={{ paddingTop: '5rem' }}>
      <div className="flex items-center justify-between mb-4">
        <h2>Crop Library</h2>
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
        <div className="grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filteredCrops.map(crop => (
            <div key={crop.id} className="card-sm">
              <h3 className="font-semibold text-primary mb-2" style={{ fontSize: '1.2rem' }}>
                {crop.name}
              </h3>
              
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Moisture:</span>
                  <span className="font-semibold">{crop.optimal_moisture_min}% - {crop.optimal_moisture_max}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Temperature:</span>
                  <span className="font-semibold">{crop.optimal_temp_min}°C - {crop.optimal_temp_max}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">pH Level:</span>
                  <span className="font-semibold">{crop.optimal_ph_min} - {crop.optimal_ph_max}</span>
                </div>
                
                <div className="divider" style={{ margin: '0.5rem 0' }} />
                
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Optimal Nutrients (mg/kg)</div>
                <div className="flex justify-between">
                  <span className="text-muted">Nitrogen (N):</span>
                  <span className="font-semibold">{crop.optimal_n_min} - {crop.optimal_n_max}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Phosphorus (P):</span>
                  <span className="font-semibold">{crop.optimal_p_min} - {crop.optimal_p_max}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Potassium (K):</span>
                  <span className="font-semibold">{crop.optimal_k_min} - {crop.optimal_k_max}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CropLibrary
