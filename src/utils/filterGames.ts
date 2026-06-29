import type { Game, GameFilters } from "../types/game";
import { normalizeTitle } from "./normalizeTitle";
import { scoreGame } from "./scoreGame";

function contains(values: string[], expected?: string): boolean {
  if (!expected) return true;
  const needle = normalizeTitle(expected);
  return values.some((value) => normalizeTitle(value).includes(needle));
}

function matchesSearch(game: Game, search?: string): boolean {
  if (!search) return true;
  return contains(
    [game.title, ...(game.alternativeTitles ?? []), ...game.mechanics, ...game.mood],
    search,
  );
}

function matchesPlayers(game: Game, players?: number, includeAlmostCompatible = true): boolean {
  if (!players) return true;
  if (game.playersMin === null || game.playersMax === null) return includeAlmostCompatible;
  return players >= game.playersMin && players <= game.playersMax;
}

function matchesMode(game: Game, mode: GameFilters["mode"]): boolean {
  if (!mode) return true;
  if (mode === "solo") return game.soloPlayable;
  if (mode === "duel") return game.duelOnly || contains([...game.mechanics, ...game.mood], "duel");
  if (mode === "coop") return game.coop;
  if (mode === "bluff") return contains([...game.mechanics, ...game.mood], "bluff");
  if (mode === "investigation") return contains([...game.mechanics, ...game.mood], "enquête");
  if (mode === "team") return contains([...game.mechanics, ...game.mood], "équipe");
  return true;
}

function maxValue<T extends number>(values: T[] | undefined, fallback?: T): T | undefined {
  if (values?.length) return Math.max(...values) as T;
  return fallback;
}

function selectedMoods(filters: GameFilters): string[] {
  return filters.moods?.length ? filters.moods : filters.mood ? [filters.mood] : [];
}

export function filterGames(games: Game[], filters: GameFilters): Game[] {
  const durationLimit = maxValue(filters.durations, filters.duration);
  const learningDifficultyLimit = maxValue(filters.learningDifficultyMaxes, filters.learningDifficultyMax);
  const gameComplexityLimit = maxValue(filters.gameComplexityMaxes, filters.gameComplexityMax);
  const moods = selectedMoods(filters);

  const filtered = games.filter((game) => {
    if (!matchesSearch(game, filters.search)) return false;
    if (filters.location && !game.locations.includes(filters.location)) return false;
    if (!matchesPlayers(game, filters.players, filters.includeAlmostCompatible ?? true)) return false;
    if (durationLimit && game.durationMin !== null && game.durationMin > durationLimit + 20) return false;
    if (learningDifficultyLimit && game.learningDifficulty > learningDifficultyLimit) return false;
    if (gameComplexityLimit && game.gameComplexity > gameComplexityLimit) return false;
    if (moods.length && !moods.some((mood) => contains([...game.mood, ...game.mechanics], mood))) return false;
    if (filters.mechanics?.length && !filters.mechanics.every((mechanic) => contains(game.mechanics, mechanic))) {
      return false;
    }
    if (filters.coop && !game.coop) return false;
    if (filters.duel && !game.duelOnly) return false;
    if (filters.solo && !game.soloPlayable) return false;
    if (filters.investigation && !contains([...game.mood, ...game.mechanics], "enquête")) return false;
    return matchesMode(game, filters.mode);
  });

  const scored = filtered.map((game) => scoreGame(game, filters));
  const sort = filters.sort ?? "title";

  return scored
    .sort((a, b) => {
      if (filters.players && a.playersCompatible !== b.playersCompatible) {
        return a.playersCompatible ? -1 : 1;
      }
      if (sort === "relevance") return b.score - a.score || a.game.title.localeCompare(b.game.title, "fr");
      if (sort === "duration") return (a.game.durationMax ?? 999) - (b.game.durationMax ?? 999);
      if (sort === "difficulty") return a.game.learningDifficulty - b.game.learningDifficulty;
      if (sort === "playersMax") return (b.game.playersMax ?? 0) - (a.game.playersMax ?? 0);
      return a.game.title.localeCompare(b.game.title, "fr");
    })
    .map((entry) => entry.game);
}
