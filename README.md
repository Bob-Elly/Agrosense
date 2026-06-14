# 🌱 AgroSense

A **mobile-first** soil monitoring and irrigation control dashboard for remote IoT systems using ESP32 nodes communicating over GSM/cellular.

---

## Project Structure

```
Agrosense/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js     # Configured Axios instance
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx   # Auth-guard for protected pages
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Firebase auth state provider + useAuth hook
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── LinkDevice.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Analytics.jsx
│   │   ├── App.jsx                  # Route definitions
│   │   ├── firebase.js              # Firebase client config (auth + db)
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Global styles + design tokens
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example                 # Copy to .env and fill in Firebase values
│   └── package.json
│
└── server/                  # Node.js + Express backend
    ├── config/
    │   ├── firebaseAdmin.js         # Firebase Admin SDK initialisation
    │   └── africasTalking.js        # Africa's Talking SMS client
    ├── routes/
    │   ├── telemetry.js             # POST /api/telemetry
    │   ├── command.js               # POST /api/command
    │   └── history.js               # GET  /api/history
    ├── index.js                     # Express server entry point
    ├── .env.example                 # Copy to .env and fill in real credentials
    └── package.json
```

---

## Quick Start

### 1. Configure environment variables

```bash
# Frontend
cp client/.env.example client/.env
# Fill in your Firebase web app config values

# Backend
cp server/.env.example server/.env
# Fill in Firebase Admin, Africa's Talking credentials
```

### 2. Add Firebase service account

- Go to Firebase Console → Project Settings → Service Accounts
- Click **"Generate new private key"** and save as `server/serviceAccountKey.json`
- ⚠️ Never commit this file — it's in `.gitignore`

### 3. Install dependencies

```bash
# Frontend
cd client && npm install

# Backend
cd ../server && npm install
```

### 4. Run locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client && npm run dev
```

---

## API Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/api/telemetry`  | Receive sensor data from ESP32 nodes |
| POST   | `/api/command`    | Queue control commands for devices   |
| GET    | `/api/history`    | Fetch historical readings            |

### Telemetry payload (from ESP32)
```json
{
  "deviceId":    "esp32-node-01",
  "moisture":    42.5,
  "temperature": 28.3,
  "humidity":    65.1,
  "batteryMv":   3720
}
```

### Command payload
```json
{
  "deviceId": "esp32-node-01",
  "action":   "irrigate",
  "payload":  { "durationSeconds": 120 }
}
```

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite + React Router v6 |
| Auth       | Firebase Authentication           |
| Database   | Cloud Firestore (real-time)       |
| HTTP       | Axios                             |
| Backend    | Node.js + Express                 |
| Admin SDK  | Firebase Admin SDK                |
| SMS        | Africa's Talking                  |
| Env vars   | dotenv                            |
