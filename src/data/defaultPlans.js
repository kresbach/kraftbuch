// Beispielpläne für den ersten Start. Sie lassen sich bearbeiten oder löschen.
export const DEFAULT_PLANS = [
  {
    id: 'plan-ganzkoerper-a',
    name: 'Ganzkörper A',
    exercises: [
      { exerciseId: 'kniebeuge', sets: 3, reps: 5 },
      { exerciseId: 'bankdruecken', sets: 3, reps: 5 },
      { exerciseId: 'lh-rudern', sets: 3, reps: 8 },
      { exerciseId: 'plank', sets: 3, reps: 45 },
    ],
  },
  {
    id: 'plan-ganzkoerper-b',
    name: 'Ganzkörper B',
    exercises: [
      { exerciseId: 'kreuzheben', sets: 1, reps: 5 },
      { exerciseId: 'schulterdruecken', sets: 3, reps: 5 },
      { exerciseId: 'klimmzuege', sets: 3, reps: 8 },
      { exerciseId: 'ausfallschritte', sets: 3, reps: 10 },
    ],
  },
];
