import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { games } from "../src/data/games";
import type { Game } from "../src/types/game";
import { normalizeTitle } from "../src/utils/normalizeTitle";

type MyludoImage = {
  S160?: string;
  S300?: string;
  jpg?: string;
};

type MyludoCollectionItem = {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  edition?: number;
  type?: string;
  image?: MyludoImage;
  time_min?: string;
  time_max?: string;
};

type MyludoGameDetails = MyludoCollectionItem & {
  age_min?: string;
  players_min?: string;
  players_max?: string;
};

type MyludoPerson = {
  title: string;
  roles?: string[];
};

type MyludoInfo = {
  description?: string;
  content?: string;
  themes?: Record<string, Record<string, string>>;
  people?: Record<string, MyludoPerson>;
};

type MyludoOverride = Partial<Pick<Game,
  | "myludoId"
  | "myludoCode"
  | "myludoUrl"
  | "subtitle"
  | "editionYear"
  | "ageMin"
  | "contents"
  | "publishers"
  | "authors"
  | "illustrators"
  | "playersMin"
  | "playersMax"
  | "durationMin"
  | "durationMax"
  | "mechanics"
  | "mood"
  | "summary"
  | "imageUrl"
  | "thumbnailUrl"
  | "sourceNotes"
>>;

type Report = {
  generatedAt: string;
  collectionCount: number;
  localGames: number;
  matched: { title: string; myludoTitle: string; myludoId: string }[];
  unmatched: string[];
  myludoOnly: { title: string; id: string; code: string; subtitle?: string }[];
};

const BASE_URL = "https://www.myludo.fr";
const PROFILE_ID = "41244";
const outputPath = path.resolve("src", "data", "myludoGameOverrides.json");
const reportPath = path.resolve("reports", "myludo-enrichment-report.json");
const manualMatches: Record<string, string> = {
  "7 wonders extensions leaders cities armada": "41062",
  "catane extensions 5 6 joueurs marine marine 5 6 joueurs": "19279",
  "dice forge extension": "43",
  "dominion extension prosperite": "1939",
  "dune": "43977",
  "i m banana": "42254",
  "it s a wonderful world extension loisirs et corruption": "29009",
  "les aventuriers du rail": "46498",
  "mille sabords": "2734",
  "miniville deluxe": "41779",
  "micromacro": "42016",
  "ligretto": "29483",
  "mr jack": "52674",
  "queendomino": "25858",
  "romeo et juliette": "37371",
  "sauve mouton": "37452",
  "terraforming mars": "100",
  "terraforming mars des": "66071",
  "timebomb": "327",
  "tours ambulantes": "60693",
  "unlock": "225",
  "welcome": "19524",
  "wasgij": "66657",
};

function toNumber(value: string | number | undefined): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function listItemsFromHtml(value: string | undefined): string[] {
  if (!value) return [];
  const matches = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  return unique(matches.map((match) => stripTags(match[1])).filter((item) => item.length > 1));
}

function valuesFromThemes(info: MyludoInfo, key: string): string[] {
  return unique(Object.values(info.themes?.[key] ?? {}));
}

function peopleByRole(info: MyludoInfo, role: string): string[] {
  return unique(
    Object.values(info.people ?? {})
      .filter((person) => person.roles?.some((personRole) => normalizeTitle(personRole) === normalizeTitle(role)))
      .map((person) => person.title),
  );
}

function headers(token: string, cookie: string) {
  return {
    accept: "application/json, text/javascript, */*; q=0.01",
    cookie,
    referer: `${BASE_URL}/`,
    "user-agent": "Mozilla/5.0 ExoGameFinder local enrichment",
    "x-csrf-token": token,
    "x-requested-with": "XMLHttpRequest",
  };
}

