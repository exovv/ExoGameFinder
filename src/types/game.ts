export type RulesKnowledge = "known" | "partial" | "unknown";

export type DataQuality =
  | "verified"
  | "to-check"
  | "ambiguous"
  | "missing-image"
  | "missing-rules";

export type GameCategory =
  | "classique"
  | "rapide"
  | "court"
  | "duel"
  | "moyen"
  | "long"
  | "solo-enquete"
  | "expert"
  | "a-ranger";

export type LanguageDependency = "none" | "low" | "medium" | "high";

export type Game = {
  id: string;
  title: string;
  normalizedTitle: string;
  alternativeTitles?: string[];
  locations: string[];
  category: GameCategory;
  playersMin: number | null;
  playersMax: number | null;
  durationMin: number | null;
  durationMax: number | null;
  learningDifficulty: 1 | 2 | 3 | 4 | 5;
  gameComplexity: 1 | 2 | 3 | 4 | 5;
  mechanics: string[];
  mood: string[];
  rulesKnowledge: RulesKnowledge;
  soloPlayable: boolean;
  coop: boolean;
  duelOnly: boolean;
  languageDependency: LanguageDependency;
  imageUrl?: string;
  thumbnailUrl?: string;
  bggId?: number;
  bggUrl?: string;
  myludoId?: number;
  myludoCode?: string;
  myludoUrl?: string;
  subtitle?: string;
  editionYear?: number;
  ageMin?: number;
  contents?: string[];
  publishers?: string[];
  authors?: string[];
  illustrators?: string[];
  rulesLinks?: string[];
  videoLinks?: string[];
  summary?: string;
  dataQuality: DataQuality[];
  sourceNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SortKey =
  | "relevance"
  | "title"
  | "duration"
  | "difficulty"
  | "playersMax";

export type PlayMode =
  | "solo"
  | "duel"
  | "coop"
  | "competitive"
  | "team"
  | "bluff"
  | "investigation";

export type GameFilters = {
  search?: string;
  players?: number;
  duration?: number;
  durations?: number[];
  learningDifficultyMax?: 1 | 2 | 3 | 4 | 5;
  learningDifficultyMaxes?: (1 | 2 | 3 | 4 | 5)[];
  gameComplexityMax?: 1 | 2 | 3 | 4 | 5;
  gameComplexityMaxes?: (1 | 2 | 3 | 4 | 5)[];
  mood?: string;
  moods?: string[];
  location?: string;
  mechanics?: string[];
  mode?: PlayMode;
  coop?: boolean;
  duel?: boolean;
  solo?: boolean;
  investigation?: boolean;
  includeAlmostCompatible?: boolean;
  sort?: SortKey;
};

export type ScoredGame = {
  game: Game;
  score: number;
  reasons: string[];
  playersCompatible: boolean;
  playersKnown: boolean;
};

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  gameId?: string;
  gameTitle?: string;
  previousValue?: Record<string, unknown>;
  nextValue?: Record<string, unknown>;
  createdAt: string;
};

export type LocationRecord = {
  id: string;
  name: string;
  active: boolean;
};
