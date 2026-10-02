import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// Zweistufiger Button für unwiderrufliche Aktionen: erst tippen, dann bestätigen.
export function ConfirmButton({ children, confirmLabel, onConfirm, className = 'btn btn-ghost danger' }) {
  const { t } = useI18n();
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
      {armed ? confirmLabel ?? t('common.reallyDelete') : children}
    </button>
  );
}
