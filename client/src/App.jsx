// client/src/App.jsx
// Root application component — routes, auth context, and global decorations.

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }    from './context/AuthContext.jsx'
import ProtectedRoute      from './components/ProtectedRoute.jsx'
import FallingFlowers      from './components/FallingFlowers.jsx'

import Login      from './pages/Login.jsx'
import Register   from './pages/Register.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import NodeDetail from './pages/NodeDetail.jsx'
import Analytics  from './pages/Analytics.jsx'
import LinkDevice from './pages/LinkDevice.jsx'

function App() {
  return (
    <AuthProvider>
      {/* Decorative falling blossoms — behind all page content */}
      <FallingFlowers />

      {/* All page content sits above z-index:0 flowers */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"           element={<Dashboard />} />
            <Route path="/node/:deviceId"      element={<NodeDetail />} />
            <Route path="/analytics/:deviceId" element={<Analytics />} />
            <Route path="/link-device"         element={<LinkDevice />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App

