import React, { useState, useEffect } from 'react'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../hooks/useTheme.js'
import ThemeToggle from '../components/ThemeToggle.jsx'
import VerificationFlow from '../components/VerificationFlow.jsx'

function Settings() {
  const { currentUser } = useAuth()
  const { theme, setThemePreference } = useTheme()
  
  // Account State
  const [displayName, setDisplayName] = useState('')
  // Password state removed in favor of reset flow
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

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
      
      // Sync display name to firestore user document if changed
      if (updates.name) {
        await setDoc(doc(db, 'users', currentUser.uid), { displayName }, { merge: true })
      }
      
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
    <div className="page">
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
          
          {resettingPassword ? (
            <div className="py-2">
              <h4 className="mb-4 text-center">Reset Your Password</h4>
              <VerificationFlow 
                action="reset_password"
                initialEmail={currentUser.email}
                emailReadOnly={true}
                onSuccess={() => {
                  setResettingPassword(false)
                  showMessage('success', 'Password reset successfully.')
                }}
                onCancel={() => setResettingPassword(false)}
              />
            </div>
          ) : isAccountLocked ? (
            <div className="text-center py-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h4 className="mb-2">Security Verification Required</h4>
              <p className="text-sm text-muted mb-6">
                Please enter your password to unlock account management.
              </p>
              <form onSubmit={handleReauthenticate} className="flex flex-col gap-3 text-left">
                <div>
                  <label className="label mb-1" style={{ fontSize: '0.8rem' }}>Current Password</label>
                  <input 
                    type="password" 
                    className="input w-full" 
                    placeholder="••••••••" 
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    required
                  />
                  <div className="flex justify-end mt-1">
                    <button 
                      type="button" 
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onMouseOver={(e) => e.target.style.color = 'var(--color-accent)'}
                      onMouseOut={(e) => e.target.style.color = 'var(--color-text-muted)'}
                      onClick={() => setResettingPassword(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={reauthenticating}>
                  {reauthenticating ? 'Verifying...' : 'Unlock Account'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="avatar avatar-lg mb-2" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="avatar avatar-lg flex items-center justify-center mb-2" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary-muted)' }}>
                    <img src="/favicon.svg" alt="Default Avatar" style={{ width: '50%', height: '50%', objectFit: 'contain' }} />
                  </div>
                )}
                <div className="text-lg font-semibold">{currentUser?.displayName || 'Farmer'}</div>
                <div className="text-sm text-muted">{currentUser?.email}</div>
              </div>
              <form onSubmit={handleAccountUpdate}>
                <div className="form-group mb-4">
                  <label className="label">Display Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="Farmer Bob" 
                  />
                </div>
                
                <button type="submit" className="btn btn-primary w-full" disabled={loadingAccount}>
                  {loadingAccount ? 'Updating...' : 'Update Account'}
                </button>
              </form>

              <div className="divider" style={{ margin: '1.5rem 0' }}></div>

              <div className="form-group mb-0">
                <label className="label">Security</label>
                <button 
                  className="btn btn-ghost w-full" 
                  style={{ border: '1px solid var(--color-border)', justifyContent: 'center' }}
                  onClick={() => setResettingPassword(true)}
                >
                  Reset Password
                </button>
              </div>
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
              
              <p className="text-sm text-muted mb-2">Core alerts (Moisture, pH, NPK, and Connectivity) are always active to ensure your farm's safety.</p>

              <div className="divider" style={{ margin: '0.5rem 0' }}></div>

              <h4 className="font-semibold">Delivery Methods</h4>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">In-app Dashboard</div>
                  <div className="text-xs text-muted">Receive alerts in the notification center</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={true} disabled />
                  <span className="toggle-slider" style={{ opacity: 0.5, cursor: 'not-allowed' }}></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-dim">
                    SMS Text Messages 
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginLeft: '0.5rem', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)' }}>Coming soon</span>
                  </div>
                  <div className="text-xs text-muted">Get instant text alerts on your phone</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={false} disabled />
                  <span className="toggle-slider" style={{ opacity: 0.5, cursor: 'not-allowed' }}></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Email Alerts</div>
                  <div className="text-xs text-muted">Receive summary alerts in your inbox</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.emailAlerts === true || notifications.deliveryMethod === 'email'} 
                    onChange={() => {
                      setNotifications(prev => ({
                        ...prev, 
                        emailAlerts: !(prev.emailAlerts === true || prev.deliveryMethod === 'email'),
                        deliveryMethod: 'in-app' // Clear legacy value so we don't conflict
                      }))
                    }} 
                  />
                  <span className="toggle-slider"></span>
                </label>
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

        {/* ── Theme Section ── */}
        <div className="card">
          <h3 className="section-title mb-4">App Theme</h3>
          <p className="text-sm text-muted mb-4">Choose your preferred appearance. This will be applied every time you open AgroSense.</p>
          <div className="form-group mb-0">
            <select 
              className="select" 
              value={theme}
              onChange={(e) => setThemePreference(e.target.value)}
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings
