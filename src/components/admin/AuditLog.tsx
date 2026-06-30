import type { AuditLogEntry } from "../../types/game";

type AuditLogProps = {
  entries: AuditLogEntry[];
};

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <section className="panel">
      <h2>Audit log</h2>
      <div className="audit-list">
        {entries.map((entry) => (
          <article key={entry.id}>
            <div><strong>{entry.action}</strong><span>{entry.actor} · {new Date(entry.createdAt).toLocaleString("fr-FR")}</span></div>
            {entry.gameTitle ? <p>{entry.gameTitle}</p> : null}
            <div className="diff-grid">
              <pre>{entry.previousValue ? JSON.stringify(entry.previousValue, null, 2) : "ancienne valeur: —"}</pre>
              <pre>{entry.nextValue ? JSON.stringify(entry.nextValue, null, 2) : "nouvelle valeur: —"}</pre>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
