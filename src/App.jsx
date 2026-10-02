import { useState } from 'react';
import { useStore } from './state/store.jsx';
import TrainingView from './views/TrainingView.jsx';
import PlansView from './views/PlansView.jsx';
import ExercisesView from './views/ExercisesView.jsx';
import HistoryView from './views/HistoryView.jsx';
import SettingsView from './views/SettingsView.jsx';
import { Icon } from './components/Icon.jsx';
import { useI18n } from './i18n/index.jsx';

const TABS = [
  { id: 'training', label: 'tab.training', icon: 'dumbbell', View: TrainingView },
  { id: 'plans', label: 'tab.plans', icon: 'list', View: PlansView },
  { id: 'exercises', label: 'tab.exercises', icon: 'book', View: ExercisesView },
  { id: 'history', label: 'tab.history', icon: 'chart', View: HistoryView },
  { id: 'settings', label: 'tab.settings', icon: 'settings', View: SettingsView },
];

export default function App() {
  const [tab, setTab] = useState('training');
  const { state } = useStore();
  const { t } = useI18n();
  const { View } = TABS.find((x) => x.id === tab);

  return (
    <div className="app">
      <main className="content">
        <View goTo={setTab} />
      </main>
      <nav className="tabbar" aria-label={t('tab.nav')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tab ${tab === item.id ? 'is-active' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <span className="tab-icon">
              <Icon name={item.icon} />
              {item.id === 'training' && state.activeWorkout && <span className="tab-dot" aria-label={t('tab.running')} />}
            </span>
            {t(item.label)}
          </button>
        ))}
      </nav>
    </div>
  );
}
