import { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { muscleStats } from '../utils/stats.js';
import { fmtNum, fmtWeight } from '../utils/training.js';

// Zeiträume in Tagen
const PERIODS = [
  { days: 7, label: 'stats.week' },
  { days: 28, label: 'stats.month' },
  { days: 91, label: 'stats.quarter' },
  { days: Infinity, label: 'stats.all' },
];

/** „heute“, „gestern“, „vor 5 Tagen“ – nach Kalendertagen */
function daysAgo(ts, locale) {
  const startOf = (d) => new Date(d).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(Date.now()) - startOf(ts)) / 86400000);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
}

/* ---------- Sätze und Gewicht je Muskelgruppe ---------- */

export function MuscleStats() {
  const { state, exercises } = useStore();
  const { t, group: groupName, locale } = useI18n();
  const [days, setDays] = useState(28);

  const { rows, weeks } = useMemo(() => muscleStats(state.workouts, exercises, days), [state.workouts, exercises, days]);
  if (state.workouts.length === 0) return <p className="muted">{t('progress.empty')}</p>;

  const sorted = [...rows].sort((a, b) => b.sets - a.sets);
  const max = Math.max(1, ...rows.map((r) => r.sets));
  const total = rows.reduce((n, r) => n + r.sets, 0);

  return (
    <div className="muscle-stats">
      <div className="segmented segmented-small" role="radiogroup" aria-label={t('stats.period')}>
        {PERIODS.map((p) => (
          <button key={p.days} type="button" role="radio" aria-checked={days === p.days} className={days === p.days ? 'is-on' : ''} onClick={() => setDays(p.days)}>
            {t(p.label)}
          </button>
        ))}
      </div>
      <p className="muted small">{t('stats.explain', { n: fmtNum(total) })}</p>

      <ul className="card muscle-list">
        {sorted.map((r) => {
          const perWeek = Math.round((r.sets / weeks) * 10) / 10;
          const details = [
            r.sets && days !== 7 ? t('stats.perWeek', { n: fmtNum(perWeek) }) : null,
            r.volume > 0 ? fmtWeight(r.volume) : null,
            r.lastAt ? t('stats.last', { when: daysAgo(r.lastAt, locale) }) : t('stats.never'),
          ].filter(Boolean).join(' · ');
          return (
            <li key={r.group} className={`muscle-row ${r.sets ? '' : 'is-empty'}`}
              title={`${groupName(r.group)}: ${t('history.sets', { n: r.sets })} · ${details}`}>
              <div className="muscle-head">
                <strong>{groupName(r.group)}</strong>
                <span className="num">{r.sets ? t('history.sets', { n: r.sets }) : t('stats.none')}</span>
              </div>
              <span className="muscle-track" aria-hidden="true">
                <span className="muscle-bar" style={{ transform: `scaleX(${r.sets / max})` }} />
              </span>
              <span className="muted small">{details}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
