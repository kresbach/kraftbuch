import { platesPerSide } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

// Zeigt, welche Scheiben pro Seite auf die Stange gehören.
export function Plates({ kg, bar }) {
  const { t, locale } = useI18n();
  const plates = platesPerSide(Number(kg), bar);
  if (!plates) return null;
  return (
    <span className="plates" title={t('plates.title', { bar })}>
      <span className="plates-label">{t('plates.perSide')}</span>
      {plates.map((p, i) => (
        <span key={i} className="plate" style={{ '--plate': p.color, '--h': `${10 + Math.min(p.kg, 25) * 0.6}px` }}>
          {p.kg.toLocaleString(locale)}
        </span>
      ))}
    </span>
  );
}
