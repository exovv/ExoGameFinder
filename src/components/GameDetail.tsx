import { AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import type { Game } from "../types/game";
import { DifficultyBadge } from "./DifficultyBadge";
import { DurationBadge } from "./DurationBadge";
import { GameCard } from "./GameCard";

type GameDetailProps = {
  game: Game;
  similarGames: Game[];
};

function rulesLabel(game: Game): string {
  if (game.rulesKnowledge === "known") return "oui";
  if (game.rulesKnowledge === "partial") return "partiellement";
  return "à vérifier";
}

export function GameDetail({ game, similarGames }: GameDetailProps) {
  const image = game.imageUrl ?? game.thumbnailUrl;
  const tags = [...new Set([...game.mechanics, ...game.mood])];

  return (
    <div className="detail-layout">
      <section className="detail-hero">
        <div className="detail-image-frame">
          {image ? <img src={image} alt={`Boîte de ${game.title}`} /> : <GameCard game={game} compact />}
        </div>
        <div className="detail-main">
          <div className="eyebrow">{game.category.replace("-", " ")}</div>
          <h1>{game.title}</h1>
          {game.alternativeTitles?.length ? <p className="muted">Alias: {game.alternativeTitles.join(", ")}</p> : null}
        </div>
      </section>

      <section className="detail-grid">
        <div className="panel">
          <h2>Infos rapides</h2>
          <div className="detail-fields">
            <div className="detail-field"><span>Joueurs</span><strong>{game.playersMin && game.playersMax ? `${game.playersMin}-${game.playersMax}` : "à compléter"}</strong></div>
            <div className="detail-field"><span>Durée</span><strong><DurationBadge min={game.durationMin} max={game.durationMax} /></strong></div>
            <div className="detail-field"><span>Âge</span><strong>{game.ageMin ? `${game.ageMin}+` : "à compléter"}</strong></div>
            <div className="detail-field"><span>Règles connues</span><strong>{rulesLabel(game)}</strong></div>
            <div className="detail-field"><span>Dépendance langue</span><strong>{game.languageDependency}</strong></div>
          </div>
          <div className="badge-row">
            <DifficultyBadge label="Apprentissage" value={game.learningDifficulty} />
            <DifficultyBadge label="Complexité" value={game.gameComplexity} />
          </div>
        </div>

        {game.summary || game.dataQuality.includes("ambiguous") ? (
          <div className="panel">
            <h2>Description</h2>
            {game.summary ? <p>{game.summary}</p> : null}
            {game.dataQuality.includes("ambiguous") ? (
              <div className="warning-box"><AlertTriangle aria-hidden="true" size={18} />Titre ambigu: vérifier la bonne édition avant enrichissement.</div>
            ) : null}
          </div>
        ) : null}

        {game.contents?.length ? (
          <div className="panel">
            <h2>Contenu</h2>
            <ul className="detail-list">
              {game.contents.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="panel">
          <h2>Mécaniques et ambiances</h2>
          <div className="tag-row large-tags">
            {tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        </div>

        <div className="panel">
          <h2>Liens externes</h2>
          <div className="link-list">
            {game.bggUrl ? <a href={game.bggUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> BoardGameGeek</a> : <span className="muted">BoardGameGeek à compléter</span>}
            {game.myludoUrl ? <a href={game.myludoUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Myludo</a> : null}
            {game.rulesLinks?.map((link) => <a href={link} key={link} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Règles PDF</a>)}
            {game.videoLinks?.map((link) => <a href={link} key={link} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Vidéo d’explication</a>)}
          </div>
        </div>
      </section>

      {similarGames.length ? (
        <section className="section-block">
          <div className="section-heading"><Sparkles aria-hidden="true" /><h2>Autres options proches</h2></div>
          <div className="game-grid compact-grid">
            {similarGames.map((item) => <GameCard game={item} key={item.id} compact />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
