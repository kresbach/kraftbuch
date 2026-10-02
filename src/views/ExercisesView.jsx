import { useMemo, useState } from 'react';
import { MUSCLE_GROUPS } from '../data/exercises.js';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { estimate1RM, fmtNum } from '../utils/training.js';

export default function ExercisesView() {
  const { state, dispatch, exercises } = useStore();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  // Bestwerte je Übung aus dem Verlauf
  const bests = useMemo(() => {
    const map = new Map();
    for (const w of state.workouts)
      for (const ex of w.exercises)
        for (const s of ex.sets) {
          const cur = map.get(ex.exerciseId) ?? { e1rm: 0, reps: 0 };
          map.set(ex.exerciseId, { e1rm: Math.max(cur.e1rm, estimate1RM(s.kg, s.reps)), reps: Math.max(cur.reps, s.reps) });
        }
    return map;
  }, [state.workouts]);

  const q = query.trim().toLowerCase();
  const all = [...exercises.values()].filter((e) => !q || e.name.toLowerCase().includes(q));

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{exercises.size} Übungen</p>
        <h1>Übungen</h1>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input id="exercise-search" type="search" placeholder="Übung suchen" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Eigene</button>
      </div>

      {MUSCLE_GROUPS.map((group) => {
        const list = all.filter((e) => e.group === group).sort((a, b) => a.name.localeCompare(b.name, 'de'));
        if (list.length === 0) return null;
        return (
          <section key={group} className="section">
            <h2 className="group-title">{group}</h2>
            <ul className="list">
              {list.map((e) => {
                const best = bests.get(e.id);
                return (
                  <li key={e.id} className="list-item">
                    <div className="list-main">
                      <span>{e.name} {e.custom && <span className="pill pill-muted">Eigene</span>}</span>
                      <span className="muted small">
                        {e.type === 'bodyweight' ? 'Körpergewicht' : 'Mit Gewicht'}
                        {best && (best.e1rm > 0 ? ` · Bestwert ≈ ${fmtNum(Math.round(best.e1rm))} kg (1RM)` : ` · Bestwert ${best.reps} Wdh`)}
                      </span>
                    </div>
                    {e.custom && (
                      <ConfirmButton className="icon-btn danger" confirmLabel="Löschen?" onConfirm={() => dispatch({ type: 'exercise/delete', id: e.id })}>
                        <Icon name="trash" size={18} />
                      </ConfirmButton>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {all.length === 0 && <p className="muted section">Keine Übung gefunden. Lege sie mit „Eigene“ an.</p>}

      {adding && <AddExercise initialName={query} onClose={() => setAdding(false)} onSave={(exercise) => { dispatch({ type: 'exercise/add', exercise }); setAdding(false); }} />}
    </>
  );
}

function AddExercise({ initialName, onSave, onClose }) {
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState(MUSCLE_GROUPS[0]);
  const [type, setType] = useState('weight');
  const [error, setError] = useState('');

  return (
    <Sheet title="Eigene Übung" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError('Bitte gib einen Namen ein.');
          onSave({ name: name.trim(), group, type });
        }}
      >
        <label className="field">
          <span className="field-label">Name</span>
          <input id="new-exercise-name" className="text-input" value={name} autoFocus placeholder="z. B. Front Squat"
            onChange={(e) => { setName(e.target.value); setError(''); }} />
        </label>
        <fieldset className="field">
          <legend className="field-label">Muskelgruppe</legend>
          <div className="chips">
            {MUSCLE_GROUPS.map((g) => (
              <button type="button" key={g} className={`chip ${group === g ? 'is-on' : ''}`} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend className="field-label">Art</legend>
          <div className="segmented">
            <button type="button" className={type === 'weight' ? 'is-on' : ''} onClick={() => setType('weight')}>Mit Gewicht</button>
            <button type="button" className={type === 'bodyweight' ? 'is-on' : ''} onClick={() => setType('bodyweight')}>Körpergewicht</button>
          </div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block">Übung speichern</button>
      </form>
    </Sheet>
  );
}
