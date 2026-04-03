import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@ant-design/v5-patch-for-react-19';

import { AuthProvider } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext.tsx';
import { TenderProvider } from './contexts/TenderContext.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EventProvider>
        <TenderProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </TenderProvider>
      </EventProvider>
    </AuthProvider>
  </StrictMode>,
)
