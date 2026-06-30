import type { Game } from "../types/game";

export function groupByLocation(games: Game[]): Record<string, Game[]> {
  return games.reduce<Record<string, Game[]>>((groups, game) => {
    for (const location of game.locations) {
      groups[location] = [...(groups[location] ?? []), game];
    }
    return groups;
  }, {});
}
