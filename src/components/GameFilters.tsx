import { ListFilter, Search } from "lucide-react";
import type { Game, GameFilters as GameFiltersType, SortKey } from "../types/game";

type GameFiltersProps = {
  games: Game[];
  filters: GameFiltersType;
  onChange(filters: GameFiltersType): void;
};

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "title", label: "Alphabétique" },
  { value: "relevance", label: "Pertinence" },
  { value: "duration", label: "Durée" },
  { value: "difficulty", label: "Difficulté" },
  { value: "playersMax", label: "Joueurs max" },
];

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function GameFilters({ games, filters, onChange }: GameFiltersProps) {
  const moods = unique(games.flatMap((game) => game.mood));
  const mechanics = unique(games.flatMap((game) => game.mechanics));
  const update = (patch: GameFiltersType) => onChange({ ...filters, ...patch });

  return (
    <section className="filter-panel" aria-label="Filtres ludothèque">
      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          value={filters.search ?? ""}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Rechercher un jeu ou une mécanique"
        />
      </div>
      <div className="filter-grid">
        <label>
          Joueurs
          <input
            type="number"
            min="1"
            max="12"
            value={filters.players ?? ""}
            onChange={(event) => update({ players: event.target.value ? Number(event.target.value) : undefined })}
          />
        </label>
        <label>
          Durée max
          <select value={filters.duration ?? ""} onChange={(event) => update({ duration: event.target.value ? Number(event.target.value) : undefined })}>
            <option value="">Toutes</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 h</option>
            <option value="90">1 h 30</option>
            <option value="150">2 h +</option>
          </select>
        </label>
        <label>
          Difficulté max
          <select value={filters.learningDifficultyMax ?? ""} onChange={(event) => update({ learningDifficultyMax: event.target.value ? (Number(event.target.value) as 1 | 2 | 3 | 4 | 5) : undefined })}>
            <option value="">Toutes</option>
            <option value="1">1 · express</option>
            <option value="2">2 · facile</option>
            <option value="3">3 · intermédiaire</option>
            <option value="4">4 · long</option>
            <option value="5">5 · expert</option>
          </select>
        </label>
        <label>
          Complexité max
          <select value={filters.gameComplexityMax ?? ""} onChange={(event) => update({ gameComplexityMax: event.target.value ? (Number(event.target.value) as 1 | 2 | 3 | 4 | 5) : undefined })}>
            <option value="">Toutes</option>
            <option value="1">Très léger</option>
            <option value="2">Familial</option>
            <option value="3">Initié</option>
            <option value="4">Expert léger</option>
            <option value="5">Expert</option>
          </select>
        </label>
        <label>
          Ambiance
          <select value={filters.mood ?? ""} onChange={(event) => update({ mood: event.target.value || undefined })}>
            <option value="">Toutes</option>
            {moods.map((mood) => <option key={mood}>{mood}</option>)}
          </select>
        </label>
        <label>
          Mécanique
          <select value={filters.mechanics?.[0] ?? ""} onChange={(event) => update({ mechanics: event.target.value ? [event.target.value] : undefined })}>
            <option value="">Toutes</option>
            {mechanics.map((mechanic) => <option key={mechanic}>{mechanic}</option>)}
          </select>
        </label>
        <label>
          Tri
          <select value={filters.sort ?? "title"} onChange={(event) => update({ sort: event.target.value as SortKey })}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={Boolean(filters.coop)} onChange={(event) => update({ coop: event.target.checked || undefined })} /> Coopératif</label>
        <label><input type="checkbox" checked={Boolean(filters.duel)} onChange={(event) => update({ duel: event.target.checked || undefined })} /> Duel</label>
        <label><input type="checkbox" checked={Boolean(filters.solo)} onChange={(event) => update({ solo: event.target.checked || undefined })} /> Solo</label>
        <label><input type="checkbox" checked={Boolean(filters.investigation)} onChange={(event) => update({ investigation: event.target.checked || undefined })} /> Enquête</label>
        <label><input type="checkbox" checked={Boolean(filters.includeAlmostCompatible)} onChange={(event) => update({ includeAlmostCompatible: event.target.checked || undefined })} /> Presque compatibles</label>
      </div>
      <p className="filter-hint"><ListFilter size={15} aria-hidden="true" /> {games.length} jeux dans la base normalisée</p>
    </section>
  );
}
