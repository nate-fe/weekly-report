import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './App.css'
import App from './App.jsx'
import { TeamAccessProvider } from './context/TeamAccessContext.jsx'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <TeamAccessProvider>
        <App />
      </TeamAccessProvider>
    </BrowserRouter>
  </StrictMode>,
)
