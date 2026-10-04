import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

// Pausen-Countdown nach einem erledigten Satz.
export function RestTimer({ endsAt, total, onChange }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));

  // Nur vibrieren, wenn die Pause gerade abläuft – nicht beim erneuten Öffnen einer schon abgelaufenen
  const wasRunning = useRef(left > 0);
  useEffect(() => {
    if (left > 0) wasRunning.current = true;
    else if (wasRunning.current) {
      wasRunning.current = false;
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const progress = Math.min(1, Math.max(0, left / total));

  return (
    <div className={`rest ${left === 0 ? 'is-over' : ''}`} role="timer" aria-live="polite">
      <div className="rest-bar" style={{ transform: `scaleX(${progress})` }} />
      <Icon name="timer" size={20} />
      <span className="rest-label">{left === 0 ? t('rest.over') : t('rest.label')}</span>
      <span className="rest-time num">{mm}:{ss}</span>
      <button className="btn btn-small" onClick={() => onChange(endsAt + 15000)}>+15 s</button>
      <button className="btn btn-small" onClick={() => onChange(null)}>{left === 0 ? t('common.ok') : t('rest.skip')}</button>
    </div>
  );
}
