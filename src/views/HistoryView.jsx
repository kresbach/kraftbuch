import { useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ProgressChart } from '../components/ProgressChart.jsx';
import { estimate1RM, fmtDate, fmtDuration, fmtKg, fmtNum, workoutVolume } from '../utils/training.js';

const SECTIONS = [
  { id: 'list', label: 'Trainings' },
  { id: 'progress', label: 'Fortschritt' },
  { id: 'settings', label: 'Einstellungen' },
];

export default function HistoryView() {
  const [section, setSection] = useState('list');
  return (
    <>
      <header className="page-head">
        <h1>Verlauf</h1>
      </header>
      <div className="segmented" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'is-on' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="section">
        {section === 'list' && <WorkoutList />}
        {section === 'progress' && <Progress />}
        {section === 'settings' && <Settings />}
      </div>
    </>
  );
}

/* ---------- Liste der abgeschlossenen Trainings ---------- */

function WorkoutList() {
  const { state, dispatch, exercises } = useStore();
  const [open, setOpen] = useState(null);

  if (state.workouts.length === 0) {
    return <p className="muted">Noch keine abgeschlossenen Trainings. Starte unter „Training“ dein erstes – es erscheint danach hier.</p>;
  }

  return (
    <ul className="cards">
      {state.workouts.map((w) => {
        const isOpen = open === w.id;
        const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
        return (
          <li key={w.id} className="card">
            <button className="card-button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)}>
              <span className="eyebrow">{fmtDate(w.startedAt)}</span>
              <h3>{w.name}</h3>
              <span className="muted small num">
                {fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · {sets} Sätze · {fmtKg(Math.round(workoutVolume(w)))}
              </span>
            </button>
            {isOpen && (
              <div className="workout-detail">
                {w.exercises.map((ex, i) => (
                  <div key={i} className="detail-line">
                    <strong>{exercises.get(ex.exerciseId)?.name ?? 'Gelöschte Übung'}</strong>
                    <span className="muted num">{ex.sets.map((s) => (s.kg ? `${fmtNum(s.kg)} × ${s.reps}` : `${s.reps} Wdh`)).join(' · ')}</span>
                  </div>
                ))}
                <ConfirmButton className="btn btn-small btn-ghost danger" confirmLabel="Ja, Training löschen" onConfirm={() => dispatch({ type: 'history/delete', id: w.id })}>
                  <Icon name="trash" size={16} /> Training löschen
                </ConfirmButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Fortschritt je Übung ---------- */

function Progress() {
  const { state, exercises } = useStore();

  // Übungen, die im Verlauf vorkommen – die häufigste zuerst
  const trained = useMemo(() => {
    const count = new Map();
    for (const w of state.workouts) for (const ex of w.exercises) count.set(ex.exerciseId, (count.get(ex.exerciseId) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exercises.has(id));
  }, [state.workouts, exercises]);

  const [selected, setSelected] = useState(trained[0] ?? '');
  const exerciseId = trained.includes(selected) ? selected : trained[0];

  if (!exerciseId) {
    return <p className="muted">Sobald du Trainings abgeschlossen hast, siehst du hier, wie sich deine Leistung pro Übung entwickelt.</p>;
  }

  const info = exercises.get(exerciseId);
  const isBodyweight = info.type === 'bodyweight';
  const sessions = state.workouts
    .map((w) => ({ date: w.startedAt, sets: w.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? [] }))
    .filter((s) => s.sets.length)
    .reverse(); // älteste zuerst

  const points = sessions.map((s) => ({
    date: s.date,
    value: isBodyweight
      ? Math.max(...s.sets.map((x) => x.reps))
      : Math.round(Math.max(...s.sets.map((x) => estimate1RM(x.kg, x.reps))) * 10) / 10,
  }));
  const allSets = sessions.flatMap((s) => s.sets);
  const heaviest = allSets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a), allSets[0]);
  const best = Math.max(...points.map((p) => p.value));
  const first = points[0].value;

  return (
    <>
      <label className="field">
        <span className="field-label">Übung</span>
        <select id="progress-exercise" className="text-input" value={exerciseId} onChange={(e) => setSelected(e.target.value)}>
          {trained.map((id) => <option key={id} value={id}>{exercises.get(id).name}</option>)}
        </select>
      </label>

      <section className="stats">
        <div className="stat">
          <span className="stat-value num">{fmtNum(best)}</span>
          <span className="stat-label">{isBodyweight ? 'Meiste Wdh' : 'Bestes 1RM (geschätzt, kg)'}</span>
        </div>
        <div className="stat">
          <span className="stat-value num">{heaviest.kg ? `${fmtNum(heaviest.kg)}×${heaviest.reps}` : heaviest.reps}</span>
          <span className="stat-label">{isBodyweight ? 'Bester Satz' : 'Schwerster Satz'}</span>
        </div>
        <div className="stat">
          <span className={`stat-value num ${best > first ? 'up' : ''}`}>{best > first ? '+' : ''}{fmtNum(Math.round((best - first) * 10) / 10)}</span>
          <span className="stat-label">seit dem ersten Training</span>
        </div>
      </section>

      <div className="card chart-card">
        <h3 className="small muted">{isBodyweight ? 'Meiste Wiederholungen je Training' : 'Geschätztes 1RM je Training (Epley)'}</h3>
        <ProgressChart points={points} unit={isBodyweight ? 'Wdh' : 'kg'} />
      </div>
    </>
  );
}

/* ---------- Einstellungen & Datensicherung ---------- */

function Settings() {
  const { state, dispatch } = useStore();
  const fileRef = useRef(null);
  const [message, setMessage] = useState('');

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kraftbuch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage('Sicherung wurde als Datei gespeichert.');
  }

  async function importData(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.workouts) || !Array.isArray(data.plans)) throw new Error('format');
      dispatch({ type: 'data/import', data });
      setMessage(`Importiert: ${data.workouts.length} Trainings und ${data.plans.length} Pläne.`);
    } catch {
      setMessage('Diese Datei ist keine Kraftbuch-Sicherung. Wähle eine .json-Datei, die du hier exportiert hast.');
    }
  }

  return (
    <>
      <fieldset className="field">
        <legend className="field-label">Pausenzeit nach einem Satz</legend>
        <div className="segmented">
          {[60, 90, 120, 180].map((s) => (
            <button key={s} type="button" className={state.settings.restSeconds === s ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { restSeconds: s } })}>
              {s < 120 ? `${s} s` : `${s / 60} min`}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Gewicht der Langhantelstange (für die Scheibenanzeige)</legend>
        <div className="segmented">
          {[20, 15, 10].map((kg) => (
            <button key={kg} type="button" className={state.settings.barKg === kg ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { barKg: kg } })}>
              {kg} kg
            </button>
          ))}
        </div>
      </fieldset>

      <section className="section">
        <h2>Datensicherung</h2>
        <p className="muted small">
          Deine Daten liegen nur auf diesem Gerät im Browser. Sichere sie ab und zu als Datei, damit nichts verloren geht –
          etwa beim Löschen der Browserdaten oder beim Wechsel auf ein neues Handy.
        </p>
        <div className="row-actions">
          <button className="btn" onClick={exportData}>Daten exportieren</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Sicherung importieren</button>
          <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" hidden onChange={importData} />
        </div>
        {message && <p className="note" role="status">{message}</p>}
      </section>
    </>
  );
}
