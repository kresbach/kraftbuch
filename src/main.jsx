import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { StoreProvider } from './state/store.jsx';
import './index.css';

// Service Worker: App offline verfügbar machen und Updates automatisch laden.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
