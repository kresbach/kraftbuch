import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { uid } from '../utils/training.js';

export default function PlansView({ goTo }) {
  const { state, dispatch, exercises } = useStore();
  const [editing, setEditing] = useState(null); // Plan-Entwurf oder null

  if (editing) {
    return (
      <PlanEditor
        draft={editing}
        isNew={!state.plans.some((p) => p.id === editing.id)}
        onCancel={() => setEditing(null)}
        onSave={(plan) => {
          dispatch({ type: 'plan/save', plan });
          setEditing(null);
        }}
        onDelete={() => {
          dispatch({ type: 'plan/delete', id: editing.id });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{state.plans.length} {state.plans.length === 1 ? 'Plan' : 'Pläne'}</p>
        <h1>Meine Pläne</h1>
      </header>

      <button className="btn btn-primary btn-block" onClick={() => setEditing({ id: uid(), name: '', exercises: [] })}>
        <Icon name="plus" size={18} /> Neuen Plan erstellen
      </button>

      <ul className="cards section">
        {state.plans.map((plan) => (
          <li key={plan.id} className="card">
            <button className="card-button" onClick={() => setEditing(structuredClone(plan))}>
              <h3>{plan.name}</h3>
              <ol className="plan-lines">
                {plan.exercises.map((pe, i) => (
                  <li key={i}>
                    <span>{exercises.get(pe.exerciseId)?.name ?? 'Unbekannte Übung'}</span>
                    <span className="num muted">{pe.sets} × {pe.reps}</span>
                  </li>
                ))}
              </ol>
              <span className="link small">Bearbeiten</span>
            </button>
            <div className="card-foot">
              <button
                className="btn btn-small"
                onClick={() => {
                  dispatch({ type: 'workout/start', planId: plan.id });
                  goTo('training');
                }}
                disabled={!!state.activeWorkout}
              >
                <Icon name="play" size={16} /> Starten
              </button>
            </div>
          </li>
        ))}
      </ul>
      {state.activeWorkout && <p className="muted small center">Ein Training läuft gerade. Schließe es ab, bevor du einen neuen Plan startest.</p>}
    </>
  );
}

function PlanEditor({ draft, isNew, onSave, onCancel, onDelete }) {
  const { exercises } = useStore();
  const [plan, setPlan] = useState(draft);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  const setLine = (i, patch) =>
    setPlan((p) => ({ ...p, exercises: p.exercises.map((pe, j) => (j === i ? { ...pe, ...patch } : pe)) }));
  const move = (i, dir) =>
    setPlan((p) => {
      const list = [...p.exercises];
      [list[i], list[i + dir]] = [list[i + dir], list[i]];
      return { ...p, exercises: list };
    });
  const remove = (i) => setPlan((p) => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }));

  function save(e) {
    e.preventDefault();
    if (!plan.name.trim()) return setError('Gib dem Plan einen Namen, z. B. „Push-Tag“.');
    if (plan.exercises.length === 0) return setError('Füge mindestens eine Übung hinzu.');
    onSave({ ...plan, name: plan.name.trim() });
  }

  return (
    <form onSubmit={save}>
      <header className="page-head">
        <button type="button" className="back" onClick={onCancel}><Icon name="back" size={18} /> Pläne</button>
        <h1>{isNew ? 'Neuer Plan' : 'Plan bearbeiten'}</h1>
      </header>

      <label className="field">
        <span className="field-label">Name des Plans</span>
        <input id="plan-name" className="text-input" value={plan.name} placeholder="z. B. Oberkörper, Push, Tag A"
          onChange={(e) => { setPlan({ ...plan, name: e.target.value }); setError(''); }} />
      </label>

      <section className="section">
        <h2>Übungen</h2>
        {plan.exercises.length === 0 && <p className="muted">Noch keine Übungen. Füge unten die erste hinzu.</p>}
        <ul className="editor-list">
          {plan.exercises.map((pe, i) => (
            <li key={i} className="card editor-line">
              <div className="editor-line-top">
                <span className="editor-no num">{i + 1}</span>
                <strong>{exercises.get(pe.exerciseId)?.name ?? 'Unbekannte Übung'}</strong>
                <div className="editor-tools">
                  <button type="button" className="icon-btn" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={18} /></button>
                  <button type="button" className="icon-btn" aria-label="Nach unten" disabled={i === plan.exercises.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={18} /></button>
                  <button type="button" className="icon-btn danger" aria-label="Übung entfernen" onClick={() => remove(i)}><Icon name="trash" size={18} /></button>
                </div>
              </div>
              <div className="steppers">
                <Stepper id={`plan-${i}-sets`} label="Sätze" value={pe.sets} min={1} max={10} onChange={(v) => setLine(i, { sets: v })} />
                <Stepper id={`plan-${i}-reps`} label="Wdh" value={pe.reps} min={1} max={100} onChange={(v) => setLine(i, { reps: v })} />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Übung hinzufügen
        </button>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="finish">
        <button type="submit" className="btn btn-primary btn-block"><Icon name="check" size={18} /> Plan speichern</button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>Abbrechen</button>
        {!isNew && (
          <ConfirmButton className="btn btn-ghost danger btn-block" confirmLabel="Ja, Plan löschen" onConfirm={onDelete}>
            Plan löschen
          </ConfirmButton>
        )}
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(exerciseId) => {
            setPlan((p) => ({ ...p, exercises: [...p.exercises, { exerciseId, sets: 3, reps: 8 }] }));
            setPicking(false);
            setError('');
          }}
        />
      )}
    </form>
  );
}

function Stepper({ id, label, value, min, max, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, v || min));
  return (
    <div className="stepper">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="stepper-box">
        <button type="button" aria-label={`${label} verringern`} onClick={() => onChange(clamp(value - 1))}>−</button>
        <input id={id} className="num" inputMode="numeric" value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))} />
        <button type="button" aria-label={`${label} erhöhen`} onClick={() => onChange(clamp(value + 1))}>+</button>
      </div>
    </div>
  );
}
