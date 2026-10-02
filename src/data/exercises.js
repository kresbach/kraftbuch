// Standard-Übungen, die jede Installation mitbringt.
// `equipment` bestimmt Anzeige und Filter; `type` steuert die Eingabe:
// 'weight' = Gewicht × Wiederholungen, 'bodyweight' = Wiederholungen (optional Zusatzgewicht).
// IDs nie ändern – Pläne und Verlauf verweisen darauf.

export const MUSCLE_GROUPS = ['Beine', 'Brust', 'Rücken', 'Schultern', 'Arme', 'Rumpf'];
export const EQUIPMENT = ['Maschine', 'Kabelzug', 'Langhantel', 'Kurzhantel', 'Körpergewicht'];

const ex = (id, name, group, equipment) => ({
  id,
  name,
  group,
  equipment,
  type: equipment === 'Körpergewicht' ? 'bodyweight' : 'weight',
});

export const DEFAULT_EXERCISES = [
  // ---- Beine ----
  ex('kniebeuge', 'Kniebeuge', 'Beine', 'Langhantel'),
  ex('frontkniebeuge', 'Frontkniebeuge', 'Beine', 'Langhantel'),
  ex('rum-kreuzheben', 'Rumänisches Kreuzheben', 'Beine', 'Langhantel'),
  ex('hip-thrust', 'Hip Thrust', 'Beine', 'Langhantel'),
  ex('ausfallschritte', 'Ausfallschritte', 'Beine', 'Kurzhantel'),
  ex('bulgarische-kniebeuge', 'Bulgarische Split-Kniebeuge', 'Beine', 'Kurzhantel'),
  ex('beinpresse', 'Beinpresse', 'Beine', 'Maschine'),
  ex('m-beinstrecker', 'Beinstrecker (Maschine)', 'Beine', 'Maschine'),
  ex('m-beincurl-liegend', 'Beinbeuger liegend (Maschine)', 'Beine', 'Maschine'),
  ex('m-beincurl-sitzend', 'Beinbeuger sitzend (Maschine)', 'Beine', 'Maschine'),
  ex('m-hackenschmidt', 'Hackenschmidt-Kniebeuge (Maschine)', 'Beine', 'Maschine'),
  ex('m-smith-kniebeuge', 'Kniebeuge an der Multipresse', 'Beine', 'Maschine'),
  ex('m-abduktoren', 'Abduktoren (Maschine)', 'Beine', 'Maschine'),
  ex('m-adduktoren', 'Adduktoren (Maschine)', 'Beine', 'Maschine'),
  ex('m-glute-kickback', 'Gesäß-Kickback (Maschine)', 'Beine', 'Maschine'),
  ex('wadenheben', 'Wadenheben stehend (Maschine)', 'Beine', 'Maschine'),
  ex('m-wadenheben-sitzend', 'Wadenheben sitzend (Maschine)', 'Beine', 'Maschine'),

  // ---- Brust ----
  ex('bankdruecken', 'Bankdrücken', 'Brust', 'Langhantel'),
  ex('kh-bankdruecken', 'Bankdrücken (Kurzhantel)', 'Brust', 'Kurzhantel'),
  ex('schraegbank', 'Schrägbankdrücken (Kurzhantel)', 'Brust', 'Kurzhantel'),
  ex('kh-fliegende', 'Fliegende (Kurzhantel)', 'Brust', 'Kurzhantel'),
  ex('m-brustpresse', 'Brustpresse (Maschine)', 'Brust', 'Maschine'),
  ex('m-brustpresse-schraeg', 'Schrägbank-Brustpresse (Maschine)', 'Brust', 'Maschine'),
  ex('m-butterfly', 'Butterfly (Maschine)', 'Brust', 'Maschine'),
  ex('m-smith-bankdruecken', 'Bankdrücken an der Multipresse', 'Brust', 'Maschine'),
  ex('kabel-crossover', 'Kabelzug-Crossover', 'Brust', 'Kabelzug'),
  ex('dips', 'Dips', 'Brust', 'Körpergewicht'),
  ex('liegestuetze', 'Liegestütze', 'Brust', 'Körpergewicht'),

  // ---- Rücken ----
  ex('kreuzheben', 'Kreuzheben', 'Rücken', 'Langhantel'),
  ex('lh-rudern', 'Langhantelrudern', 'Rücken', 'Langhantel'),
  ex('kh-rudern', 'Einarmiges Rudern (Kurzhantel)', 'Rücken', 'Kurzhantel'),
  ex('latzug', 'Latzug', 'Rücken', 'Maschine'),
  ex('m-latzug-eng', 'Latzug eng (Maschine)', 'Rücken', 'Maschine'),
  ex('m-rudern-sitzend', 'Rudern sitzend (Maschine)', 'Rücken', 'Maschine'),
  ex('m-tbar-rudern', 'T-Bar-Rudern (Maschine)', 'Rücken', 'Maschine'),
  ex('m-pullover', 'Pullover (Maschine)', 'Rücken', 'Maschine'),
  ex('m-rueckenstrecker', 'Rückenstrecker (Maschine)', 'Rücken', 'Maschine'),
  ex('kabelrudern', 'Kabelrudern', 'Rücken', 'Kabelzug'),
  ex('klimmzuege', 'Klimmzüge', 'Rücken', 'Körpergewicht'),
  ex('kh-shrugs', 'Shrugs (Kurzhantel)', 'Rücken', 'Kurzhantel'),

  // ---- Schultern ----
  ex('schulterdruecken', 'Schulterdrücken (Langhantel)', 'Schultern', 'Langhantel'),
  ex('kh-schulterdruecken', 'Schulterdrücken (Kurzhantel)', 'Schultern', 'Kurzhantel'),
  ex('arnold-press', 'Arnold Press', 'Schultern', 'Kurzhantel'),
  ex('seitheben', 'Seitheben', 'Schultern', 'Kurzhantel'),
  ex('m-schulterpresse', 'Schulterpresse (Maschine)', 'Schultern', 'Maschine'),
  ex('m-seitheben', 'Seitheben (Maschine)', 'Schultern', 'Maschine'),
  ex('m-reverse-butterfly', 'Reverse Butterfly (Maschine)', 'Schultern', 'Maschine'),
  ex('kabel-seitheben', 'Seitheben am Kabel', 'Schultern', 'Kabelzug'),
  ex('face-pulls', 'Face Pulls', 'Schultern', 'Kabelzug'),

  // ---- Arme ----
  ex('bizepscurls', 'Bizepscurls', 'Arme', 'Kurzhantel'),
  ex('lh-curls', 'Bizepscurls (Langhantel)', 'Arme', 'Langhantel'),
  ex('hammercurls', 'Hammercurls', 'Arme', 'Kurzhantel'),
  ex('m-bizepscurls', 'Bizepscurls (Maschine)', 'Arme', 'Maschine'),
  ex('kabel-curls', 'Bizepscurls am Kabel', 'Arme', 'Kabelzug'),
  ex('french-press', 'French Press (SZ-Stange)', 'Arme', 'Langhantel'),
  ex('trizepsdruecken', 'Trizepsdrücken am Kabel', 'Arme', 'Kabelzug'),
  ex('kabel-trizeps-ueberkopf', 'Trizepsstrecken über Kopf am Kabel', 'Arme', 'Kabelzug'),
  ex('m-trizeps', 'Trizepsstrecken (Maschine)', 'Arme', 'Maschine'),
  ex('m-dips-sitzend', 'Dips sitzend (Maschine)', 'Arme', 'Maschine'),

  // ---- Rumpf ----
  ex('plank', 'Unterarmstütz (Sekunden)', 'Rumpf', 'Körpergewicht'),
  ex('beinheben', 'Hängendes Beinheben', 'Rumpf', 'Körpergewicht'),
  ex('crunches', 'Crunches', 'Rumpf', 'Körpergewicht'),
  ex('m-bauchmaschine', 'Bauchpresse (Maschine)', 'Rumpf', 'Maschine'),
  ex('m-rotation', 'Rumpfrotation (Maschine)', 'Rumpf', 'Maschine'),
  ex('kabel-crunch', 'Kabel-Crunch kniend', 'Rumpf', 'Kabelzug'),
];
