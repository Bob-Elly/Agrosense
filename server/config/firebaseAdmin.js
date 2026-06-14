// server/config/firebaseAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
// Initialises the Firebase Admin SDK.
// Import this file once (in index.js) as a side-effect — it does NOT export
// anything itself. Other files that need Firestore should import from this
// module only if they need the db instance directly, otherwise use
// getFirestore() from 'firebase-admin/firestore' after this runs.
// ─────────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to the service account JSON (relative to the server root)
const serviceAccountPath = resolve(
  __dirname,
  '..',
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json'
)

let serviceAccount
try {
  // Read and parse the service account key file
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch (err) {
  console.error(
    '❌  Could not load Firebase service account key.',
    '\n   Make sure FIREBASE_SERVICE_ACCOUNT_PATH in .env points to a valid file.',
    '\n   Error:', err.message
  )
  process.exit(1)
}

// Initialise the Admin SDK — calling this more than once causes an error,
// so we guard against re-initialisation (useful in testing environments).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  console.log('🔥  Firebase Admin SDK initialised')
}

// Export the Firestore instance so route files can import it directly
export const db = admin.firestore()
export default admin
