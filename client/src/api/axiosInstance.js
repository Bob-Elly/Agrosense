// client/src/api/axiosInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared Axios instance pre-configured with the backend base URL.
// Import this instead of raw `axios` in every component so that:
//   • Base URL is set once from the environment variable
//   • You can add global interceptors here (e.g., attach auth tokens)
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 10000, // 10 seconds — important for unreliable cellular connections
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ───────────────────────────────────────────────────
// Attach the Firebase ID token (if present) to every outgoing request.
// This lets the server verify the caller is an authenticated user.
api.interceptors.request.use(
  async (config) => {
    // Lazily import auth to avoid circular dependency
    const { auth } = await import('../firebase.js')
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──────────────────────────────────────────────────
// Centralised error logging — extend this to show toast notifications, etc.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
