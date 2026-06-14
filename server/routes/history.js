// server/routes/history.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history
//
// Returns historical telemetry readings for a given device and time range.
//
// Query parameters:
//   ?deviceId=esp32-node-01          (required)
//   &limit=50                        (optional, default: 50, max: 200)
//   &from=2024-06-01T00:00:00Z       (optional ISO 8601 start date)
//   &to=2024-06-30T23:59:59Z         (optional ISO 8601 end date)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { db }    from '../config/firebaseAdmin.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const { deviceId, from, to, limit } = req.query

    // deviceId is mandatory
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query parameter is required.' })
    }

    // Parse and clamp the limit (prevent overly large queries)
    const MAX_LIMIT = 200
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, MAX_LIMIT)

    // Start building the Firestore query
    let query = db
      .collection('telemetry')
      .doc(deviceId)
      .collection('readings')
      .orderBy('timestamp', 'desc') // newest first

    // Apply optional date filters
    if (from) {
      const fromDate = new Date(from)
      if (isNaN(fromDate)) {
        return res.status(400).json({ error: '"from" is not a valid ISO 8601 date.' })
      }
      query = query.where('timestamp', '>=', fromDate)
    }

    if (to) {
      const toDate = new Date(to)
      if (isNaN(toDate)) {
        return res.status(400).json({ error: '"to" is not a valid ISO 8601 date.' })
      }
      query = query.where('timestamp', '<=', toDate)
    }

    query = query.limit(parsedLimit)

    const snapshot = await query.get()

    // Map Firestore documents to plain JS objects
    const readings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to ISO strings for easy use in the frontend
      timestamp:  doc.data().timestamp?.toDate?.().toISOString()  ?? doc.data().timestamp,
      receivedAt: doc.data().receivedAt?.toDate?.().toISOString() ?? doc.data().receivedAt,
    }))

    return res.json({
      deviceId,
      count:    readings.length,
      readings,
    })
  } catch (err) {
    next(err)
  }
})

export default router
