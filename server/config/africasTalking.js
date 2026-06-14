// server/config/africasTalking.js
// ─────────────────────────────────────────────────────────────────────────────
// Africa's Talking SDK configuration.
// Provides an SMS client used as a fallback notification channel when
// internet connectivity is unreliable (common in remote IoT deployments).
// ─────────────────────────────────────────────────────────────────────────────

import AfricasTalking from 'africastalking'

const credentials = {
  apiKey:   process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
}

// Initialise the Africa's Talking client with your API credentials
const AT = AfricasTalking(credentials)

// Export the SMS service — used in routes that need to send text messages
export const sms = AT.SMS

export default AT
