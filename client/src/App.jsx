// client/src/App.jsx
// Root application component — routes and auth context.

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }  from './context/AuthContext.jsx'
import ProtectedRoute    from './components/ProtectedRoute.jsx'

import Login      from './pages/Login.jsx'
import Register   from './pages/Register.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import NodeDetail from './pages/NodeDetail.jsx'
import Analytics  from './pages/Analytics.jsx'
import LinkDevice from './pages/LinkDevice.jsx'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/node/:deviceId"   element={<NodeDetail />} />
          <Route path="/analytics/:deviceId" element={<Analytics />} />
          <Route path="/link-device"      element={<LinkDevice />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
