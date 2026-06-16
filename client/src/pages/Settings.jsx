import React, { useState, useEffect, useRef } from 'react'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

function Settings() {
  const { currentUser } = useAuth()
  
  // Account State
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [loadingAccount, setLoadingAccount] = useState(false)
  
  // File Upload State
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // Security State
  const [isAccountLocked, setIsAccountLocked] = useState(true)
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthenticating, setReauthenticating] = useState(false)

  // Notifications State
  const [notifications, setNotifications] = useState({
    lowMoisture: true,
    phAlert: true,
    lowNutrient: true,
    nodeOffline: true,
    nodeConfirmation: false,
    deliveryMethod: 'in-app'
  })
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [fetchingNotif, setFetchingNotif] = useState(true)

  // Status message
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      
      // Fetch user settings from Firestore
      const fetchSettings = async () => {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const data = userDoc.data()
            if (data.notificationPreferences) {
              setNotifications(data.notificationPreferences)
            } else if (data.notifications) {
              // Fallback for legacy data
              setNotifications(data.notifications)
            }
          }
        } catch (err) {
          console.error("Error fetching settings:", err)
        } finally {
          setFetchingNotif(false)
        }
      }
      fetchSettings()
    }
  }, [currentUser])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  // ── Handle Re-authentication ──
  const handleReauthenticate = async (e) => {
    e.preventDefault()
    setReauthenticating(true)
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, reauthPassword)
      await reauthenticateWithCredential(currentUser, credential)
      setIsAccountLocked(false)
      setReauthPassword('')
      showMessage('success', 'Authentication successful. You can now manage your account.')
    } catch (err) {
      console.error(err)
      showMessage('error', 'Authentication failed. Please check your password.')
    } finally {
      setReauthenticating(false)
    }
  }

  // ── Handle Profile Picture Upload ──
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !currentUser) return

    setUploading(true)
    try {
      // Create a reference to the storage location
      const fileExt = file.name.split('.').pop()
      const storageRef = ref(storage, `profile_pictures/${currentUser.uid}.${fileExt}`)
      
      // Upload the file
      await uploadBytes(storageRef, file)
      
      // Get the download URL
      const photoURL = await getDownloadURL(storageRef)
      
      // Update the user's auth profile
      await updateProfile(currentUser, { photoURL })
      
      showMessage('success', 'Profile picture updated successfully')
    } catch (err) {
      console.error(err)
      showMessage('error', 'Failed to upload profile picture: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Handle Account Update ──
  const handleAccountUpdate = async (e) => {
    e.preventDefault()

    if (!window.confirm('Are you sure you want to apply these account changes?')) {
      return
    }

    setLoadingAccount(true)
    try {
      const updates = {}
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName })
        updates.name = displayName
      }
      if (password.trim() !== '') {
        await updatePassword(currentUser, password)
      }
      
      // Sync display name to firestore user document if changed
      if (updates.name) {
        await setDoc(doc(db, 'users', currentUser.uid), { displayName }, { merge: true })
      }
      
      setPassword('')
      showMessage('success', 'Account updated successfully')
      
      // Relock account for security
      setIsAccountLocked(true)
    } catch (err) {
      console.error(err)
      showMessage('error', 'Failed to update account: ' + err.message)
    } finally {
      setLoadingAccount(false)
    }
  }

  // ── Handle Notifications Update ──
  const handleNotificationsSave = async () => {
    setLoadingNotif(true)
    try {
      const userDocRef = doc(db, 'users', currentUser.uid)
      await setDoc(userDocRef, { notificationPreferences: notifications }, { merge: true })
      showMessage('success', 'Notification preferences saved')
    } catch (err) {
      console.error(err)
      showMessage('error', 'Failed to save notification preferences: ' + err.message)
    } finally {
      setLoadingNotif(false)
    }
  }

  const handleToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const defaultInitial = currentUser?.email?.[0].toUpperCase() || 'U'

  return (
    <div className="page" style={{ paddingTop: '5rem' }}>
      <div className="flex items-center justify-between mb-4">
        <h2>Settings</h2>
        <ThemeToggle />
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-900/30 border border-red-500 text-red-200' : 'bg-green-900/30 border border-green-500 text-green-200'}`} style={{ 
          background: message.type === 'error' ? 'var(--color-danger-muted)' : 'var(--color-primary-muted)',
          color: message.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)',
          border: `1px solid ${message.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1rem'
        }}>
          {message.text}
        </div>
      )}

      <div className="grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* ── Account Section ── */}
        <div className="card">
          <h3 className="section-title mb-4 flex items-center justify-between">
            Account Profile
            {!isAccountLocked && (
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setIsAccountLocked(true)}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              >
                Lock
              </button>
            )}
          </h3>
          
          {isAccountLocked ? (
            <div className="text-center py-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h4 className="mb-2">Security Verification Required</h4>
              <p className="text-sm text-muted mb-6">
                Please enter your password to unlock account management.
              </p>
              <form onSubmit={handleReauthenticate} className="flex flex-col gap-3">
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Current Password" 
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={reauthenticating}>
                  {reauthenticating ? 'Verifying...' : 'Unlock Account'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="mb-3 position-relative">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="avatar-lg avatar" style={{ width: '96px', height: '96px' }} />
                  ) : (
                    <div className="avatar avatar-lg flex items-center justify-center" style={{ fontSize: '2.5rem', fontWeight: 600 }}>
                      {defaultInitial}
                    </div>
                  )}
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload}
                />
                
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Change Picture'}
                </button>
              </div>

              <form onSubmit={handleAccountUpdate}>
                <div className="form-group">
                  <label className="label">Display Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="Farmer Bob" 
                  />
                </div>
                
                <div className="form-group">
                  <label className="label">New Password (leave blank to keep current)</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    minLength="6"
                  />
                </div>
                
                <button type="submit" className="btn btn-primary w-full mt-2" disabled={loadingAccount}>
                  {loadingAccount ? 'Updating...' : 'Update Account'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Notifications Section ── */}
        <div className="card">
          <h3 className="section-title mb-4">Notification Preferences</h3>
          
          {fetchingNotif ? (
            <div className="flex items-center justify-center py-4">
              <div className="spinner" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Low Moisture Alert</div>
                  <div className="text-xs text-muted">Get notified when soil is dry</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications.lowMoisture} onChange={() => handleToggle('lowMoisture')} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">pH Level Alert</div>
                  <div className="text-xs text-muted">Warn when pH leaves optimal range</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications.phAlert} onChange={() => handleToggle('phAlert')} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Low Nutrient Alert</div>
                  <div className="text-xs text-muted">Warn when N, P, or K is depleted</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications.lowNutrient} onChange={() => handleToggle('lowNutrient')} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="divider" style={{ margin: '0.5rem 0' }}></div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Node Offline Alert</div>
                  <div className="text-xs text-muted">Notified when a device disconnects</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications.nodeOffline} onChange={() => handleToggle('nodeOffline')} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Device Linked/Removed</div>
                  <div className="text-xs text-muted">Confirmation of hardware changes</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifications.nodeConfirmation} onChange={() => handleToggle('nodeConfirmation')} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="divider" style={{ margin: '0.5rem 0' }}></div>

              <div className="form-group mb-0">
                <label className="label">Delivery Method</label>
                <select 
                  className="select" 
                  value={notifications.deliveryMethod} 
                  onChange={(e) => setNotifications(prev => ({...prev, deliveryMethod: e.target.value}))}
                >
                  <option value="in-app">In-App Dashboard Only</option>
                  <option value="email">In-App + Email</option>
                </select>
              </div>
              
              <button 
                className="btn btn-primary w-full mt-4" 
                onClick={handleNotificationsSave}
                disabled={loadingNotif}
              >
                {loadingNotif ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Settings
