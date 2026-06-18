// server/routes/auth.js
import express from 'express'
import { Resend } from 'resend'
import admin, { db } from '../config/firebaseAdmin.js'

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')

/**
 * POST /api/auth/send-verification-code
 * Body: { email: string, action: 'reset_password' | 'verify_email' }
 */
router.post('/send-verification-code', async (req, res) => {
  const { email, action } = req.body

  if (!email || !action) {
    return res.status(400).json({ error: 'Email and action are required.' })
  }

  try {
    // 1. Verify user exists
    let userRecord
    try {
      userRecord = await admin.auth().getUserByEmail(email)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // We still return 200 to prevent email enumeration attacks,
        // but we don't actually send an email or store a code.
        return res.json({ message: 'If this email is registered, a code has been sent.' })
      }
      throw err
    }

    // 2. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 3. Store code in Firestore with 10-minute expiry
    await db.collection('verificationCodes').doc(email).set({
      code,
      action,
      expiresAt: Date.now() + 10 * 60 * 1000
    })

    // 4. Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set. Check Firestore for the code during local testing.', code)
      // Return early in dev mode if no key (for testing without sending real emails)
      return res.json({ message: 'If this email is registered, a code has been sent.', devCode: code })
    }

    const subject = action === 'reset_password' 
      ? 'Your AgroSense Password Reset Code' 
      : 'Verify your AgroSense Email'

    const text = action === 'reset_password'
      ? `Hello,\n\nYour password reset code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.\n\n- AgroSense`
      : `Hello,\n\nWelcome to AgroSense! Your email verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\n- AgroSense`

    const { data, error: resendError } = await resend.emails.send({
      from: 'AgroSense <onboarding@resend.dev>',
      to: email,
      subject,
      text
    })

    if (resendError) {
      console.error('Resend API Error:', resendError)
      // Throw so it gets caught by the catch block
      throw new Error(`Resend Error: ${resendError.message}`)
    }

    res.json({ message: 'If this email is registered, a code has been sent.' })
  } catch (error) {
    console.error('Error sending verification code:', error)
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' })
  }
})

/**
 * POST /api/auth/verify-code
 * Body: { email: string, code: string, action: 'reset_password' | 'verify_email', newPassword?: string }
 */
router.post('/verify-code', async (req, res) => {
  const { email, code, action, newPassword } = req.body

  if (!email || !code || !action) {
    return res.status(400).json({ error: 'Email, code, and action are required.' })
  }

  if (action === 'reset_password' && (!newPassword || newPassword.length < 6)) {
    return res.status(400).json({ error: 'A new password of at least 6 characters is required.' })
  }

  try {
    // 1. Fetch code document
    const docRef = db.collection('verificationCodes').doc(email)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return res.status(400).json({ error: 'Invalid or expired code.' })
    }

    const data = docSnap.data()

    // 2. Validate code, action, and expiry
    if (data.code !== code || data.action !== action || Date.now() > data.expiresAt) {
      // Optional: count attempts and delete if too many
      return res.status(400).json({ error: 'Invalid or expired code.' })
    }

    // 3. Apply changes via Admin SDK
    const userRecord = await admin.auth().getUserByEmail(email)

    if (action === 'reset_password') {
      await admin.auth().updateUser(userRecord.uid, { password: newPassword })
    } else if (action === 'verify_email') {
      await admin.auth().updateUser(userRecord.uid, { emailVerified: true })
    }

    // 4. Delete the code document to prevent reuse
    await docRef.delete()

    res.json({ success: true, message: 'Verification successful.' })
  } catch (error) {
    console.error('Error verifying code:', error)
    res.status(500).json({ error: 'Failed to verify code. Please try again.' })
  }
})

export default router
