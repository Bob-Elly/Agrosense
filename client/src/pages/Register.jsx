// client/src/pages/Register.jsx
// Account creation page with theme toggle.

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp }                  from 'firebase/firestore'
import { auth, db }                                      from '../firebase.js'
import ThemeToggle from '../components/ThemeToggle.jsx'
import VerificationFlow from '../components/VerificationFlow.jsx'

function Register() {
  const navigate              = useNavigate()
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, name, email,
        createdAt: serverTimestamp(), devices: [],
      })
      // Account created, now require email verification
      setNeedsVerification(true)
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
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            {needsVerification ? 'Verify your email' : 'Create your account'}
          </p>
        </div>

        <div className="card">
          {needsVerification ? (
            <VerificationFlow 
              action="verify_email"
              initialEmail={email}
              emailReadOnly={true}
              onSuccess={async () => {
                // Reload Firebase user so it picks up emailVerified = true from Admin SDK
                await auth.currentUser?.reload()
                navigate('/link-device')
              }}
              // Removed onCancel so they must complete it
            />
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="label" htmlFor="reg-name">Full name</label>
                  <input id="reg-name" className="input" type="text" placeholder="Jane Farmer"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="reg-email">Email address</label>
                  <input id="reg-email" className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="reg-password">Password</label>
                  <input id="reg-password" className="input" type="password" placeholder="At least 6 characters"
                    value={password} onChange={e => setPass(e.target.value)} required autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="reg-confirm">Confirm password</label>
                  <input id="reg-confirm" className="input" type="password" placeholder="Repeat your password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button id="reg-submit" className="btn btn-primary w-full"
                  type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
              <p className="text-muted text-center" style={{ marginTop: '1.5rem' }}>
                Already have an account? <Link to="/">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const m = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email':        'That doesn\'t look like a valid email.',
    'auth/weak-password':        'Password is too weak. Use at least 6 characters.',
  }
  return m[code] || 'Registration failed. Please try again.'
}

export default Register
