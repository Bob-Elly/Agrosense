// server/routes/command.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/command
//
// Sends a control command to a specific ESP32 device.
// The command is written to Firestore; the device polls this document
// on its next cellular check-in and acts on pending commands.
//
// Expected JSON body:
//   {
//     "deviceId": "esp32-node-01",
//     "action":   "irrigate",    // e.g. "irrigate" | "stop" | "reboot"
//     "payload":  { "durationSeconds": 120 }  // optional action-specific data
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { db }    from '../config/firebaseAdmin.js'

const router = Router()

// Allowed command actions — extend this list as your firmware supports more
const VALID_ACTIONS = ['irrigate', 'stop', 'reboot', 'sleep', 'calibrate']

router.post('/', async (req, res, next) => {
  try {
    const { deviceId, action, payload = {} } = req.body

    // Validate required fields
    if (!deviceId || !action) {
      return res.status(400).json({
        error: 'deviceId and action are required.',
      })
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      })
    }

    const command = {
      deviceId,
      action,
      payload,
      status:    'pending',  // device updates this to "ack" or "done"
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Write the command to Firestore under commands/{deviceId}/queue/{auto-id}
    // The ESP32 reads from this sub-collection when it connects
    const docRef = await db
      .collection('commands')
      .doc(deviceId)
      .collection('queue')
      .add(command)

    return res.status(201).json({
      message:   `Command "${action}" queued for device ${deviceId}.`,
      commandId: docRef.id,
    })
  } catch (err) {
    next(err)
  }
})

export default router
