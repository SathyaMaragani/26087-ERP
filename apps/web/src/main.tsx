import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/tokens.css'
import './design/base.css'
import './design/ui.css'
import './design/credentials.css'
import './design/features.css'
import './design/atlas.css'
import './design/dashboard.css'
import './design/network.css'
import './design/command-center.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline-capable app shell: production builds only, so development stays predictable.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* offline shell is optional */ }); });
}
