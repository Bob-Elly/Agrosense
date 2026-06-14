// server/config/africasTalking.js
// ─────────────────────────────────────────────────────────────────────────────
// Africa's Talking SDK configuration.
// Provides an SMS client used as a fallback notification channel when
// internet connectivity is unreliable (common in remote IoT deployments).
// ─────────────────────────────────────────────────────────────────────────────

import AfricasTalking from 'africastalking'

const rawEnv = process.env.AT_ENVIRONMENT || ''
const rawUser = process.env.AT_USERNAME || ''
const rawKey = process.env.AT_API_KEY || ''

const username = rawEnv.trim() === 'sandbox' ? 'sandbox' : rawUser.trim()

const credentials = {
  apiKey:   rawKey.trim(),
  username: username,
}

// Initialise the Africa's Talking client with your API credentials
const AT = AfricasTalking(credentials)

// Export the SMS service — used in routes that need to send text messages
export const sms = AT.SMS

export default AT
