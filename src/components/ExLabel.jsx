import { useI18n } from '../i18n/index.jsx';

/** Übungsname mit dem Gerät als kleinem Etikett statt in Klammern. */
export function ExLabel({ e, as: Tag = 'span', className = '', fallback }) {
  const { exParts } = useI18n();
  if (!e && fallback) return <Tag className={className}>{fallback}</Tag>;
  const { name, tag } = exParts(e);
  return (
    <Tag className={`ex-label ${className}`}>
      {name}
      {/* Leerzeichen statt Außenabstand: bricht das Etikett um, steht es bündig am Zeilenanfang */}
      {tag && <> <span className="ex-tag">{tag}</span></>}
    </Tag>
  );
}
