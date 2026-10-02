import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

// Pausen-Countdown nach einem erledigten Satz.
export function RestTimer({ endsAt, total, onChange }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (left === 0) navigator.vibrate?.([200, 100, 200]);
  }, [left === 0]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const progress = Math.min(1, Math.max(0, left / total));

  return (
    <div className={`rest ${left === 0 ? 'is-over' : ''}`} role="timer" aria-live="polite">
      <div className="rest-bar" style={{ transform: `scaleX(${progress})` }} />
      <Icon name="timer" size={20} />
      <span className="rest-label">{left === 0 ? 'Pause vorbei' : 'Pause'}</span>
      <span className="rest-time num">{mm}:{ss}</span>
      <button className="btn btn-small" onClick={() => onChange(endsAt + 15000)}>+15 s</button>
      <button className="btn btn-small" onClick={() => onChange(null)}>{left === 0 ? 'OK' : 'Überspringen'}</button>
    </div>
  );
}
