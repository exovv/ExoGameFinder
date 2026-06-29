import seed from "./exogamefinder.seed.json";
import imageOverrides from "./gameImageOverrides.json";
import { ambiguousTitles, titleAliases } from "./titleAliases";
import type {
  Contribution,
  DataQuality,
  Game,
  GameCategory,
  LocationRecord,
} from "../types/game";
import { normalizeTitle, titleSlug } from "../utils/normalizeTitle";

type RawInventoryItem = {
  location: string;
  category: GameCategory;
  title: string;
  players: string | null;
  mechanics: string[];
};

type SeedData = {
  locations: string[];
  rawInventory: RawInventoryItem[];
};

const typedSeed = seed as SeedData;
const typedImageOverrides = imageOverrides as Record<
  string,
  Pick<Game, "bggId" | "bggUrl" | "imageUrl" | "thumbnailUrl">
>;
const SEED_DATE = "2026-06-29T00:00:00.000Z";
const aliasLookup = new Map(
  Object.entries(titleAliases).map(([source, target]) => [normalizeTitle(source), target]),
);
const ambiguousLookup = new Set(ambiguousTitles.map((title) => normalizeTitle(title)));

const CATEGORY_DEFAULTS: Record<
  GameCategory,
  Pick<Game, "durationMin" | "durationMax" | "learningDifficulty" | "gameComplexity">
> = {
  classique: { durationMin: 5, durationMax: 30, learningDifficulty: 1, gameComplexity: 1 },
  rapide: { durationMin: 10, durationMax: 20, learningDifficulty: 1, gameComplexity: 1 },
  court: { durationMin: 20, durationMax: 35, learningDifficulty: 2, gameComplexity: 2 },
  duel: { durationMin: 20, durationMax: 40, learningDifficulty: 2, gameComplexity: 2 },
  moyen: { durationMin: 35, durationMax: 60, learningDifficulty: 3, gameComplexity: 3 },
  long: { durationMin: 60, durationMax: 90, learningDifficulty: 3, gameComplexity: 3 },
  "solo-enquete": { durationMin: 30, durationMax: 90, learningDifficulty: 2, gameComplexity: 2 },
  expert: { durationMin: 90, durationMax: 150, learningDifficulty: 4, gameComplexity: 5 },
  "a-ranger": { durationMin: null, durationMax: null, learningDifficulty: 3, gameComplexity: 3 },
};

function canonicalTitle(title: string): string {
  return aliasLookup.get(normalizeTitle(title)) ?? title;
}

function parsePlayers(value: string | null): Pick<Game, "playersMin" | "playersMax"> {
  if (!value) {
    return { playersMin: null, playersMax: null };
  }

  if (/^\d+v\d+/i.test(value)) {
    const teams = value.split("v").map((part) => Number.parseInt(part, 10));
    const total = teams.reduce((sum, team) => sum + (Number.isFinite(team) ? team : 0), 0);
    return { playersMin: total || null, playersMax: total || null };
  }

  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) {
    return { playersMin: null, playersMax: null };
  }
  if (numbers.length === 1) {
    return { playersMin: numbers[0], playersMax: numbers[0] };
  }
  return { playersMin: Math.min(...numbers), playersMax: Math.max(...numbers) };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function inferMood(category: GameCategory, mechanics: string[]): string[] {
  const normalizedMechanics = mechanics.map((mechanic) => normalizeTitle(mechanic));
  const mood = new Set<string>();

  if (["rapide", "court", "classique"].includes(category)) mood.add("rapide");
  if (["moyen", "long", "expert"].includes(category)) mood.add("stratégie");
  if (category === "duel") mood.add("duel");
  if (category === "solo-enquete") mood.add("enquête");
  if (category === "expert") mood.add("expert");

  for (const mechanic of normalizedMechanics) {
    if (["ambiance", "bluff", "roles caches", "quiz", "memoire"].some((tag) => mechanic.includes(tag))) {
      mood.add("ambiance");
    }
    if (["coop", "semi coop"].some((tag) => mechanic.includes(tag))) mood.add("coopération");
    if (["enquete", "deduction", "logique", "escape game"].some((tag) => mechanic.includes(tag))) {
      mood.add("enquête");
    }
    if (["duel", "affrontement", "bagarre"].some((tag) => mechanic.includes(tag))) mood.add("duel");
    if (["course", "rapidite", "temps reel"].some((tag) => mechanic.includes(tag))) mood.add("énergie");
    if (["placement", "collection", "tuiles", "draft"].some((tag) => mechanic.includes(tag))) mood.add("familial");
  }

  return unique([...mood]);
}

function inferDataQuality(item: RawInventoryItem, title: string): DataQuality[] {
  const quality = new Set<DataQuality>(["missing-image", "missing-rules"]);
  if (item.players === null || item.category === "a-ranger" || item.location === "Hors catégorie") {
    quality.add("to-check");
  }
  if (ambiguousLookup.has(normalizeTitle(title))) {
    quality.add("ambiguous");
  }
  return [...quality];
}

