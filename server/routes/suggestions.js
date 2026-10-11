// server/routes/suggestions.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/suggestions/:deviceId
//
// Fetches the latest sensor readings for a device, looks up the crop's optimal
// ranges from the "cropProfiles" Firestore collection, builds a structured
// prompt, calls the Google Gemini API (gemini-1.5-flash), and returns the
// AI recommendation text.
// ─────────────────────────────────────────────────────────────────────────────

import { Router }               from 'express'
import { GoogleGenerativeAI }   from '@google/generative-ai'
import { db }                   from '../config/firebaseAdmin.js'
import { CROPS, getCropProfile } from '../data/crops.js'

const router = Router()

// Initialise the Gemini client — reads GEMINI_API_KEY from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

router.get('/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params

    // ── 1. Fetch the device document ─────────────────────────────────────────
    const deviceSnap = await db.collection('devices').doc(deviceId).get()
    if (!deviceSnap.exists) {
      return res.status(404).json({ error: `Device "${deviceId}" not found.` })
    }
    const device  = deviceSnap.data()
    const reading = device.lastReading

    if (!reading) {
      return res.status(404).json({
        error: 'No sensor readings available for this device yet.',
      })
    }

    // ── 1.5 Cache Check ────────────────────────────────────────────────────────
    const force = req.query.force === 'true'
    const lastSuggestion = device.lastSuggestion
    const suggestionTimestamp = device.suggestionTimestamp
    const lastReadingAt = reading.recordedAt

    let useCache = false
    if (!force && lastSuggestion && suggestionTimestamp) {
      const ageMs = Date.now() - new Date(suggestionTimestamp).getTime()
      const isUnder24h = ageMs < 24 * 60 * 60 * 1000
      const isNewerThanTelemetry = !lastReadingAt || (new Date(suggestionTimestamp) >= new Date(lastReadingAt))
      
      if (isUnder24h && isNewerThanTelemetry) {
        useCache = true
      }
    }

    if (useCache) {
      return res.json({
        deviceId,
        crop: device.crop || 'unknown',
        recommendation: lastSuggestion,
        generatedAt: suggestionTimestamp,
        cached: true
      })
    }

    // ── 2. Look up the crop profile from Firestore ────────────────────────────
    const crop = device.crop || 'unknown'
    let profile = null

    if (crop && crop !== 'unknown') {
      // Document ID = crop name lowercased, spaces → underscores, no parens
      const profileId   = crop.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
      const profileSnap = await db.collection('cropProfiles').doc(profileId).get()
      if (profileSnap.exists) {
        profile = profileSnap.data()
      }
      if (!profile) {
        profile = getCropProfile(crop)
      }
    }

    // ── 3. Build the prompt ───────────────────────────────────────────────────
    const label = device.label || deviceId
    const fmt   = (v, unit = '') => (v !== null && v !== undefined ? `${v}${unit}` : 'N/A')
    const range = (field) =>
      profile?.[field] ? `${profile[field].min}–${profile[field].max}` : 'no data'

    // Resolve N-P-K using instantaneous thresholds by default for active in-situ sensor detection
    const getNutrientBounds = (field) => {
      const shortKey = field === 'nitrogen' ? 'n' : field === 'phosphorus' ? 'p' : field === 'potassium' ? 'k' : field
      const inst = profile?.instantaneous
      if (inst) {
        if (inst[shortKey]) return inst[shortKey]
        if (inst[field]) return inst[field]
      }
      const fallbackCrop = getCropProfile(crop)
      if (fallbackCrop?.instantaneous?.[shortKey]) {
        return fallbackCrop.instantaneous[shortKey]
      }
      return profile?.[field] || null
    }

    const nutrientRange = (field) => {
      const bounds = getNutrientBounds(field)
      return bounds ? `${bounds.min}–${bounds.max}` : 'no data'
    }

    const prompt = `You are an expert agricultural advisor helping small-scale farmers in West Africa improve their crop yields.

DEVICE: ${label}
CROP: ${crop}

CURRENT SOIL SENSOR READINGS (RS485 7-IN-1 IN-SITU PROBE):
- Soil Moisture:  ${fmt(reading.moisture, '%')}
- Temperature:    ${fmt(reading.temperature, '°C')}
- Humidity:       ${fmt(reading.humidity, '%')}
- Nitrogen (N):   ${fmt(reading.nitrogen, ' mg/kg')}
- Phosphorus (P): ${fmt(reading.phosphorus, ' mg/kg')}
- Potassium (K):  ${fmt(reading.potassium, ' mg/kg')}
- Soil pH:        ${fmt(reading.ph)}

OPTIMAL RANGES FOR ${crop.toUpperCase()} (RS485 IN-SITU INSTANTANEOUS SENSOR THRESHOLDS):
- Soil Moisture:  ${range('moisture')}%
- pH:             ${range('ph')}
- Nitrogen (N):   ${nutrientRange('nitrogen')} mg/kg
- Phosphorus (P): ${nutrientRange('phosphorus')} mg/kg
- Potassium (K):  ${nutrientRange('potassium')} mg/kg

IMPORTANT SENSOR CALIBRATION CONTEXT:
The sensor installed is an RS485 7-in-1 multi-parameter probe measuring instantaneous ionic pore flux in-situ.
Under ambient soil moisture, instantaneous nutrient availability ranges between 2–24 mg/kg (unlike laboratory chemical extractable reserves which are 20–200 mg/kg).
Do NOT treat readings in the 2–10 mg/kg range as critically deficient or issue false starvation warnings if they match the instantaneous optimal thresholds above.

Based on the above, please provide:
1. A brief soil health assessment (2-3 sentences max).
2. Specific, actionable steps the farmer should take TODAY (3-5 bullet points).
3. One urgent warning if any parameter is critically out of range.

Guidelines:
- Write in simple, clear language a farmer can understand without technical expertise.
- Be practical — recommend locally available solutions (compost, lime, wood ash, etc.).
- Keep the total response under 200 words.
- Do NOT use markdown formatting like asterisks or bold text. Use plain text only.`

    // ── 4. Call the Gemini API ────────────────────────────────────────────────
    let result;
    try {
      result = await model.generateContent(prompt)
    } catch (apiErr) {
      if (apiErr.status === 503 || apiErr.message?.includes('503')) {
        console.warn('[Gemini 503] Retrying after 2 seconds...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        result = await model.generateContent(prompt)
      } else {
        throw apiErr
      }
    }
    let recommendation   = result.response.text()

    // Strip any remaining markdown asterisks just in case
    recommendation = recommendation.replace(/\*/g, '')

    const newTimestamp = new Date().toISOString()

    // ── 4.5 Save to Cache ────────────────────────────────────────────────────
    await db.collection('devices').doc(deviceId).update({
      lastSuggestion: recommendation,
      suggestionTimestamp: newTimestamp
    })

    // ── 5. Return the result ─────────────────────────────────────────────────
    return res.json({
      deviceId,
      crop,
      recommendation,
      generatedAt: newTimestamp,
      cached: false
    })
  } catch (err) {
    console.error('[Gemini Error]', err?.message || err)
    next(err)
  }
})

export default router
