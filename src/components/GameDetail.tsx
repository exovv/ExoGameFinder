import { AlertTriangle, ExternalLink, FileQuestion, ImagePlus, MessageSquareWarning, Sparkles } from "lucide-react";
import type { Contribution, Game } from "../types/game";
import { DifficultyBadge } from "./DifficultyBadge";
import { DurationBadge } from "./DurationBadge";
import { GameCard } from "./GameCard";

type GameDetailProps = {
  game: Game;
  similarGames: Game[];
  onSubmitContribution(contribution: Contribution): void;
};

function rulesLabel(game: Game): string {
  if (game.rulesKnowledge === "known") return "oui";
  if (game.rulesKnowledge === "partial") return "partiellement";
  return "à vérifier";
}

function createContribution(game: Game, type: Contribution["type"], comment: string): Contribution {
  return {
    id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    gameId: game.id,
    authorName: "Utilisateur démo",
    status: "pending",
    payload: { gameId: game.id, title: game.title },
    previousValue: { title: game.title },
    comment,
    createdAt: new Date().toISOString(),
  };
}

function createImageContribution(game: Game, imageUrl: string): Contribution {
  return {
    id: `contrib-image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: "add-image",
    gameId: game.id,
    authorName: "Visiteur",
    status: "pending",
    payload: { gameId: game.id, title: game.title, imageUrl },
    previousValue: { imageUrl: game.imageUrl, thumbnailUrl: game.thumbnailUrl },
    comment: "Image proposée depuis la fiche jeu.",
    sourceUrl: imageUrl,
    createdAt: new Date().toISOString(),
  };
}

export function GameDetail({ game, similarGames, onSubmitContribution }: GameDetailProps) {
  const image = game.imageUrl ?? game.thumbnailUrl;
  const proposeImage = () => {
    const imageUrl = window.prompt(`URL de l'image pour ${game.title}`);
    if (!imageUrl?.trim()) return;
    onSubmitContribution(createImageContribution(game, imageUrl.trim()));
    window.alert("Merci, l'image a été envoyée à l'administrateur.");
  };

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
          <div className="detail-actions">
            <button type="button" onClick={() => onSubmitContribution(createContribution(game, "report-wrong-data", "Correction proposée depuis la fiche jeu."))}>
              <FileQuestion aria-hidden="true" size={18} />
              Proposer une correction
            </button>
            <button type="button" className="secondary-button" onClick={() => onSubmitContribution(createContribution(game, "update-location", "Signalement de jeu absent, déplacé ou présent dans un autre lieu."))}>
              <MessageSquareWarning aria-hidden="true" size={18} />
              Signaler absent / déplacé
            </button>
            <button type="button" className="secondary-button" onClick={proposeImage}>
              <ImagePlus aria-hidden="true" size={18} />
              Proposer une image
            </button>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <div className="panel">
          <h2>Infos rapides</h2>
          <div className="detail-fields">
            <div className="detail-field"><span>Joueurs</span><strong>{game.playersMin && game.playersMax ? `${game.playersMin}-${game.playersMax}` : "à compléter"}</strong></div>
            <div className="detail-field"><span>Durée</span><strong><DurationBadge min={game.durationMin} max={game.durationMax} /></strong></div>
            <div className="detail-field"><span>Règles connues</span><strong>{rulesLabel(game)}</strong></div>
            <div className="detail-field"><span>Dépendance langue</span><strong>{game.languageDependency}</strong></div>
          </div>
          <div className="badge-row">
            <DifficultyBadge label="Apprentissage" value={game.learningDifficulty} />
            <DifficultyBadge label="Complexité" value={game.gameComplexity} />
          </div>
        </div>

        <div className="panel">
          <h2>Pourquoi choisir ce jeu ?</h2>
          <p>{game.whyPickIt ?? "À compléter après les premiers retours de partie."}</p>
          <p className="muted">{game.summary ?? "Résumé à compléter."}</p>
          {game.dataQuality.includes("ambiguous") ? (
            <div className="warning-box"><AlertTriangle aria-hidden="true" size={18} />Titre ambigu: vérifier la bonne édition avant enrichissement.</div>
          ) : null}
        </div>

        <div className="panel">
          <h2>Mécaniques et ambiances</h2>
          <div className="tag-row large-tags">
            {[...game.mechanics, ...game.mood].map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        </div>

        <div className="panel">
          <h2>Liens externes</h2>
          <div className="link-list">
            {game.bggUrl ? <a href={game.bggUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> BoardGameGeek</a> : <span className="muted">BoardGameGeek à compléter</span>}
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
