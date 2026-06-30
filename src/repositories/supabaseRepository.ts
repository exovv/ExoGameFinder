import { createClient } from "@supabase/supabase-js";
import type { GameRepository, RepositorySnapshot } from "./gameRepository";
import { createLocalStorageRepository } from "./localStorageRepository";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function createSupabaseRepository(seed: RepositorySnapshot): GameRepository {
  if (!isSupabaseConfigured()) {
    return createLocalStorageRepository(seed);
  }

  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const fallback = createLocalStorageRepository(seed);

  return {
    ...fallback,
    mode: "supabase",
    async getSnapshot() {
      const [{ data: games }, { data: auditLog }, { data: locations }] = await Promise.all([
        client.from("games").select("*"),
        client.from("audit_log").select("*"),
        client.from("locations").select("*"),
      ]);

      if (!games || !auditLog || !locations) {
        return fallback.getSnapshot();
      }

      return {
        games: games as RepositorySnapshot["games"],
        auditLog: auditLog as RepositorySnapshot["auditLog"],
        locations: locations as RepositorySnapshot["locations"],
      };
    },
  };
}
