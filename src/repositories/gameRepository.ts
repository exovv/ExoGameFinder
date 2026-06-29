import { appLocations, games, initialContributions } from "../data/games";
import type { AuditLogEntry, Contribution, Game, LocationRecord } from "../types/game";
import { createLocalStorageRepository } from "./localStorageRepository";
import { createSupabaseRepository, isSupabaseConfigured } from "./supabaseRepository";

export type RepositorySnapshot = {
  games: Game[];
  contributions: Contribution[];
  auditLog: AuditLogEntry[];
  locations: LocationRecord[];
};

export type RepositoryImport = Partial<RepositorySnapshot>;

export type GameRepository = {
  mode: "localStorage" | "supabase";
  getSnapshot(): Promise<RepositorySnapshot>;
  saveGame(game: Game, actor: string): Promise<RepositorySnapshot>;
  submitContribution(contribution: Contribution): Promise<RepositorySnapshot>;
  reviewContribution(id: string, status: "approved" | "rejected", actor: string): Promise<RepositorySnapshot>;
  saveLocation(location: LocationRecord, actor: string): Promise<RepositorySnapshot>;
  importSnapshot(snapshot: RepositoryImport, actor: string): Promise<RepositorySnapshot>;
  resetDemo(): Promise<RepositorySnapshot>;
};

export const seedSnapshot: RepositorySnapshot = {
  games,
  contributions: initialContributions,
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
