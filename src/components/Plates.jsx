import { platesPerSide } from '../utils/training.js';

// Zeigt, welche Scheiben pro Seite auf die Stange gehören.
export function Plates({ kg, bar }) {
  const plates = platesPerSide(Number(kg), bar);
  if (!plates) return null;
  return (
    <span className="plates" title={`Pro Seite bei ${bar}-kg-Stange`}>
      {plates.map((p, i) => (
        <span key={i} className="plate" style={{ '--plate': p.color, '--h': `${10 + Math.min(p.kg, 25) * 0.6}px` }}>
          {String(p.kg).replace('.', ',')}
        </span>
      ))}
    </span>
  );
}
