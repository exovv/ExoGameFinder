import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { games } from "../src/data/games";
import { ambiguousTitles } from "../src/data/titleAliases";
import type { Game } from "../src/types/game";
import { normalizeTitle } from "../src/utils/normalizeTitle";

type CacheEntry = {
  status: "enriched" | "not-found" | "ambiguous";
  bggId?: number;
  bggUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  candidates?: { id: number; title: string; year?: string }[];
  updatedAt: string;
};

type Report = {
  generatedAt: string;
  enriched: string[];
  notFound: string[];
  ambiguous: { title: string; candidates?: CacheEntry["candidates"] }[];
  manualReview: string[];
};

type ImageOverrides = Record<
  string,
  Pick<Game, "bggId" | "bggUrl" | "imageUrl" | "thumbnailUrl">
>;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const cachePath = path.resolve(".cache", "bgg-image-cache.json");
const imageOverridesPath = path.resolve("src", "data", "gameImageOverrides.json");
const outputPath = path.resolve("src", "data", "exogamefinder.enriched.json");
const reportPath = path.resolve("reports", "bgg-enrichment-report.json");
const ambiguousLookup = new Set(ambiguousTitles.map(normalizeTitle));
const bggApiToken = process.env.BGG_API_TOKEN ?? process.env.BGG_TOKEN;

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchXml(url: string) {
  if (!bggApiToken) {
    throw new Error(
      "BoardGameGeek exige un token API. Définis BGG_API_TOKEN dans le terminal, puis relance npm run enrich:bgg.",
    );
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${bggApiToken}`,
      "user-agent": "ExoGameFinder/1.0 local enrichment",
    },
  });
  if (response.status === 202) {
    await delay(1800);
    return fetchXml(url);
  }
  if (!response.ok) {
    throw new Error(`BGG ${response.status} for ${url}`);
  }
  return parser.parse(await response.text()) as Record<string, unknown>;
}

async function readCache(): Promise<Record<string, CacheEntry>> {
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

async function writeCache(cache: Record<string, CacheEntry>) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

async function searchBgg(title: string) {
  const queries = [title, ...games.find((game) => game.title === title)?.alternativeTitles ?? []];
  const seen = new Map<number, { id: number; title: string; year?: string }>();

  for (const query of queries) {
    const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query)}`;
    const xml = await fetchXml(url);
    const rawItems = (xml.items as { item?: unknown } | undefined)?.item;
    for (const item of toArray(rawItems as { id: string; name?: { value?: string } | { value?: string }[]; yearpublished?: { value?: string } } | undefined)) {
      const name = toArray(item.name)[0]?.value;
      const id = Number(item.id);
      if (name && Number.isFinite(id)) {
        seen.set(id, { id, title: name, year: item.yearpublished?.value });
      }
    }
    await delay(1200);
  }

  return [...seen.values()];
}

async function getThing(id: number) {
  const xml = await fetchXml(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`);
  const item = (xml.items as { item?: { image?: string; thumbnail?: string } } | undefined)?.item;
  return {
    imageUrl: item?.image,
    thumbnailUrl: item?.thumbnail,
    bggUrl: `https://boardgamegeek.com/boardgame/${id}`,
  };
}

function pickCandidate(game: Game, candidates: { id: number; title: string; year?: string }[]) {
  const exact = candidates.filter((candidate) => normalizeTitle(candidate.title) === game.normalizedTitle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

async function main() {
  const cache = await readCache();
  const report: Report = { generatedAt: new Date().toISOString(), enriched: [], notFound: [], ambiguous: [], manualReview: [] };
  const enrichedGames: Game[] = [];

  for (const game of games) {
    const cacheKey = game.normalizedTitle;
    const cached = cache[cacheKey];

    if (ambiguousLookup.has(normalizeTitle(game.title)) || game.dataQuality.includes("ambiguous")) {
      cache[cacheKey] = cached ?? { status: "ambiguous", updatedAt: new Date().toISOString() };
      report.ambiguous.push({ title: game.title, candidates: cached?.candidates });
      enrichedGames.push(game);
      continue;
    }

    if (cached?.status === "enriched") {
      enrichedGames.push({ ...game, bggId: cached.bggId, bggUrl: cached.bggUrl, imageUrl: cached.imageUrl, thumbnailUrl: cached.thumbnailUrl });
      report.enriched.push(game.title);
      continue;
    }

    const candidates = await searchBgg(game.title);
    const picked = pickCandidate(game, candidates);

    if (!picked) {
      const status = candidates.length ? "ambiguous" : "not-found";
      cache[cacheKey] = { status, candidates, updatedAt: new Date().toISOString() };
      if (status === "ambiguous") report.ambiguous.push({ title: game.title, candidates });
      else report.notFound.push(game.title);
      report.manualReview.push(game.title);
      enrichedGames.push(game);
      continue;
    }

    await delay(1200);
    const details = await getThing(picked.id);
    const entry: CacheEntry = {
      status: "enriched",
      bggId: picked.id,
      bggUrl: details.bggUrl,
      imageUrl: details.imageUrl,
      thumbnailUrl: details.thumbnailUrl,
      updatedAt: new Date().toISOString(),
    };
    cache[cacheKey] = entry;
    enrichedGames.push({ ...game, ...entry });
    report.enriched.push(game.title);
  }

  await writeCache(cache);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await mkdir(path.dirname(imageOverridesPath), { recursive: true });
  const imageOverrides = enrichedGames.reduce<ImageOverrides>((overrides, game) => {
    if (game.imageUrl || game.thumbnailUrl) {
      overrides[game.normalizedTitle] = {
        bggId: game.bggId,
        bggUrl: game.bggUrl,
        imageUrl: game.imageUrl,
        thumbnailUrl: game.thumbnailUrl,
      };
    }
    return overrides;
  }, {});

  await writeFile(imageOverridesPath, `${JSON.stringify(imageOverrides, null, 2)}\n`);
  await writeFile(outputPath, `${JSON.stringify(enrichedGames, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.table({
    enriched: report.enriched.length,
    notFound: report.notFound.length,
    ambiguous: report.ambiguous.length,
    manualReview: report.manualReview.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
