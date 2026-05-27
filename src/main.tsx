import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from '@/contexts/UserContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* UserProvider wraps the whole tree so the AppRouter guards can
        read `currentUser` to decide between onboarding and app routes. */}
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>,
)