async function createSession() {
  const response = await fetch(`${BASE_URL}/`, { headers: { "user-agent": "Mozilla/5.0 ExoGameFinder local enrichment" } });
  const html = await response.text();
  const token = html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1];
  const headerWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headerWithCookies.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const cookie = cookies.filter(Boolean).map((value) => value.split(";")[0]).join("; ");

  if (!token) {
    throw new Error("Token CSRF Myludo introuvable.");
  }

  return { token, cookie };
}

async function fetchMyludoJson<T>(pathName: string, params: Record<string, string>, session: { token: string; cookie: string }, attempt = 0) {
  const url = new URL(pathName, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url, { headers: headers(session.token, session.cookie) });
  if (response.status === 429 && attempt < 5) {
    await delay(2500 + attempt * 1500);
    return fetchMyludoJson<T>(pathName, params, session, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Myludo ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}

function candidateKeys(item: MyludoCollectionItem): string[] {
  return unique([
    item.code?.replace(/-/g, " ") ?? "",
    item.title,
    item.subtitle ? `${item.title} ${item.subtitle}` : "",
  ].map(normalizeTitle));
}

function gameKeys(game: Game): string[] {
  return unique([game.title, game.normalizedTitle, ...(game.alternativeTitles ?? [])].map(normalizeTitle));
}

function tokenScore(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function matchMyludoGame(game: Game, collection: MyludoCollectionItem[]) {
  const manualCode = manualMatches[game.normalizedTitle] ?? manualMatches[game.id];
  if (manualCode) {
    return collection.find((item) => item.id === manualCode || item.code === manualCode);
  }

  const keys = gameKeys(game);
  const exact = collection.find((item) => candidateKeys(item).some((key) => keys.includes(key)));
  if (exact) return exact;

  const scored = collection
    .map((item) => ({
      item,
      score: Math.max(...keys.flatMap((key) => candidateKeys(item).map((candidateKey) => tokenScore(key, candidateKey)))),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score >= 0.72 && scored[0].score - (scored[1]?.score ?? 0) >= 0.2) {
    return scored[0].item;
  }

  return undefined;
}

function formatPlayers(min?: number, max?: number): string {
  if (!min || !max) return "un nombre de joueurs à préciser";
  return min === max ? `${min} joueur${min > 1 ? "s" : ""}` : `${min} à ${max} joueurs`;
}

function formatDuration(min?: number, max?: number): string {
  if (!min && !max) return "une durée à préciser";
  if (min && max && min !== max) return `${min} à ${max} minutes`;
  return `${min ?? max} minutes`;
}

function categoryLabel(category: Game["category"]): string {
  return category.replace("solo-enquete", "solo ou enquête").replace("a-ranger", "à ranger").replace("-", " ");
}

function generateSummary(game: Game, override: MyludoOverride): string {
  const players = formatPlayers(override.playersMin ?? game.playersMin ?? undefined, override.playersMax ?? game.playersMax ?? undefined);
  const duration = formatDuration(override.durationMin ?? game.durationMin ?? undefined, override.durationMax ?? game.durationMax ?? undefined);
  const mechanics = unique([...(override.mechanics ?? []), ...game.mechanics]).slice(0, 3);
  const subtitle = override.subtitle ? `, dans l'édition ${override.subtitle}` : "";
  const mechanicPart = mechanics.length ? ` autour de ${mechanics.join(", ")}` : "";

  return `${game.title}${subtitle} est un jeu ${categoryLabel(game.category)} pour ${players}, jouable en environ ${duration}${mechanicPart}.`;
}

function makeOverride(game: Game, item: MyludoCollectionItem | undefined, details?: MyludoGameDetails, info?: MyludoInfo): MyludoOverride {
  const playersMin = toNumber(details?.players_min) ?? game.playersMin ?? undefined;
  const playersMax = toNumber(details?.players_max) ?? game.playersMax ?? undefined;
  const durationMin = toNumber(details?.time_min ?? item?.time_min) ?? game.durationMin ?? undefined;
  const durationMax = toNumber(details?.time_max ?? item?.time_max) ?? game.durationMax ?? undefined;
  const mechanics = unique([...
    valuesFromThemes(info ?? {}, "mecanisme"),
    ...valuesFromThemes(info ?? {}, "categorie"),
    ...game.mechanics,
  ]);
  const baseOverride: MyludoOverride = {
    playersMin,
    playersMax,
    durationMin,
    durationMax,
    mechanics,
    mood: game.mood,
  };

  const override: MyludoOverride = item ? {
    ...baseOverride,
    myludoId: Number(item.id),
    myludoCode: item.code,
    myludoUrl: `${BASE_URL}/#!/game/${item.code}-${item.id}`,
    subtitle: item.subtitle || undefined,
    editionYear: item.edition,
    ageMin: toNumber(details?.age_min),
    contents: listItemsFromHtml(info?.content),
    publishers: peopleByRole(info ?? {}, "Éditeur"),
    authors: peopleByRole(info ?? {}, "Auteur"),
    illustrators: peopleByRole(info ?? {}, "Illustrateur"),
    imageUrl: details?.image?.S300 ?? details?.image?.jpg ?? item.image?.S300,
    thumbnailUrl: details?.image?.S160 ?? item.image?.S160,
    sourceNotes: `Enrichissement Myludo: ${item.title}${item.edition ? ` (${item.edition})` : ""}`,
  } : {
    ...baseOverride,
    sourceNotes: "Description générée depuis l'inventaire local, sans correspondance Myludo confirmée.",
  };

  if (!item) return override;

  return {
    ...override,
    summary: generateSummary(game, override),
  };
}

async function main() {
  const session = await createSession();
  const collectionResponse = await fetchMyludoJson<{ count: string; list: MyludoCollectionItem[] }>("/views/profil/datas.php", {
    type: "collection",
    id: PROFILE_ID,
    page: "1",
    limit: "144",
    filter: "",
    family: "",
    availability: "",
    storage: "",
    words: "",
    players: "",
    age: "",
    duration: "",
    context: "",
    order: "bydatedesc",
  }, session);
  const collection = collectionResponse.list ?? [];
  const report: Report = {
    generatedAt: new Date().toISOString(),
    collectionCount: Number(collectionResponse.count) || collection.length,
    localGames: games.length,
    matched: [],
    unmatched: [],
    myludoOnly: [],
  };
  const usedMyludoIds = new Set<string>();
  const overrides: Record<string, MyludoOverride> = {};

  for (const game of games) {
    const item = matchMyludoGame(game, collection);

    if (!item) {
      report.unmatched.push(game.title);
      overrides[game.normalizedTitle] = makeOverride(game, undefined);
      continue;
    }

    usedMyludoIds.add(item.id);
    await delay(450);
    const details = await fetchMyludoJson<MyludoGameDetails>("/views/game/datas.php", { type: "game", id: item.id }, session);
    await delay(450);
    const info = await fetchMyludoJson<MyludoInfo>("/views/game/datas.php", {
        type: "info",
        id: item.id,
        page: "1",
        limit: "",
        family: "",
        filter: "",
        department: "",
        pro: "",
        location: "",
        datefrom: "",
        dateto: "",
        stakes: "",
        online: "",
        order: "bytitle",
      }, session);
    overrides[game.normalizedTitle] = makeOverride(game, item, details, info);
    report.matched.push({ title: game.title, myludoTitle: item.title, myludoId: item.id });
  }

  report.myludoOnly = collection
    .filter((item) => !usedMyludoIds.has(item.id))
    .map((item) => ({ title: item.title, id: item.id, code: item.code, subtitle: item.subtitle || undefined }))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(overrides, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.table({
    localGames: report.localGames,
    collection: report.collectionCount,
    matched: report.matched.length,
    unmatched: report.unmatched.length,
    myludoOnly: report.myludoOnly.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});