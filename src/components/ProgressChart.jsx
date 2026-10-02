import { useEffect, useRef, useState } from 'react';
import { fmtNum, fmtShortDate } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

// Liniendiagramm: Wert je Trainingstag (z. B. geschätztes 1RM) über die Zeit.
export function ProgressChart({ points, unit = 'kg' }) {
  const { t } = useI18n();
  // In echter Pixelbreite zeichnen, damit Schrift und Linien auf großen Bildschirmen nicht mitwachsen
  const wrap = useRef(null);
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [points.length < 2]);

  if (points.length < 2) {
    return <p className="muted chart-empty">{t('progress.chartEmpty')}</p>;
  }
  const W = width, H = Math.round(Math.min(340, Math.max(180, W * 0.42))), L = 40, R = 14, T = 14, B = 26;
  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const step = niceStep((Math.max(...ys) - Math.min(...ys)) / 3 || 5);
  const y0 = Math.floor(Math.min(...ys) / step) * step;
  const y1 = Math.max(Math.ceil(Math.max(...ys) / step) * step, y0 + step);
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${sy(p.value).toFixed(1)}`).join('');
  const area = `${line}L${sx(x1).toFixed(1)},${sy(y0)}L${sx(x0).toFixed(1)},${sy(y0)}Z`;
  const last = points[points.length - 1];

  return (
    <div ref={wrap} className="chart-wrap">
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={t('progress.chartAria', { from: fmtNum(points[0].value), to: fmtNum(last.value), unit })}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="chart-grid" x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} />
          <text className="chart-label" x={L - 6} y={sy(v) + 4} textAnchor="end">{fmtNum(v)}</text>
        </g>
      ))}
      <text className="chart-label" x={L} y={H - 6}>{fmtShortDate(points[0].date)}</text>
      <text className="chart-label" x={W - R} y={H - 6} textAnchor="end">{fmtShortDate(last.date)}</text>
      <path className="chart-area" d={area} />
      <path className="chart-line" d={line} />
      {points.map((p, i) => (
        <circle key={i} className="chart-dot" cx={sx(xs[i])} cy={sy(p.value)} r={i === points.length - 1 ? 4.5 : 2.5} />
      ))}
    </svg>
    </div>
  );
}

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}
