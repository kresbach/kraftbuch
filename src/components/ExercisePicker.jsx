import { useMemo, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../data/exercises.js';
import { useStore } from '../state/store.jsx';
import { Sheet } from './Sheet.jsx';
import { Icon } from './Icon.jsx';

// Auswahl einer Übung mit Suche und Filter nach Muskelgruppe.
export function ExercisePicker({ onPick, onClose, title = 'Übung hinzufügen' }) {
  const { exercises } = useStore();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(null);
  const [equipment, setEquipment] = useState(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises.values()]
      .filter((e) => (!group || e.group === group) && (!equipment || e.equipment === equipment) && matchesQuery(e, q))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [exercises, query, group, equipment]);

  return (
    <Sheet title={title} onClose={onClose}>
      <label className="search">
        <Icon name="search" size={18} />
        <input id="picker-search" type="search" placeholder="Übung suchen" value={query}
          onChange={(e) => setQuery(e.target.value)} autoFocus />
      </label>
      <div className="chips" role="group" aria-label="Muskelgruppe">
        <button className={`chip ${!group ? 'is-on' : ''}`} onClick={() => setGroup(null)}>Alle</button>
        {MUSCLE_GROUPS.map((g) => (
          <button key={g} className={`chip ${group === g ? 'is-on' : ''}`} onClick={() => setGroup(g)}>{g}</button>
        ))}
      </div>
      <EquipmentFilter value={equipment} onChange={setEquipment} />
      <ul className="pick-list">
        {list.map((e) => (
          <li key={e.id}>
            <button className="pick-item" onClick={() => onPick(e.id)}>
              <span>{e.name}</span>
              <span className="muted small">{[e.group, e.equipment].filter(Boolean).join(' · ')}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted empty-line">Keine Übung gefunden. Unter „Übungen“ kannst du eigene anlegen.</li>}
      </ul>
    </Sheet>
  );
}

/** Suche über Name und Gerät (z. B. „maschine“ findet alle Maschinenübungen). */
export function matchesQuery(e, q) {
  return !q || e.name.toLowerCase().includes(q) || (e.equipment ?? '').toLowerCase().includes(q);
}

/** Filterzeile nach Gerät: Maschine, Kabelzug, Langhantel … */
export function EquipmentFilter({ value, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Gerät">
      <span className="chips-label">Gerät</span>
      <button className={`chip ${!value ? 'is-on' : ''}`} onClick={() => onChange(null)}>Alle</button>
      {EQUIPMENT.map((g) => (
        <button key={g} className={`chip ${value === g ? 'is-on' : ''}`} onClick={() => onChange(value === g ? null : g)}>{g}</button>
      ))}
    </div>
  );
}
