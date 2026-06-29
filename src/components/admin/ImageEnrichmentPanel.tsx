import { ExternalLink, ImagePlus, Search } from "lucide-react";
import { useState } from "react";
import type { Contribution, Game } from "../../types/game";

type ImageEnrichmentPanelProps = {
  games: Game[];
  onSubmitContribution(contribution: Contribution): void;
};

export function ImageEnrichmentPanel({ games, onSubmitContribution }: ImageEnrichmentPanelProps) {
  const [query, setQuery] = useState("");
  const gamesWithoutImage = games.filter((game) => !game.imageUrl && !game.thumbnailUrl);
  const visible = gamesWithoutImage.filter((game) => game.title.toLowerCase().includes(query.toLowerCase()));

  const proposeImage = (game: Game) => {
    const imageUrl = window.prompt(`URL image BoardGameGeek pour ${game.title}`);
    if (!imageUrl) return;
    onSubmitContribution({
      id: `contrib-image-${Date.now()}`,
      type: "add-image",
      gameId: game.id,
      authorName: "Admin démo",
      status: "pending",
      payload: { imageUrl },
      previousValue: { imageUrl: game.imageUrl, thumbnailUrl: game.thumbnailUrl },
      comment: "Image proposée depuis l’enrichissement images.",
      sourceUrl: imageUrl,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <section className="panel">
      <div className="section-heading"><ImagePlus aria-hidden="true" /><h2>Enrichissement images</h2></div>
      <div className="search-field"><Search aria-hidden="true" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un jeu sans image" /></div>
      <div className="image-enrichment-list">
        {visible.slice(0, 40).map((game) => (
          <div key={game.id}>
            <strong>{game.title}</strong>
            <span>{game.dataQuality.join(", ")}</span>
            <div className="icon-actions">
              <a href={`https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(game.title)}`} target="_blank" rel="noreferrer" title="Chercher sur BoardGameGeek"><ExternalLink aria-hidden="true" size={16} /></a>
              <button type="button" onClick={() => proposeImage(game)}>Chercher une image</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
