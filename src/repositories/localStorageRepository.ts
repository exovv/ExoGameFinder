import type { AuditLogEntry, Game, LocationRecord } from "../types/game";
import type { GameRepository, RepositoryImport, RepositorySnapshot } from "./gameRepository";

const STORAGE_KEY = "exogamefinder.repository.v1";
const MEDIA_VERSION_KEY = "exogamefinder.repository.mediaVersion";
const MEDIA_VERSION = "2026-06-29-bgg-images-v2";

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
      contributions: Array.isArray(parsed.contributions) ? parsed.contributions : fallback.contributions,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : fallback.auditLog,
      locations: Array.isArray(parsed.locations) ? parsed.locations : fallback.locations,
    };
  } catch {
    return fallback;
  }
}

function refreshSeedMedia(snapshot: RepositorySnapshot, seed: RepositorySnapshot): RepositorySnapshot {
  const seedGamesById = new Map(seed.games.map((game) => [game.id, game]));

  return {
    ...snapshot,
    games: snapshot.games.map((game) => {
      const seedGame = seedGamesById.get(game.id);

      if (!seedGame?.imageUrl) {
        return game;
      }

      return {
        ...game,
        bggId: seedGame.bggId,
        bggUrl: seedGame.bggUrl,
        imageUrl: seedGame.imageUrl,
        thumbnailUrl: seedGame.thumbnailUrl,
        dataQuality: game.dataQuality.filter((quality) => quality !== "missing-image"),
      };
    }),
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
    async submitContribution(contribution) {
      const snapshot = read();
      return write({
        ...snapshot,
        contributions: [{ ...contribution, status: "pending", createdAt: contribution.createdAt || now() }, ...snapshot.contributions],
        auditLog: [makeAudit("Proposition utilisateur", contribution.authorName, undefined, undefined, contribution.payload), ...snapshot.auditLog],
      });
    },
    async reviewContribution(id, status, actor) {
      const snapshot = read();
      const contribution = snapshot.contributions.find((item) => item.id === id);
      const nextContributions = snapshot.contributions.map((item) =>
        item.id === id ? { ...item, status, reviewedAt: now(), reviewedBy: actor } : item,
      );
      return write({
        ...snapshot,
        contributions: nextContributions,
        auditLog: [makeAudit(`Contribution ${status}`, actor, undefined, contribution?.previousValue, contribution?.payload), ...snapshot.auditLog],
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
        contributions: imported.contributions ?? snapshot.contributions,
        locations: imported.locations ?? snapshot.locations,
        auditLog: [makeAudit("Import JSON", actor, undefined, undefined, { importedAt: now() }), ...(imported.auditLog ?? snapshot.auditLog)],
      });
    },
    async resetDemo() {
      return write(seed);
    },
  };
}
