import { useEffect, useState } from 'react';

// Zweistufiger Button für unwiderrufliche Aktionen: erst tippen, dann bestätigen.
export function ConfirmButton({ children, confirmLabel = 'Wirklich löschen?', onConfirm, className = 'btn btn-ghost danger' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={`${className} ${armed ? 'is-armed' : ''}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
