// Stellt den Zustand per Context bereit und speichert ihn lokal auf dem Gerät.
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { exerciseMap, initialState, rootReducer } from './reducer.js';

const STORAGE_KEY = 'kraftbuch:v1';
const StoreContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) };
  } catch {
    // Kein Zugriff auf den Speicher (z. B. privater Modus): mit Startzustand weiter.
  }
  return initialState;
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Speichern fehlgeschlagen – Daten bleiben bis zum Schließen im Speicher.
    }
  }, [state]);

  // Browser bitten, die Daten nicht automatisch zu löschen (wichtig unter iOS).
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const exercises = useMemo(() => exerciseMap(state), [state.customExercises]);
  const value = useMemo(() => ({ state, dispatch, exercises }), [state, exercises]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
