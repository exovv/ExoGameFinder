import { AlertTriangle, Dices, Handshake, ImageOff, Search, Swords, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Game } from "../types/game";
import { normalizeTitle } from "../utils/normalizeTitle";
import { DifficultyBadge } from "./DifficultyBadge";
import { DurationBadge } from "./DurationBadge";

type GameCardProps = {
  game: Game;
  score?: number;
  reasons?: string[];
  compact?: boolean;
};

function playerLabel(game: Game): string {
  if (game.playersMin === null || game.playersMax === null) return "Joueurs à vérifier";
  if (game.playersMin === game.playersMax) return `${game.playersMin} joueur${game.playersMin > 1 ? "s" : ""}`;
  return `${game.playersMin}-${game.playersMax} joueurs`;
}

function fallbackIcon(game: Game) {
  if (game.dataQuality.includes("ambiguous")) return <AlertTriangle size={34} aria-hidden="true" />;
  if (game.duelOnly) return <Swords size={34} aria-hidden="true" />;
  if (game.coop) return <Handshake size={34} aria-hidden="true" />;
  if ([...game.mood, ...game.mechanics].some((value) => normalizeTitle(value).includes("enquete"))) {
    return <Search size={34} aria-hidden="true" />;
  }
  return <Dices size={34} aria-hidden="true" />;
}

export function GameCard({ game, score, reasons = [], compact = false }: GameCardProps) {
  const imageSources = [...new Set([game.imageUrl, game.thumbnailUrl].filter((url): url is string => Boolean(url)))];
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = imageSources[imageIndex];

  useEffect(() => {
    setImageIndex(0);
  }, [game.id, game.imageUrl, game.thumbnailUrl]);

  return (
    <article className={compact ? "game-card game-card--compact" : "game-card"}>
      <Link to={`/game/${game.id}`} className="game-card__media" aria-label={`Ouvrir ${game.title}`}>
        {imageSrc ? (
          <img key={imageSrc} src={imageSrc} alt={`Boîte de ${game.title}`} loading="lazy" onError={() => setImageIndex((current) => current + 1)} />
        ) : (
          <div className="box-fallback">
            {fallbackIcon(game)}
            <span>{game.title}</span>
            <small><ImageOff size={13} aria-hidden="true" /> image à compléter</small>
          </div>
        )}
      </Link>
      <div className="game-card__body">
        <div className="game-card__title-row">
          <h3><Link to={`/game/${game.id}`}>{game.title}</Link></h3>
          {typeof score === "number" && <span className="score-pill">{score}</span>}
        </div>
        <div className="meta-row">
          <span className="meta-badge"><Users size={15} aria-hidden="true" />{playerLabel(game)}</span>
          <DurationBadge min={game.durationMin} max={game.durationMax} />
        </div>
        <div className="meta-row">
          <DifficultyBadge label="Règles" value={game.learningDifficulty} />
          <DifficultyBadge label="Jeu" value={game.gameComplexity} />
        </div>
        <div className="tag-list">
          {[...game.mood, ...game.mechanics].slice(0, compact ? 3 : 5).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {reasons.length > 0 && <p className="reason-line">{reasons.slice(0, 2).join(" · ")}</p>}
      </div>
    </article>
  );
}
