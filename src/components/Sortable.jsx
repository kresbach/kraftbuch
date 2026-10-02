// Umsortieren per Drag & Drop mit Pointer-Events – funktioniert mit Finger (iOS/Android) und Maus.
// Gezogen wird nur am Griff; die übrigen Einträge rutschen sichtbar zur Seite.
// Am Bildschirmrand scrollt die Seite mit. Tastatur: Pfeil hoch/runter am Griff.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

export { moveItem } from '../utils/moveItem.js';

const EDGE = 90; // Abstand zum Rand, ab dem beim Ziehen gescrollt wird (px)

export function useSortable(onMove) {
  const items = useRef([]);
  const handles = useRef([]);
  const drag = useRef(null);
  const focusAfterMove = useRef(null);
  const [view, setView] = useState(null); // {from, to, dy, shift}

  // Nach einem Verschieben per Tastatur den Griff des verschobenen Eintrags fokussieren
  useEffect(() => {
    if (focusAfterMove.current == null) return;
    handles.current[focusAfterMove.current]?.focus();
    focusAfterMove.current = null;
  });

  useEffect(() => () => end(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  function update() {
    const d = drag.current;
    if (!d) return;
    const dy = d.lastClientY + window.scrollY - d.startPageY;
    const r = d.rects[d.from];
    const center = r.top + dy + r.height / 2;
    let to = d.from;
    for (let i = d.from + 1; i < d.rects.length; i++) if (center > d.rects[i].top + d.rects[i].height / 2) to = i;
    for (let i = d.from - 1; i >= 0; i--) if (center < d.rects[i].top + d.rects[i].height / 2) to = i;
    d.to = to;
    setView({ from: d.from, to, dy, shift: r.height + d.gap });
  }

  function autoScroll() {
    const d = drag.current;
    if (!d) return;
    const y = d.lastClientY;
    const bottom = window.innerHeight - EDGE - 70; // Tab-Leiste berücksichtigen
    const v = y < EDGE ? -Math.ceil((EDGE - y) / 8) : y > bottom ? Math.ceil((y - bottom) / 8) : 0;
    if (v) {
      window.scrollBy(0, v);
      update();
    }
    d.raf = requestAnimationFrame(autoScroll);
  }

  function end(commit) {
    const d = drag.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    drag.current = null;
    document.body.classList.remove('is-sorting');
    setView(null);
    if (commit && d.to !== d.from) onMove(d.from, d.to);
  }

  function handleProps(i, count) {
    return {
      ref: (el) => { handles.current[i] = el; },
      onPointerDown: (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const rects = items.current.slice(0, count).map((el) => {
          const b = el.getBoundingClientRect();
          return { top: b.top + window.scrollY, height: b.height };
        });
        const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].top - rects[0].height) : 0;
        drag.current = { from: i, to: i, startPageY: e.clientY + window.scrollY, lastClientY: e.clientY, rects, gap };
        document.body.classList.add('is-sorting');
        setView({ from: i, to: i, dy: 0, shift: 0 });
        drag.current.raf = requestAnimationFrame(autoScroll);
      },
      onPointerMove: (e) => {
        if (!drag.current) return;
        drag.current.lastClientY = e.clientY;
        update();
      },
      onPointerUp: () => end(true),
      onPointerCancel: () => end(false),
      onKeyDown: (e) => {
        const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
        if (to == null || to < 0 || to >= count) return;
        e.preventDefault();
        focusAfterMove.current = to;
        onMove(i, to);
      },
    };
  }

  function itemProps(i) {
    let transform;
    let className = '';
    if (view) {
      const { from, to, dy, shift } = view;
      if (i === from) {
        transform = `translateY(${dy}px)`;
        className = 'is-dragging';
      } else if (from < to && i > from && i <= to) transform = `translateY(${-shift}px)`;
      else if (to < from && i >= to && i < from) transform = `translateY(${shift}px)`;
      if (i !== from) className = 'is-shifting';
    }
    return { ref: (el) => { items.current[i] = el; }, className, style: transform ? { transform } : undefined };
  }

  return { handleProps, itemProps, dragging: !!view };
}

/** Griff zum Ziehen (⠿). */
export function DragHandle({ label, ...props }) {
  return (
    <button type="button" className="drag-handle" aria-label={label} title={label} {...props}>
      <Icon name="grip" size={20} strokeWidth={3} />
    </button>
  );
}
