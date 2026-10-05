import { Component } from 'react';

// Letzte Sicherung gegen einen weißen Bildschirm: Tritt beim Anzeigen ein unerwarteter Fehler auf,
// erscheint ein Hinweis mit „Neu laden“ und der Möglichkeit, die gespeicherten Daten als Datei zu sichern.
// Bewusst ohne Store und Übersetzungen – die könnten selbst die Ursache sein.
const DE = (typeof navigator !== 'undefined' ? navigator.language : 'de').toLowerCase().startsWith('de');
const TEXT = DE
  ? { title: 'Da ist etwas schiefgelaufen', text: 'Deine Daten sind weiterhin auf dem Gerät gespeichert. Lade die App neu – hilft das nicht, sichere die Daten als Datei.', reload: 'Neu laden', save: 'Daten als Datei sichern' }
  : { title: 'Something went wrong', text: 'Your data is still stored on this device. Reload the app – if that does not help, save your data as a file.', reload: 'Reload', save: 'Save data as file' };

function downloadRawData() {
  const raw = localStorage.getItem('kraftbuch:v1') ?? '{}';
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `Kraftbuch-Notfall-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Kraftbuch:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>{TEXT.title}</h1>
        <p>{TEXT.text}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => location.reload()}>{TEXT.reload}</button>
        <button type="button" className="btn btn-block" onClick={downloadRawData}>{TEXT.save}</button>
        <p className="muted small">{String(this.state.error?.message ?? this.state.error)}</p>
      </div>
    );
  }
}
