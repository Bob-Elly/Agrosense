// server/routes/notifications.js
import express from 'express'
import { sendEmailNotification } from '../services/notifications.js'
import admin, { db } from '../config/firebaseAdmin.js'

const router = express.Router()

/**
 * POST /api/notifications/node-linked
 * Body: { email: string, deviceId: string, label: string }
 */
router.post('/node-linked', async (req, res) => {
  const { email, deviceId, label } = req.body

  if (!email || !deviceId) {
    return res.status(400).json({ error: 'Email and deviceId are required.' })
  }

  try {
    const nodeName = label || deviceId
    const subject = `AgroSense: New Node Linked (${nodeName})`
    const text = `Hello,\n\nThis is a confirmation that a new ESP32 sensor node has been successfully linked to your AgroSense account.\n\nNode Name: ${nodeName}\nDevice ID: ${deviceId}\n\nYou can now manage this node from your dashboard.\n\n- AgroSense`
    
    // Always send the confirmation email for node linking, regardless of telemetry alert preferences
    await sendEmailNotification(email, subject, text)

    res.json({ message: 'Notification processed.' })
  } catch (error) {
    console.error('Error sending node-linked notification:', error)
    res.status(500).json({ error: 'Failed to send notification.' })
  }
})

export default router
