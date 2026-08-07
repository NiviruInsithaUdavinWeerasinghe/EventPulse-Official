import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import AppRouter from './AppRouter.jsx'

// Intercept global fetch to dynamically prepend backend URL in production
if (import.meta.env.VITE_API_URL) {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    let url = input;
    if (typeof input === 'string' && input.startsWith('/api')) {
      url = `${import.meta.env.VITE_API_URL}${input}`;
    }
    return originalFetch(url, init);
  };
}


import { ThemeProvider } from './context/ThemeContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
