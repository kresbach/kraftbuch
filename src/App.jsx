import { useState } from 'react';
import { useStore } from './state/store.jsx';
import TrainingView from './views/TrainingView.jsx';
import PlansView from './views/PlansView.jsx';
import ExercisesView from './views/ExercisesView.jsx';
import HistoryView from './views/HistoryView.jsx';
import { Icon } from './components/Icon.jsx';

const TABS = [
  { id: 'training', label: 'Training', icon: 'dumbbell', View: TrainingView },
  { id: 'plans', label: 'Pläne', icon: 'list', View: PlansView },
  { id: 'exercises', label: 'Übungen', icon: 'book', View: ExercisesView },
  { id: 'history', label: 'Verlauf', icon: 'chart', View: HistoryView },
];

export default function App() {
  const [tab, setTab] = useState('training');
  const { state } = useStore();
  const { View } = TABS.find((t) => t.id === tab);

  return (
    <div className="app">
      <main className="content">
        <View goTo={setTab} />
      </main>
      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">
              <Icon name={t.icon} />
              {t.id === 'training' && state.activeWorkout && <span className="tab-dot" aria-label="Training läuft" />}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
