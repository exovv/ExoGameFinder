import { appLocations, games } from "../data/games";
import type { AuditLogEntry, Game, LocationRecord } from "../types/game";
import { createLocalStorageRepository } from "./localStorageRepository";
import { createSupabaseRepository, isSupabaseConfigured } from "./supabaseRepository";

export type RepositorySnapshot = {
  games: Game[];
  auditLog: AuditLogEntry[];
  locations: LocationRecord[];
};

export type RepositoryImport = Partial<RepositorySnapshot>;

export type GameRepository = {
  mode: "localStorage" | "supabase";
  getSnapshot(): Promise<RepositorySnapshot>;
  saveGame(game: Game, actor: string): Promise<RepositorySnapshot>;
  saveLocation(location: LocationRecord, actor: string): Promise<RepositorySnapshot>;
  importSnapshot(snapshot: RepositoryImport, actor: string): Promise<RepositorySnapshot>;
  resetDemo(): Promise<RepositorySnapshot>;
};

export const seedSnapshot: RepositorySnapshot = {
  games,
  locations: appLocations,
  auditLog: [
    {
      id: "audit-seed-import",
      actor: "seed",
      action: "Initialisation de la base locale",
      nextValue: { games: games.length, locations: appLocations.length },
      createdAt: "2026-06-29T00:00:00.000Z",
    },
  ],
};

export function createGameRepository(): GameRepository {
  if (isSupabaseConfigured()) {
    return createSupabaseRepository(seedSnapshot);
  }
  return createLocalStorageRepository(seedSnapshot);
}
