import { useState } from 'react';
import { cleanKg, fmtInput, getUnit, inputToKg, kgToInput } from '../utils/training.js';

/**
 * Gewichtsfeld: zeigt und nimmt Werte in der gewählten Einheit (kg/lb) entgegen, speichert aber kg.
 * In lb wird beim Tippen der eigene Text behalten (sonst würde „22,“ durch die Umrechnung zu „22“).
 */
export function WeightInput({ value, onChange, ...props }) {
  const [draft, setDraft] = useState(null); // Text während der Eingabe (nur lb)
  const lb = getUnit() === 'lb';
  // Übernommene Werte sind Zahlen (z. B. 77.5) – mit Dezimalkomma der Sprache anzeigen; Getipptes bleibt Text
  const shown = lb ? draft ?? kgToInput(value === '' || value == null ? '' : String(value))
    : typeof value === 'number' ? fmtInput(value) : value;
  return (
    <input {...props} inputMode="decimal" value={shown}
      onFocus={() => lb && setDraft(kgToInput(value === '' || value == null ? '' : String(value)))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const text = cleanKg(e.target.value);
        if (text == null) return;
        if (lb) setDraft(text);
        onChange(inputToKg(text));
      }} />
  );
}
