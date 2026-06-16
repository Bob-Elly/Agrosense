// server/routes/telemetry.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/telemetry
//
// Called by ESP32 nodes (over GSM/cellular) to submit sensor readings.
// Expected JSON body:
//   {
//     "deviceId":    "esp32-node-01",
//     "moisture":    42.5,        // soil moisture (%)
//     "temperature": 28.3,        // temperature (°C)
//     "humidity":    65.1,        // relative humidity (%)
//     "nitrogen":    85,          // N content (mg/kg)
//     "phosphorus":  32,          // P content (mg/kg)
//     "potassium":   180,         // K content (mg/kg)
//     "ph":          6.2,         // soil pH
//     "batteryMv":   3720,        // battery voltage (mV)
//     "rssi":        -78,         // cellular signal strength (dBm)
//     "timestamp":   "2024-06-01T10:00:00Z"  // ISO 8601 (optional)
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { db }    from '../config/firebaseAdmin.js'
import { processTelemetryAlerts } from '../services/notifications.js'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const {
      deviceId,
      moisture,
      temperature,
      humidity,
      nitrogen,
      phosphorus,
      potassium,
      ph,
      batteryMv,
      rssi,
    } = req.body

    // Basic validation
    if (!deviceId || moisture === undefined) {
      return res.status(400).json({
        error: 'deviceId and moisture are required fields.',
      })
    }

    // Helper to safely parse optional numeric fields
    const num = (v) => (v !== undefined && v !== null ? Number(v) : null)

    const reading = {
      deviceId,
      moisture:    Number(moisture),
      temperature: num(temperature),
      humidity:    num(humidity),
      nitrogen:    num(nitrogen),
      phosphorus:  num(phosphorus),
      potassium:   num(potassium),
      ph:          num(ph),
      batteryMv:   num(batteryMv),
      rssi:        num(rssi),
      timestamp:   req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
      receivedAt:  new Date(),
    }

    // Save to Firestore: telemetry/{deviceId}/readings/{auto-id}
    const docRef = await db
      .collection('telemetry')
      .doc(deviceId)
      .collection('readings')
      .add(reading)

    // Update device summary document (last reading + last seen)
    await db.collection('devices').doc(deviceId).set(
      {
        deviceId,
        lastReading: reading,
        updatedAt:   new Date(),
        status:      'online',
      },
      { merge: true }
    )

    // Process alerts asynchronously (don't block response)
    processTelemetryAlerts(deviceId, reading).catch(err => {
      console.error('Failed to process telemetry alerts:', err)
    })

    return res.status(201).json({
      message:   'Telemetry recorded successfully.',
      readingId: docRef.id,
    })
  } catch (err) {
    next(err)
  }
})

export default router
