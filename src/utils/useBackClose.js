// Zurück-Taste (Android, Browser, Wischgeste) schließt zuerst das oberste offene Fenster bzw. den
// Editor, statt die App zu verlassen. Jedes geöffnete Element legt dazu einen Verlaufseintrag an;
// wird es anders geschlossen (Tippen auf ×), entfernt es seinen Eintrag wieder.
import { useEffect, useRef } from 'react';

let depth = 0;
// Scrollposition verwaltet die App selbst (je Tab); sonst springt der Browser beim Zurück dazwischen
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

export function useBackClose(onClose, active = true) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!active) return;
    const mine = ++depth;
    history.pushState({ kraftbuch: mine }, '');
    let closedByBack = false;
    const onPop = (e) => {
      if (closedByBack || (e.state?.kraftbuch ?? 0) >= mine) return;
      closedByBack = true;
      close.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      depth = mine - 1;
      if (!closedByBack && history.state?.kraftbuch === mine) history.back();
    };
  }, [active]);
}
