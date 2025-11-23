import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ListingProvider } from './store/useListingStore'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ListingProvider>
      <App />
    </ListingProvider>
  </StrictMode>,
)
