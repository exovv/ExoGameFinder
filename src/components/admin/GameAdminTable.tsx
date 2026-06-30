import { AlertCircle, CheckCircle2, Eye, ImageOff, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import type { Game } from "../../types/game";

type GameAdminTableProps = {
  games: Game[];
  selectedId?: string;
  onSelect(game: Game): void;
  onArchive(game: Game): void;
};

function adminStatus(game: Game) {
  if (!game.imageUrl && !game.thumbnailUrl) return { label: "Image à proposer", className: "status-pending", icon: ImageOff };
  if (game.dataQuality.some((quality) => quality !== "verified")) return { label: "À vérifier", className: "status-rejected", icon: AlertCircle };
  return { label: "Validé", className: "status-approved", icon: CheckCircle2 };
}

export function GameAdminTable({ games, selectedId, onSelect, onArchive }: GameAdminTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Jeu</th>
            <th>Joueurs</th>
            <th>État</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            const status = adminStatus(game);
            const StatusIcon = status.icon;

            return (
              <tr key={game.id} className={selectedId === game.id ? "is-selected" : ""}>
                <td><strong>{game.title}</strong><span>{game.category}</span></td>
                <td>{game.playersMin ?? "?"}-{game.playersMax ?? "?"}</td>
                <td><span className={`status-pill ${status.className}`}><StatusIcon aria-hidden="true" size={14} /> {status.label}</span></td>
                <td>
                  <div className="icon-actions">
                    <button type="button" title="éditer" onClick={() => onSelect(game)}><Pencil aria-hidden="true" size={16} /></button>
                    <Link title="voir la fiche" to={`/game/${game.id}`}><Eye aria-hidden="true" size={16} /></Link>
                    <button type="button" title="marquer à vérifier" onClick={() => onArchive(game)}><AlertCircle aria-hidden="true" size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
