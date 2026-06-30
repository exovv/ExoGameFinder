import { Check, X } from "lucide-react";
import type { Contribution, Game } from "../../types/game";

type ContributionQueueProps = {
  contributions: Contribution[];
  games: Game[];
  onReview(id: string, status: "approved" | "rejected"): void;
};

function pretty(value: Record<string, unknown> | undefined): string {
  if (!value) return "—";
  return JSON.stringify(value, null, 2);
}

export function ContributionQueue({ contributions, games, onReview }: ContributionQueueProps) {
  const gameById = new Map(games.map((game) => [game.id, game.title]));
  const statusLabel: Record<Contribution["status"], string> = {
    pending: "À valider",
    approved: "Validée",
    rejected: "Rejetée",
  };

  return (
    <div className="contribution-list">
      {contributions.map((contribution) => (
        <article className="contribution-card" key={contribution.id}>
          <div className="contribution-head">
            <div><strong>{contribution.type}</strong><span>{contribution.authorName} · {new Date(contribution.createdAt).toLocaleString("fr-FR")}</span></div>
            <span className={`status-pill status-${contribution.status}`}>{statusLabel[contribution.status]}</span>
          </div>
          <p>{gameById.get(contribution.gameId ?? "") ?? "Jeu non renseigné"}</p>
          <div className="diff-grid">
            <pre>{pretty(contribution.previousValue)}</pre>
            <pre>{pretty(contribution.payload)}</pre>
          </div>
          {contribution.comment ? <p className="muted">{contribution.comment}</p> : null}
          {contribution.sourceUrl ? <a href={contribution.sourceUrl} target="_blank" rel="noreferrer">source éventuelle</a> : null}
          <div className="admin-actions-row">
            <button type="button" disabled={contribution.status !== "pending"} onClick={() => onReview(contribution.id, "approved")}><Check aria-hidden="true" size={16} /> Approuver</button>
            <button type="button" className="secondary-button" disabled={contribution.status !== "pending"} onClick={() => onReview(contribution.id, "rejected")}><X aria-hidden="true" size={16} /> Rejeter</button>
          </div>
        </article>
      ))}
    </div>
  );
}
