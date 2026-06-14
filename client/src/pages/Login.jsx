// client/src/pages/Login.jsx
// Sign-in page with theme toggle.

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

function Login() {
  const navigate            = useNavigate()
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) { setError(friendlyError(err.code)) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-centered">
      {/* Theme toggle — top-right corner */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>

      <div className="container">
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h1 className="logo-gradient" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            🌱 AgroSense
          </h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="label" htmlFor="login-email">Email address</label>
              <input id="login-email" className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="login-password">Password</label>
              <input id="login-password" className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPass(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button id="login-submit" className="btn btn-primary w-full"
              type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-muted text-center" style={{ marginTop: '1.5rem' }}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const m = {
    'auth/user-not-found':     'No account found with that email.',
    'auth/wrong-password':     'Incorrect password. Please try again.',
    'auth/invalid-email':      'That doesn\'t look like a valid email.',
    'auth/too-many-requests':  'Too many attempts. Please wait a moment.',
    'auth/invalid-credential': 'Invalid email or password.',
  }
  return m[code] || 'Something went wrong. Please try again.'
}

export default Login
