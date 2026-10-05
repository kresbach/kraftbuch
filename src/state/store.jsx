// Stellt den Zustand per Context bereit und speichert ihn lokal auf dem Gerät.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { exerciseMap, initialState, normalizeData, rootReducer } from './reducer.js';

const STORAGE_KEY = 'kraftbuch:v1';
const StoreContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { ...initialState, ...data, ...normalizeData(data), updatedAt: Number(data?.updatedAt) || 0 };
    }
  } catch {
    // Kein Zugriff auf den Speicher (z. B. privater Modus): mit Startzustand weiter.
  }
  return initialState;
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Speichern fehlgeschlagen – Daten bleiben bis zum Schließen im Speicher.
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, load);

  // Speichern gebündelt: nicht bei jedem Tastendruck den ganzen Zustand serialisieren, sondern
  // kurz nach der letzten Änderung – und sofort, wenn die App in den Hintergrund geht.
  const latest = useRef(state);
  latest.current = state;
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist(latest.current);
    }, 400);
  }, [state]);
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current == null) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      persist(latest.current);
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

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
