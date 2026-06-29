import type { Game, GameFilters, ScoredGame } from "../types/game";
import { normalizeTitle } from "./normalizeTitle";

function matchesText(values: string[], expected?: string): boolean {
  if (!expected) return false;
  const needle = normalizeTitle(expected);
  return values.some((value) => normalizeTitle(value).includes(needle));
}

function playersKnown(game: Game): boolean {
  return game.playersMin !== null && game.playersMax !== null;
}

function isPlayersCompatible(game: Game, players?: number): boolean {
  if (!players) return true;
  if (!playersKnown(game)) return true;
  return players >= game.playersMin! && players <= game.playersMax!;
}

function maxValue<T extends number>(values: T[] | undefined, fallback?: T): T | undefined {
  if (values?.length) return Math.max(...values) as T;
  return fallback;
}

function selectedMoods(filters: GameFilters): string[] {
  return filters.moods?.length ? filters.moods : filters.mood ? [filters.mood] : [];
}

export function scoreGame(game: Game, filters: GameFilters): ScoredGame {
  let score = 0;
  const reasons: string[] = [];
  const knownPlayers = playersKnown(game);
  const playersCompatible = isPlayersCompatible(game, filters.players);
  const durationLimit = maxValue(filters.durations, filters.duration);
  const learningDifficultyLimit = maxValue(filters.learningDifficultyMaxes, filters.learningDifficultyMax);
  const gameComplexityLimit = maxValue(filters.gameComplexityMaxes, filters.gameComplexityMax);
  const moods = selectedMoods(filters);

  if (filters.players) {
    if (knownPlayers && playersCompatible) {
      score += 40;
      reasons.push("nombre de joueurs compatible");
    } else if (knownPlayers && !playersCompatible) {
      score += filters.includeAlmostCompatible ? -30 : -100;
      reasons.push("nombre de joueurs incompatible");
    } else {
      score -= 6;
      reasons.push("nombre de joueurs à vérifier");
    }
  }

  if (durationLimit && game.durationMax !== null) {
    if (game.durationMax <= durationLimit) {
      score += 25;
      reasons.push("tient dans le temps disponible");
    } else if (game.durationMax > durationLimit + 20) {
      score -= 20;
      reasons.push("risque de dépasser le créneau");
    }
  }

  if (learningDifficultyLimit) {
    if (game.learningDifficulty <= learningDifficultyLimit) {
      score += 20;
      reasons.push("règles dans le niveau demandé");
    } else {
      score -= 15;
      reasons.push("règles probablement trop longues");
    }
  }

  if (gameComplexityLimit && game.gameComplexity > gameComplexityLimit) {
    score -= 10;
    reasons.push("complexité réelle élevée");
  }

  if (moods.some((mood) => matchesText([...game.mood, ...game.mechanics], mood))) {
    score += 15;
    reasons.push("ambiance recherchée");
  }

  if (filters.location && game.locations.includes(filters.location)) {
    score += 10;
    reasons.push("disponible au bon lieu");
  }

  if (filters.players === 2 && game.duelOnly) {
    score += 10;
    reasons.push("format duel parfait");
  }

  if (game.coop && matchesText([...game.mood, ...game.mechanics], "coopération")) {
    score += 10;
    reasons.push("coopératif");
  }

  if (filters.players && filters.players >= 6 && matchesText([...game.mood, ...game.mechanics], "ambiance")) {
    score += 10;
    reasons.push("adapté aux grands groupes");
  }

  if (game.rulesKnowledge === "known") {
    score += 8;
    reasons.push("règles connues");
  }
  if (game.rulesKnowledge === "unknown") {
    score -= 8;
    reasons.push("règles à vérifier");
  }

  if (game.dataQuality.includes("ambiguous")) {
    score -= 10;
    reasons.push("titre ambigu");
  }

  return { game, score, reasons, playersCompatible, playersKnown: knownPlayers };
}
