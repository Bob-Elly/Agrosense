// server/config/firebaseAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
// Initialises the Firebase Admin SDK.
// Supports two auth strategies, in order of priority:
//   1. Individual env vars (cloud-friendly):
//      FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   2. Legacy service account JSON file (local dev):
//      FIREBASE_SERVICE_ACCOUNT_PATH
// ─────────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let credential

// ── Strategy 1: Individual environment variables (preferred for cloud) ────────
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  credential = admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID.trim(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
    // Cloud providers often escape newlines in env vars — unescape them
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim(),
  })
  console.log('🔥  Firebase Admin SDK initialised (env vars)')

// ── Strategy 2: Service account JSON file (local dev fallback) ────────────────
} else {
  const serviceAccountPath = resolve(
    __dirname,
    '..',
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json'
  )

  let serviceAccount
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  } catch (err) {
    console.error(
      '❌  Could not load Firebase credentials.',
      '\n   Either set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
      '\n   or ensure FIREBASE_SERVICE_ACCOUNT_PATH points to a valid JSON file.',
      '\n   Error:', err.message
    )
    process.exit(1)
  }

  credential = admin.credential.cert(serviceAccount)
  console.log('🔥  Firebase Admin SDK initialised (service account file)')
}

// Initialise the Admin SDK — guard against re-initialisation
if (!admin.apps.length) {
  admin.initializeApp({ credential })
}

// Export the Firestore instance so route files can import it directly
export const db = admin.firestore()
export default admin
