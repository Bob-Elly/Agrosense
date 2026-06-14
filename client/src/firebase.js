// client/src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase client-side configuration.
//
// HOW TO GET THESE VALUES:
//   1. Go to https://console.firebase.google.com
//   2. Open your project → Project Settings → General
//   3. Scroll to "Your apps" and select your web app (or create one)
//   4. Copy the firebaseConfig object values into your .env file
//
// ⚠️  NEVER hard-code real API keys here. Use environment variables instead.
//     In Vite, all env variables must be prefixed with VITE_ to be exposed
//     to the browser bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Read config values from Vite environment variables (defined in client/.env)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize the Firebase app (only once — Vite's module system ensures this)
const app = initializeApp(firebaseConfig)

// Export individual Firebase services so other files can import them directly
export const auth = getAuth(app)       // Firebase Authentication
export const db   = getFirestore(app)  // Cloud Firestore database

export default app
