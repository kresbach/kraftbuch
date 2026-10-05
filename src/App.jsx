import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from './state/store.jsx';
import TrainingView from './views/TrainingView.jsx';
import PlansView from './views/PlansView.jsx';
import ExercisesView from './views/ExercisesView.jsx';
import HistoryView from './views/HistoryView.jsx';
import SettingsView from './views/SettingsView.jsx';
import { Icon } from './components/Icon.jsx';
import { useI18n } from './i18n/index.jsx';
import { useBackClose } from './utils/useBackClose.js';

const TABS = [
  { id: 'training', label: 'tab.training', icon: 'dumbbell', View: TrainingView, wide: true },
  { id: 'plans', label: 'tab.plans', icon: 'list', View: PlansView },
  { id: 'exercises', label: 'tab.exercises', icon: 'book', View: ExercisesView, wide: true },
  { id: 'history', label: 'tab.history', icon: 'chart', View: HistoryView, wide: true },
  { id: 'settings', label: 'tab.settings', icon: 'settings', View: SettingsView },
];

export default function App() {
  const [tab, setTabState] = useState('training');
  // Jeder Tab merkt sich seine Scrollposition; ein neu geöffneter Tab beginnt oben.
  const scrollPos = useRef({});
  const setTab = (next) => {
    if (next === tab) return window.scrollTo({ top: 0, behavior: 'smooth' });
    scrollPos.current[tab] = window.scrollY;
    setTabState(next);
  };
  useLayoutEffect(() => { window.scrollTo(0, scrollPos.current[tab] ?? 0); }, [tab]);
  const { state } = useStore();
  const { t } = useI18n();
  const { View, wide } = TABS.find((x) => x.id === tab);
  useHideTabbarWhileTyping();
  useBackClose(() => setTab('training'), tab !== 'training', { outer: true }); // Zurück führt von jedem Tab zum Training

  return (
    <div className="app">
      <main className={`content ${wide ? 'is-wide' : ''}`}>
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

// iOS schiebt unten angeheftete Leisten über die Bildschirmtastatur. Wie in nativen Apps wird die
// Tab-Leiste deshalb ausgeblendet, solange auf einem Touch-Gerät in ein Textfeld getippt wird.
const NO_KEYBOARD = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'];
const opensKeyboard = (el) =>
  el?.tagName === 'TEXTAREA' || (el?.tagName === 'INPUT' && !NO_KEYBOARD.includes(el.type)) || el?.isContentEditable;

function useHideTabbarWhileTyping() {
  useEffect(() => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const update = () => document.body.classList.toggle('keyboard-open', opensKeyboard(document.activeElement));
    const onFocusOut = () => setTimeout(update, 50); // Fokuswechsel zwischen Feldern abwarten
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onFocusOut);
      document.body.classList.remove('keyboard-open');
    };
  }, []);
}
