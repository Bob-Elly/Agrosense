// client/src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Provides Firebase auth state to the entire app via React Context.
// Exposes both `currentUser` (null if unauthenticated) and `loading` (true
// while Firebase resolves the initial auth state). ProtectedRoute uses
// `loading` to avoid a premature redirect before auth has been checked.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  // `loading` starts true — stays true until Firebase calls onAuthStateChanged
  // at least once. Only then do we know whether there is a logged-in user.
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)  // auth state is now known
    })
    return unsubscribe
  }, [])

  // NOTE: We no longer do an early return for `loading` here.
  // Instead we expose `loading` through context so that ProtectedRoute can
  // show a spinner and avoid redirecting to "/" before auth resolves.
  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
