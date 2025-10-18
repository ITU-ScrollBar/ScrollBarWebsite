import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@ant-design/v5-patch-for-react-19';

import { AuthProvider } from './contexts/AuthContext'; // Adjust path
import { EventProvider } from './contexts/EventContext.tsx';
import { TenderProvider } from './contexts/TenderContext.tsx';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <AuthProvider>
      <EventProvider>
        <TenderProvider>
          <App />
        </TenderProvider>
      </EventProvider>
    </AuthProvider>
  </StrictMode>,
)
