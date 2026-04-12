import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProfileStoreProvider } from './store/profileStore.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileStoreProvider>
      <App />
    </ProfileStoreProvider>
  </StrictMode>,
)
