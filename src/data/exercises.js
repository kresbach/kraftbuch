// Standard-Übungen, die jede Installation mitbringt.
// `type` steuert die Eingabe: 'weight' = Gewicht × Wiederholungen,
// 'bodyweight' = Wiederholungen (optional Zusatzgewicht).

export const MUSCLE_GROUPS = ['Beine', 'Brust', 'Rücken', 'Schultern', 'Arme', 'Rumpf'];

export const DEFAULT_EXERCISES = [
  { id: 'kniebeuge', name: 'Kniebeuge', group: 'Beine', type: 'weight' },
  { id: 'kreuzheben', name: 'Kreuzheben', group: 'Rücken', type: 'weight' },
  { id: 'rum-kreuzheben', name: 'Rumänisches Kreuzheben', group: 'Beine', type: 'weight' },
  { id: 'beinpresse', name: 'Beinpresse', group: 'Beine', type: 'weight' },
  { id: 'ausfallschritte', name: 'Ausfallschritte', group: 'Beine', type: 'weight' },
  { id: 'hip-thrust', name: 'Hip Thrust', group: 'Beine', type: 'weight' },
  { id: 'wadenheben', name: 'Wadenheben', group: 'Beine', type: 'weight' },
  { id: 'bankdruecken', name: 'Bankdrücken', group: 'Brust', type: 'weight' },
  { id: 'schraegbank', name: 'Schrägbankdrücken (Kurzhantel)', group: 'Brust', type: 'weight' },
  { id: 'dips', name: 'Dips', group: 'Brust', type: 'bodyweight' },
  { id: 'liegestuetze', name: 'Liegestütze', group: 'Brust', type: 'bodyweight' },
  { id: 'klimmzuege', name: 'Klimmzüge', group: 'Rücken', type: 'bodyweight' },
  { id: 'lh-rudern', name: 'Langhantelrudern', group: 'Rücken', type: 'weight' },
  { id: 'latzug', name: 'Latzug', group: 'Rücken', type: 'weight' },
  { id: 'kabelrudern', name: 'Kabelrudern', group: 'Rücken', type: 'weight' },
  { id: 'schulterdruecken', name: 'Schulterdrücken (Langhantel)', group: 'Schultern', type: 'weight' },
  { id: 'seitheben', name: 'Seitheben', group: 'Schultern', type: 'weight' },
  { id: 'face-pulls', name: 'Face Pulls', group: 'Schultern', type: 'weight' },
  { id: 'bizepscurls', name: 'Bizepscurls', group: 'Arme', type: 'weight' },
  { id: 'hammercurls', name: 'Hammercurls', group: 'Arme', type: 'weight' },
  { id: 'trizepsdruecken', name: 'Trizepsdrücken am Kabel', group: 'Arme', type: 'weight' },
  { id: 'plank', name: 'Unterarmstütz (Sekunden)', group: 'Rumpf', type: 'bodyweight' },
  { id: 'beinheben', name: 'Hängendes Beinheben', group: 'Rumpf', type: 'bodyweight' },
];
