// server/routes/command.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/command       — queue a command for an ESP32 device
// POST /api/command/ack   — ESP32 firmware calls this to confirm execution
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { db }    from '../config/firebaseAdmin.js'
import { sms }   from '../config/africasTalking.js'
import { createCommandNotification } from '../services/notifications.js'

const router = Router()

// Allowed command actions
const VALID_ACTIONS = ['irrigate', 'stop', 'reboot', 'sleep', 'calibrate', 'read']

// ── Helper: get the queue ref for a device ────────────────────────────────────
const queueRef = (deviceId) =>
  db.collection('commands').doc(deviceId).collection('queue')

// ── POST /api/command ─────────────────────────────────────────────────────────
// If the client passes a `commandId`, it means the client pre-created the
// Firestore document (so it could start listening before the server responds).
// The server then writes to that specific document instead of creating a new one.
router.post('/', async (req, res, next) => {
  try {
    const { deviceId, commandId, action, payload = {} } = req.body

    if (!deviceId || !action) {
      return res.status(400).json({ error: 'deviceId and action are required.' })
    }
    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Allowed: ${VALID_ACTIONS.join(', ')}`,
      })
    }

    const command = {
      deviceId,
      action,
      payload,
      status:    'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // ── Check device online status and simNumber ─────────────────────────────
    const deviceSnap = await db.collection('devices').doc(deviceId).get()
    if (!deviceSnap.exists) {
      return res.status(404).json({ error: `Device ${deviceId} not found.` })
    }
    const device = deviceSnap.data()

    const now = Date.now()
    const lastSeen = device.updatedAt ? device.updatedAt.toDate().getTime() : 0
    const isOffline = (now - lastSeen) > 5 * 60 * 1000

    let useSmsFallback = false
    if (isOffline) {
      if (!device.simNumber) {
        return res.status(400).json({ error: 'Device offline and no SIM number configured for SMS fallback' })
      }
      useSmsFallback = true
      command.status = 'sms_fallback'
    }

    let docId
    if (commandId) {
      // Client pre-created the doc — update it so the server's timestamp is set
      await queueRef(deviceId).doc(commandId).set(command, { merge: true })
      docId = commandId
    } else {
      // Server creates the doc (legacy / non-tracked commands)
      const docRef = await queueRef(deviceId).add(command)
      docId = docRef.id
    }

    // ── Trigger SMS Fallback if needed ───────────────────────────────────────
    if (useSmsFallback) {
      let smsMessage = ''
      if (action === 'irrigate') {
        smsMessage = `CMD:IRRIGATE:${payload.duration || 30}`
      } else if (action === 'read') {
        smsMessage = `CMD:GET_READINGS`
      } else {
        smsMessage = `CMD:${action.toUpperCase()}`
      }

      try {
        await sms.send({
          to: [device.simNumber],
          message: smsMessage,
          enque: true
        })

        // Notify
        createCommandNotification(deviceId, action, 'sms_fallback').catch(console.error)

        return res.status(201).json({
          message: `Command "${action}" queued for ${deviceId}. Device offline, SMS sent.`,
          commandId: docId,
          status: 'sms_fallback'
        })
      } catch (smsError) {
        console.error('[SMS Error]', smsError)
        await queueRef(deviceId).doc(docId).update({
          status: 'failed',
          error: 'SMS fallback failed',
          updatedAt: new Date()
        })
        return res.status(500).json({ error: 'Failed to send SMS fallback' })
      }
    }

    // Notify
    createCommandNotification(deviceId, action, 'sent').catch(console.error)

    return res.status(201).json({
      message:   `Command "${action}" queued for ${deviceId}.`,
      commandId: docId,
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/command/ack ─────────────────────────────────────────────────────
// Called by the ESP32 firmware over GSM after it has executed (or failed) a
// command. Updates the Firestore command document status, which the client's
// onSnapshot listener picks up in real-time.
//
// Expected JSON body:
//   {
//     "deviceId":   "esp32-node-01",
//     "commandId":  "<Firestore doc ID>",
//     "success":     true              // optional, default true
//   }
router.post('/ack', async (req, res, next) => {
  try {
    const { deviceId, commandId, success = true } = req.body

    if (!deviceId || !commandId) {
      return res.status(400).json({ error: 'deviceId and commandId are required.' })
    }

    const newStatus = success ? 'acknowledged' : 'failed'

    await queueRef(deviceId).doc(commandId).update({
      status:          newStatus,
      acknowledgedAt:  new Date(),
      updatedAt:       new Date(),
    })

    console.log(`[ACK] Device: ${deviceId} | Command: ${commandId} | Status: ${newStatus}`)

    // Notify
    const actionSnap = await queueRef(deviceId).doc(commandId).get()
    const action = actionSnap.exists ? actionSnap.data().action : 'unknown'
    createCommandNotification(deviceId, action, newStatus).catch(console.error)

    return res.json({
      success:   true,
      commandId,
      status:    newStatus,
    })
  } catch (err) {
    next(err)
  }
})

export default router
