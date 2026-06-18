import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext.jsx'
import { auth, db } from '../firebase.js'

function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const closeDrawer = () => setIsOpen(false)

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      where('read', '==', false)
    )
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length)
    }, err => {
      console.error("Error fetching unread count:", err)
    })
    return unsub
  }, [currentUser])

  // Use a default initial if displayName is missing
  const defaultInitial = currentUser?.email?.[0].toUpperCase() || 'U'

  return (
    <>
      {/* ── Hamburger Button ── */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button 
          className="hamburger-btn" 
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 10, height: 10, 
            backgroundColor: 'var(--color-danger)', borderRadius: '50%', border: '2px solid var(--color-bg)'
          }}></span>
        )}
      </div>

      {/* ── Overlay ── */}
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeDrawer}
      />

      {/* ── Drawer Container ── */}
      <div className={`drawer-container ${isOpen ? 'open' : ''}`}>
        
        <div className="drawer-header">
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="avatar" />
              ) : (
                <div className="avatar flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-muted)' }}>
                  <img src="/favicon.svg" alt="Default Avatar" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
                </div>
              )}
              <div className="flex-col">
                <div className="font-semibold">{currentUser.displayName || 'Farmer'}</div>
                <div className="text-xs text-muted">{currentUser.email}</div>
              </div>
            </div>
          ) : null}
        </div>

        <nav className="drawer-nav">
          <Link 
            to="/dashboard" 
            className={`drawer-link ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </Link>
          
          <Link 
            to="/analytics" 
            className={`drawer-link ${location.pathname.startsWith('/analytics') ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Analytics
          </Link>
          
          <Link 
            to="/crop-library" 
            className={`drawer-link ${location.pathname.startsWith('/crop-library') ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            Crop Library
          </Link>

          <Link 
            to="/notifications" 
            className={`drawer-link ${location.pathname.startsWith('/notifications') ? 'active' : ''}`}
            onClick={closeDrawer}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              Notifications
            </div>
            {unreadCount > 0 && (
              <span style={{ 
                backgroundColor: 'var(--color-danger)', color: 'white', fontSize: '0.7rem', 
                fontWeight: 'bold', padding: '0.1rem 0.4rem', borderRadius: '1rem' 
              }}>
                {unreadCount}
              </span>
            )}
          </Link>

          <Link 
            to="/settings" 
            className={`drawer-link ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="p-4" style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <button 
            className="btn btn-ghost w-full"
            onClick={handleLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

export default HamburgerMenu
