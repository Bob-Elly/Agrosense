// server/index.js
// ─────────────────────────────────────────────────────────────────────────────
// AgroSense Express server entry point
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import express from 'express'
import cors    from 'cors'
import morgan  from 'morgan'

// ── Route handlers ───────────────────────────────────────────────────────────
import telemetryRouter  from './routes/telemetry.js'
import commandRouter    from './routes/command.js'
import historyRouter    from './routes/history.js'
import suggestionsRouter from './routes/suggestions.js'
import authRouter       from './routes/auth.js'

// ── Firebase Admin initialisation (side-effect import) ───────────────────────
import './config/firebaseAdmin.js'

const app  = express()
const PORT = process.env.PORT || 5000

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://agrosense-jet.vercel.app',
  process.env.CLIENT_ORIGIN,
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(morgan('dev'))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/telemetry',   telemetryRouter)    // POST — receive ESP32 sensor data
app.use('/api/command',     commandRouter)      // POST — send commands to devices
app.use('/api/history',     historyRouter)      // GET  — historical readings
app.use('/api/suggestions', suggestionsRouter)  // GET  — AI crop recommendations
app.use('/api/auth',        authRouter)         // POST — auth verification codes

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'AgroSense API is running 🌱' })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  AgroSense server running on http://localhost:${PORT}`)
})
