import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';

// Löschen ohne Nachfrage, dafür einige Sekunden lang „Rückgängig“.
// `withUndo(meldung, aktion, teile)` merkt sich die betroffenen Teile des Zustands vor der Aktion.
const UndoContext = createContext(null);
const SHOW_MS = 6000;

export function UndoProvider({ children }) {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const [toast, setToast] = useState(null);
  const latest = useRef(state);
  latest.current = state;

  const withUndo = useCallback((message, action, keys) => {
    const snapshot = Object.fromEntries(keys.map((k) => [k, latest.current[k]]));
    dispatch(action);
    setToast({ message, snapshot, id: Date.now() });
  }, [dispatch]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <UndoContext.Provider value={withUndo}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          <button type="button" className="btn btn-small" onClick={() => { dispatch({ type: 'undo/restore', snapshot: toast.snapshot }); setToast(null); }}>
            {t('undo.undo')}
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);
