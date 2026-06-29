import type { Game, GameFilters, ScoredGame } from "../types/game";
import { scoreGame } from "./scoreGame";

export function getRecommendedGames(games: Game[], filters: GameFilters, limit = 8): ScoredGame[] {
  return games
    .map((game) => scoreGame(game, filters))
    .filter((entry) => filters.includeAlmostCompatible || entry.playersCompatible)
    .sort((a, b) => {
      if (filters.players && a.playersCompatible !== b.playersCompatible) {
        return a.playersCompatible ? -1 : 1;
      }
      if (filters.players && a.playersKnown !== b.playersKnown) {
        return a.playersKnown ? -1 : 1;
      }
      return b.score - a.score || a.game.title.localeCompare(b.game.title, "fr");
    })
    .slice(0, limit);
}
