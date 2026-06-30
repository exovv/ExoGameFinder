import type { AuditLogEntry, Game, LocationRecord } from "../types/game";
import type { GameRepository, RepositoryImport, RepositorySnapshot } from "./gameRepository";

const STORAGE_KEY = "exogamefinder.repository.v1";
const MEDIA_VERSION_KEY = "exogamefinder.repository.mediaVersion";
const MEDIA_VERSION = "2026-06-30-retired-games-buttons-v4";
const RETIRED_SEED_GAME_IDS = new Set(["en-bizarre-compagnie", "timebomb"]);

function now(): string {
  return new Date().toISOString();
}

function makeAudit(
  action: string,
  actor: string,
  game?: Game,
  previousValue?: Record<string, unknown>,
  nextValue?: Record<string, unknown>,
): AuditLogEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    actor,
    action,
    gameId: game?.id,
    gameTitle: game?.title,
    previousValue,
    nextValue,
    createdAt: now(),
  };
}

function safeParse(value: string | null, fallback: RepositorySnapshot): RepositorySnapshot {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as RepositorySnapshot;
    return {
      games: Array.isArray(parsed.games) ? parsed.games : fallback.games,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : fallback.auditLog,
      locations: Array.isArray(parsed.locations) ? parsed.locations : fallback.locations,
    };
  } catch {
    return fallback;
  }
}

function refreshSeedMedia(snapshot: RepositorySnapshot, seed: RepositorySnapshot): RepositorySnapshot {
  const seedGamesById = new Map(seed.games.map((game) => [game.id, game]));
  const activeSnapshotGames = snapshot.games.filter((game) => !RETIRED_SEED_GAME_IDS.has(game.id));
  const existingGameIds = new Set(activeSnapshotGames.map((game) => game.id));
  const refreshedGames = activeSnapshotGames.map((game) => {
    const seedGame = seedGamesById.get(game.id);

    if (!seedGame?.imageUrl) {
      return game;
    }

    const hasOldGenericSummary = game.summary?.startsWith("Jeu ") && game.summary.includes("référencé dans l'inventaire CSE");
    const hasGeneratedSummary = game.summary?.includes(" est un jeu ") || game.summary?.startsWith(`${game.title}, dans l'édition`);
    const nextGame = {
      ...game,
      category: seedGame.category,
      locations: [...new Set([...game.locations, ...seedGame.locations])].sort((left, right) => left.localeCompare(right, "fr")),
      bggId: seedGame.bggId,
      bggUrl: seedGame.bggUrl,
      myludoId: game.myludoId ?? seedGame.myludoId,
      myludoCode: game.myludoCode ?? seedGame.myludoCode,
      myludoUrl: game.myludoUrl ?? seedGame.myludoUrl,
      subtitle: game.subtitle ?? seedGame.subtitle,
      editionYear: game.editionYear ?? seedGame.editionYear,
      ageMin: game.ageMin ?? seedGame.ageMin,
      contents: game.contents?.length ? game.contents : seedGame.contents,
      publishers: game.publishers?.length ? game.publishers : seedGame.publishers,
      authors: game.authors?.length ? game.authors : seedGame.authors,
      illustrators: game.illustrators?.length ? game.illustrators : seedGame.illustrators,
      playersMin: seedGame.myludoUrl ? seedGame.playersMin : game.playersMin,
      playersMax: seedGame.myludoUrl ? seedGame.playersMax : game.playersMax,
      durationMin: seedGame.myludoUrl ? seedGame.durationMin : game.durationMin,
      durationMax: seedGame.myludoUrl ? seedGame.durationMax : game.durationMax,
      mechanics: [...new Set([...game.mechanics, ...seedGame.mechanics])],
      mood: seedGame.id === "echecs" ? seedGame.mood : [...new Set([...game.mood, ...seedGame.mood])],
      imageUrl: seedGame.imageUrl,
      thumbnailUrl: seedGame.thumbnailUrl,
      summary: seedGame.summary ?? (hasOldGenericSummary || hasGeneratedSummary ? undefined : game.summary),
      sourceNotes: [...new Set([game.sourceNotes, seedGame.sourceNotes].filter(Boolean))].join(" | "),
      dataQuality: seedGame.imageUrl || seedGame.thumbnailUrl ? game.dataQuality.filter((quality) => quality !== "missing-image") : game.dataQuality,
    };

    return nextGame;
  });

  return {
    ...snapshot,
    games: [...refreshedGames, ...seed.games.filter((game) => !existingGameIds.has(game.id))].sort((left, right) =>
      left.title.localeCompare(right.title, "fr"),
    ),
  };
}

export function createLocalStorageRepository(seed: RepositorySnapshot): GameRepository {
  let memorySnapshot = seed;

  function read(): RepositorySnapshot {
    if (typeof localStorage === "undefined") return memorySnapshot;
    const snapshot = safeParse(localStorage.getItem(STORAGE_KEY), seed);
    memorySnapshot = localStorage.getItem(MEDIA_VERSION_KEY) === MEDIA_VERSION ? snapshot : refreshSeedMedia(snapshot, seed);
    if (localStorage.getItem(MEDIA_VERSION_KEY) !== MEDIA_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySnapshot, null, 2));
      localStorage.setItem(MEDIA_VERSION_KEY, MEDIA_VERSION);
    }
    return memorySnapshot;
  }

  function write(snapshot: RepositorySnapshot): RepositorySnapshot {
    memorySnapshot = snapshot;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot, null, 2));
      localStorage.setItem(MEDIA_VERSION_KEY, MEDIA_VERSION);
    }
    return snapshot;
  }

  return {
    mode: "localStorage",
    async getSnapshot() {
      return read();
    },
    async saveGame(game, actor) {
      const snapshot = read();
      const previous = snapshot.games.find((item) => item.id === game.id);
      const nextGame = { ...game, updatedAt: now() };
      const nextGames = previous
        ? snapshot.games.map((item) => (item.id === game.id ? nextGame : item))
        : [...snapshot.games, nextGame];
      return write({
        ...snapshot,
        games: nextGames.sort((a, b) => a.title.localeCompare(b.title, "fr")),
        auditLog: [
          makeAudit(previous ? "Modification jeu" : "Création jeu", actor, nextGame, previous, nextGame),
          ...snapshot.auditLog,
        ],
      });
    },
    async saveLocation(location: LocationRecord, actor: string) {
      const snapshot = read();
      const previous = snapshot.locations.find((item) => item.id === location.id);
      const locations = previous
        ? snapshot.locations.map((item) => (item.id === location.id ? location : item))
        : [...snapshot.locations, location];
      return write({
        ...snapshot,
        locations,
        auditLog: [makeAudit("Modification lieu", actor, undefined, previous, location), ...snapshot.auditLog],
      });
    },
    async importSnapshot(imported: RepositoryImport, actor: string) {
      const snapshot = read();
      return write({
        games: imported.games ?? snapshot.games,
        locations: imported.locations ?? snapshot.locations,
        auditLog: [makeAudit("Import JSON", actor, undefined, undefined, { importedAt: now() }), ...(imported.auditLog ?? snapshot.auditLog)],
      });
    },
    async resetDemo() {
      return write(seed);
    },
  };
}
