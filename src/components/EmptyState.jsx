import { Icon } from './Icon.jsx';

/** Freundlicher Hinweis, wenn es noch nichts zu zeigen gibt – mit dem nächsten sinnvollen Schritt. */
export function EmptyState({ icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true"><Icon name={icon} size={26} /></span>
      <strong>{title}</strong>
      {text && <p className="muted small">{text}</p>}
      {action && <button type="button" className="btn btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}