function mergeQuality(current: DataQuality[], incoming: DataQuality[]): DataQuality[] {
  return [...new Set([...current, ...incoming])];
}

function mergeGame(current: Game, incoming: Game): Game {
  return {
    ...current,
    alternativeTitles: unique([...(current.alternativeTitles ?? []), ...(incoming.alternativeTitles ?? [])]),
    locations: unique([...current.locations, ...incoming.locations]),
    playersMin:
      current.playersMin === null || incoming.playersMin === null
        ? current.playersMin ?? incoming.playersMin
        : Math.min(current.playersMin, incoming.playersMin),
    playersMax:
      current.playersMax === null || incoming.playersMax === null
        ? current.playersMax ?? incoming.playersMax
        : Math.max(current.playersMax, incoming.playersMax),
    mechanics: unique([...current.mechanics, ...incoming.mechanics]),
    mood: unique([...current.mood, ...incoming.mood]),
    dataQuality: mergeQuality(current.dataQuality, incoming.dataQuality),
    sourceNotes: unique([current.sourceNotes ?? "", incoming.sourceNotes ?? ""]).join(" | "),
    updatedAt: SEED_DATE,
  };
}

function toGame(item: RawInventoryItem): Game {
  const title = canonicalTitle(item.title);
  const normalizedTitle = normalizeTitle(title);
  const players = parsePlayers(item.players);
  const defaults = CATEGORY_DEFAULTS[item.category];
  const mechanics = unique(item.mechanics);
  const quality = inferDataQuality(item, title);
  const alternativeTitles = normalizeTitle(item.title) === normalizedTitle ? [] : [item.title];

  return {
    id: titleSlug(title),
    title,
    normalizedTitle,
    alternativeTitles,
    locations: [item.location],
    category: item.category,
    ...players,
    durationMin: defaults.durationMin,
    durationMax: defaults.durationMax,
    learningDifficulty: defaults.learningDifficulty,
    gameComplexity: defaults.gameComplexity,
    mechanics,
    mood: inferMood(item.category, mechanics),
    rulesKnowledge: "unknown",
    soloPlayable: players.playersMin === 1 || item.category === "solo-enquete",
    coop: mechanics.some((mechanic) => normalizeTitle(mechanic).includes("coop")),
    duelOnly: players.playersMin === 2 && players.playersMax === 2,
    languageDependency: mechanics.some((mechanic) => normalizeTitle(mechanic).includes("mots")) ? "high" : "low",
    summary: `Jeu ${item.category.replace("-", " ")} référencé dans l'inventaire CSE.`,
    whyPickIt: "Bon candidat lorsque le format, le lieu et l'ambiance correspondent à votre créneau.",
    dataQuality: quality,
    sourceNotes: `Import inventaire: ${item.location} / ${item.category}${item.players ? ` / ${item.players} joueurs` : " / joueurs à compléter"}`,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

export const games: Game[] = Array.from(
  typedSeed.rawInventory
    .map(toGame)
    .map(applyImageOverride)
    .reduce((map, game) => {
      const current = map.get(game.normalizedTitle);
      map.set(game.normalizedTitle, current ? mergeGame(current, game) : game);
      return map;
    }, new Map<string, Game>())
    .values(),
).sort((a, b) => a.title.localeCompare(b.title, "fr"));

function applyImageOverride(game: Game): Game {
  const override = typedImageOverrides[game.normalizedTitle] ?? typedImageOverrides[game.id];
  if (!override) return game;

  return {
    ...game,
    ...override,
    dataQuality: game.dataQuality.filter((quality) => quality !== "missing-image"),
  };
}
export const appLocations: LocationRecord[] = unique([
  ...typedSeed.locations,
  ...typedSeed.rawInventory.map((item) => item.location),
]).map((name) => ({ id: titleSlug(name), name, active: name !== "Hors catégorie" }));

export const initialContributions: Contribution[] = [
  {
    id: "contrib-image-uno",
    type: "add-image",
    gameId: "uno",
    authorName: "Mode démo",
    status: "pending",
    payload: { imageUrl: "https://boardgamegeek.com/boardgame/2223/uno" },
    comment: "Source BGG à vérifier avant validation.",
    sourceUrl: "https://boardgamegeek.com/boardgame/2223/uno",
    createdAt: "2026-06-29T08:00:00.000Z",
  },
  {
    id: "contrib-dune-ambiguous",
    type: "report-wrong-data",
    gameId: "dune",
    authorName: "Mode démo",
    status: "pending",
    payload: { dataQuality: ["ambiguous", "missing-image", "missing-rules"] },
    previousValue: { title: "Dune" },
    comment: "Plusieurs jeux Dune existent, ne pas enrichir automatiquement.",
    createdAt: "2026-06-29T09:00:00.000Z",
  },
];
