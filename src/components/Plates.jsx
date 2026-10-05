import { BAR_LB, PLATES_LB, getUnit, platesPerSide, toUnit } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

// Zeigt, welche Scheiben pro Seite auf die Stange gehören – in kg- oder lb-Scheiben je nach Einheit.
export function Plates({ kg, bar }) {
  const { t, locale } = useI18n();
  const lb = getUnit() === 'lb';
  const barShown = lb ? BAR_LB[bar] ?? 45 : bar;
  const total = lb ? Math.round(toUnit(Number(kg)) * 10) / 10 : Number(kg);
  const plates = platesPerSide(total, barShown, lb ? PLATES_LB : undefined);
  if (!plates) return null;
  return (
    <span className="plates" title={t('plates.title', { bar: `${barShown} ${getUnit()}` })}>
      <span className="plates-label">{t('plates.perSide')}</span>
      {plates.map((p, i) => (
        <span key={i} className="plate" style={{ '--plate': p.color, '--h': `${10 + Math.min(lb ? p.kg / 2 : p.kg, 25) * 0.6}px` }}>
          {p.kg.toLocaleString(locale)}
        </span>
      ))}
    </span>
  );
}
