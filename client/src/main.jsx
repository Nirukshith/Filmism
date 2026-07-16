import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TasteProvider } from './context/TasteContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TasteProvider>
      <App />
    </TasteProvider>
  </StrictMode>,
)

