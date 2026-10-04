import { useEffect, useMemo, useRef, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../data/exercises.js';
import { EquipmentFilter, matchesQuery } from '../components/ExercisePicker.jsx';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Icon } from '../components/Icon.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { useUndo } from '../components/Undo.jsx';
import { estimate1RM, fmtNum } from '../utils/training.js';

export default function ExercisesView() {
  const { state, dispatch, exercises } = useStore();
  const i18n = useI18n();
  const { t, exName, group: groupName, equip } = i18n;
  const withUndo = useUndo();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const searchBar = useRef(null);

  // Suchleiste an den oberen Rand holen, damit die Treffer über der Tastatur sichtbar sind
  const pinSearchBar = () => {
    const el = searchBar.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(el).top) || 0);
    if (Math.abs(window.scrollY - top) > 2) window.scrollTo({ top, behavior: 'smooth' });
  };
  useEffect(() => { if (query) pinSearchBar(); }, [query]);

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
  const all = [...exercises.values()].filter((e) => (!equipment || e.equipment === equipment) && matchesQuery(e, q, i18n));

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{t('exercises.count', { n: exercises.size })}</p>
        <h1>{t('exercises.title')}</h1>
      </header>

      <div className="search-sticky" ref={searchBar}>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={18} />
            <input id="exercise-search" type="search" enterKeyHint="search" placeholder={t('exercise.search')} value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setTimeout(pinSearchBar, 350) /* nach dem Einblenden der Tastatur */}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
          </label>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> {t('exercises.custom')}</button>
        </div>
        <EquipmentFilter value={equipment} onChange={setEquipment} />
      </div>

      <div className={`groups ${query ? 'is-searching' : ''}`}>
      {MUSCLE_GROUPS.map((group) => {
        const list = all.filter((e) => e.group === group).sort((a, b) => i18n.compare(exName(a), exName(b)));
        if (list.length === 0) return null;
        return (
          <section key={group} className="section">
            <h2 className="group-title">{groupName(group)}</h2>
            <ul className="list">
              {list.map((e) => {
                const best = bests.get(e.id);
                return (
                  <li key={e.id} className="list-item">
                    <div className="list-main">
                      <span>{exName(e)} {e.custom && <span className="pill pill-muted">{t('exercises.customBadge')}</span>}</span>
                      <span className="muted small">
                        {e.equipment ? equip(e.equipment) : t(e.type === 'bodyweight' ? 'exercises.bodyweight' : 'exercises.weighted')}
                        {best && (best.e1rm > 0
                          ? ` · ${t('exercises.best1rm', { kg: fmtNum(Math.round(best.e1rm)) })}`
                          : ` · ${t('exercises.bestReps', { reps: best.reps })}`)}
                      </span>
                    </div>
                    {e.custom && (
                      <button className="icon-btn danger" aria-label={t('exercises.delete')} onClick={() => {
                        const inPlans = state.plans.filter((p) => p.exercises.some((pe) => pe.exerciseId === e.id)).length;
                        withUndo(t(inPlans ? 'undo.exerciseDeletedPlans' : 'undo.exerciseDeleted', { name: exName(e), n: inPlans }),
                          { type: 'exercise/delete', id: e.id }, ['customExercises', 'plans']);
                      }}>
                        <Icon name="trash" size={18} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      </div>
      {all.length === 0 && <p className="muted section">{t('exercises.empty')}</p>}

      {adding && <AddExercise initialName={query} onClose={() => setAdding(false)} onSave={(exercise) => { dispatch({ type: 'exercise/add', exercise }); setAdding(false); }} />}
    </>
  );
}

function AddExercise({ initialName, onSave, onClose }) {
  const { t, group: groupName, equip, exName } = useI18n();
  const { exercises } = useStore();
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState(MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState('Maschine');
  const [error, setError] = useState('');

  return (
    <Sheet title={t('addExercise.title')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError(t('addExercise.nameMissing'));
          const lower = name.trim().toLowerCase();
          const twin = [...exercises.values()].find((x) => [x.name, x.en, exName(x)].some((n) => n?.trim().toLowerCase() === lower));
          if (twin) return setError(t('addExercise.duplicate', { name: exName(twin) }));
          onSave({ name: name.trim(), group, equipment, type: equipment === 'Körpergewicht' ? 'bodyweight' : 'weight' });
        }}
      >
        <label className="field">
          <span className="field-label">{t('addExercise.name')}</span>
          <input id="new-exercise-name" className="text-input" value={name} autoFocus placeholder={t('addExercise.placeholder')}
            onChange={(e) => { setName(e.target.value); setError(''); }} />
        </label>
        <fieldset className="field">
          <legend className="field-label">{t('exercise.muscleGroup')}</legend>
          <div className="chips">
            {MUSCLE_GROUPS.map((g) => (
              <button type="button" key={g} className={`chip ${group === g ? 'is-on' : ''}`} onClick={() => setGroup(g)}>{groupName(g)}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend className="field-label">{t('exercise.equipment')}</legend>
          <div className="chips">
            {EQUIPMENT.map((g) => (
              <button type="button" key={g} className={`chip ${equipment === g ? 'is-on' : ''}`} onClick={() => setEquipment(g)}>{equip(g)}</button>
            ))}
          </div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block">{t('addExercise.save')}</button>
      </form>
    </Sheet>
  );
}
