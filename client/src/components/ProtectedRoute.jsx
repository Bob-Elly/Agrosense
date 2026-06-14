// client/src/components/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Route guard for authenticated pages.
//
// FIX: We now check `loading` before making any redirect decision.
// Previously, if Firebase hadn't resolved the auth state yet, `currentUser`
// would be null and the user would be bounced to "/" even though they ARE
// logged in. Now we show a spinner until the auth state is known.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function ProtectedRoute() {
  const { currentUser, loading } = useAuth()

  // ① Auth state is still being resolved — show a neutral loading screen.
  //    DO NOT redirect yet; we don't know if the user is logged in.
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div className="spinner" />
      </div>
    )
  }

  // ② Auth is resolved and there is no user → redirect to login.
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  // ③ Authenticated → render the matched child route.
  return <Outlet />
}

export default ProtectedRoute
