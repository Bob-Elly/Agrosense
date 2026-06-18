// client/src/components/VerificationFlow.jsx
import React, { useState, useEffect } from 'react'
import api from '../api/axiosInstance.js'

/**
 * A reusable flow for 6-digit email verification.
 * @param {string} action - 'reset_password' or 'verify_email'
 * @param {string} [initialEmail] - Pre-filled email (e.g. if already known)
 * @param {boolean} [emailReadOnly] - If true, user cannot edit the email input
 * @param {Function} onSuccess - Callback when verification (and password reset, if applicable) is successful
 * @param {Function} onCancel - Callback if the user cancels out of the flow
 */
export default function VerificationFlow({ action, initialEmail = '', emailReadOnly = false, onSuccess, onCancel }) {
  const [step, setStep] = useState(1) // 1: Email, 2: Code, 3: New Password (if reset_password)
  
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // If initialEmail is provided and readOnly, auto-send code on mount? 
  // No, let user explicitly click "Send Code" or we can auto-send.
  // Let's require them to click to avoid spamming just by opening the view.

  const handleSendCode = async (e) => {
    e?.preventDefault()
    if (!email) {
      setError('Please enter a valid email address.')
      return
    }
    
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const res = await api.post('/api/auth/send-verification-code', { email, action })
      setMessage(res.data.message || 'Code sent! Check your inbox.')
      if (res.data.devCode) {
         // In dev mode without Resend API key, we get the code back for easy testing
         console.log('DEV MODE CODE:', res.data.devCode)
      }
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e?.preventDefault()
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code.')
      return
    }
    
    if (action === 'reset_password') {
      // If it's reset password, proceed to step 3 to get the new password
      setStep(3)
      setError('')
      setMessage('Code accepted. Please enter your new password.')
      return
    }

    // For verify_email, we verify the code directly without needing a new password
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/verify-code', { email, code, action })
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetNewPassword = async (e) => {
    e?.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/verify-code', { email, code, action, newPassword })
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="verification-flow">
      {error && <p className="error-message mb-3">{error}</p>}
      {message && <p className="success-message mb-3" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>{message}</p>}

      {step === 1 && (
        <form onSubmit={handleSendCode}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              readOnly={emailReadOnly}
              required
            />
          </div>
          <div className="flex gap-2 mt-4">
            {onCancel && (
              <button type="button" className="btn btn-ghost w-full" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyCode}>
          <div className="form-group">
            <label className="label">6-Digit Verification Code</label>
            <input 
              type="text" 
              className="input text-center" 
              style={{ fontSize: '1.25rem', letterSpacing: '0.25rem' }}
              value={code} 
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength="6"
              required
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="btn btn-ghost w-full" onClick={() => { setStep(1); setError(''); setMessage(''); }} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn btn-primary w-full" disabled={loading || code.length !== 6}>
              {action === 'reset_password' ? 'Continue' : (loading ? 'Verifying...' : 'Verify Email')}
            </button>
          </div>
        </form>
      )}

      {step === 3 && action === 'reset_password' && (
        <form onSubmit={handleSetNewPassword}>
          <div className="form-group">
            <label className="label">New Password</label>
            <input 
              type="password" 
              className="input" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength="6"
              required
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="btn btn-ghost w-full" onClick={() => { setStep(2); setError(''); setMessage(''); }} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn btn-primary w-full" disabled={loading || newPassword.length < 6}>
              {loading ? 'Resetting...' : 'Set New Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
