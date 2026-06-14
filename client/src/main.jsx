// client/src/main.jsx
// Entry point for the React application.
// Sets up React Router and renders the top-level <App /> component.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter provides routing context to the entire app */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
