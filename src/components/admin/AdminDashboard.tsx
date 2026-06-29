import { AlertTriangle, Database, Download, ImageOff, Upload, Wand2 } from "lucide-react";
import type { AuditLogEntry, Contribution, Game } from "../../types/game";

type AdminDashboardProps = {
  games: Game[];
  contributions: Contribution[];
  auditLog: AuditLogEntry[];
  onExport(): void;
  onImport(file: File): void;
};

export function AdminDashboard({ games, contributions, auditLog, onExport, onImport }: AdminDashboardProps) {
  const noImage = games.filter((game) => !game.imageUrl && !game.thumbnailUrl).length;
  const incomplete = games.filter((game) => game.dataQuality.includes("to-check") || game.playersMin === null || game.durationMax === null).length;
  const ambiguous = games.filter((game) => game.dataQuality.includes("ambiguous")).length;
  const pending = contributions.filter((contribution) => contribution.status === "pending").length;

  return (
    <section className="admin-dashboard">
      <div className="stat-grid">
        <div className="stat-card"><Database aria-hidden="true" /><span>Total jeux</span><strong>{games.length}</strong></div>
        <div className="stat-card"><ImageOff aria-hidden="true" /><span>Sans image</span><strong>{noImage}</strong></div>
        <div className="stat-card"><Wand2 aria-hidden="true" /><span>Données incomplètes</span><strong>{incomplete}</strong></div>
        <div className="stat-card"><AlertTriangle aria-hidden="true" /><span>Ambigus</span><strong>{ambiguous}</strong></div>
        <div className="stat-card highlight"><span>Contributions</span><strong>{pending}</strong><small>en attente</small></div>
      </div>
      <div className="admin-actions-row">
        <button type="button" onClick={onExport}><Download aria-hidden="true" size={18} /> Export JSON</button>
        <label className="file-button"><Upload aria-hidden="true" size={18} /> Import JSON<input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} /></label>
      </div>
      <div className="panel">
        <h2>Dernières modifications</h2>
        <div className="audit-mini-list">
          {auditLog.slice(0, 6).map((entry) => (
            <div key={entry.id}>
              <strong>{entry.action}</strong>
              <span>{entry.actor} · {new Date(entry.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
