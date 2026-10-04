import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { StoreProvider } from './state/store.jsx';
import { CloudSyncProvider } from './cloud/CloudSync.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { UndoProvider } from './components/Undo.jsx';
import './index.css';
import { relocateIfMoved } from './utils/relocate.js';

// Service Worker: App offline verfügbar machen und Updates automatisch laden.
// Installierte Web-Apps (v. a. iOS) bleiben oft lange im Speicher und prüfen dann nicht von selbst
// auf Updates – deshalb beim Zurückkehren in die App und stündlich nachsehen. Eine neue Version
// wird übernommen und die Seite neu geladen (registerType: autoUpdate).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => navigator.onLine !== false && registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 60 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <I18nProvider>
        <CloudSyncProvider>
          <UndoProvider>
            <App />
          </UndoProvider>
        </CloudSyncProvider>
      </I18nProvider>
    </StoreProvider>
  </StrictMode>,
);

// Läuft die App noch unter der alten Adresse, zur neuen umziehen (Daten bleiben erhalten).
relocateIfMoved();
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && relocateIfMoved());
