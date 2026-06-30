import {
  BookOpen,
  Boxes,
  Home,
  LockKeyhole,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { GameAdminTable } from "./components/admin/GameAdminTable";
import { GameEditForm } from "./components/admin/GameEditForm";
import { EmptyState } from "./components/EmptyState";
import { GameCard } from "./components/GameCard";
import { GameDetail } from "./components/GameDetail";
import { GameFilters } from "./components/GameFilters";
import { RecommendationWizard } from "./components/RecommendationWizard";
import { createGameRepository, type RepositoryImport, type RepositorySnapshot } from "./repositories/gameRepository";
import type { DataQuality, Game, GameFilters as GameFiltersType } from "./types/game";
import { filterGames } from "./utils/filterGames";
import "./styles/theme.css";

const homeHeroImage = new URL("../jeux.jpg", import.meta.url).href;
const logoImage = new URL("../logo.png", import.meta.url).href;
const repository = createGameRepository();
const ADMIN_PASSWORD = "exo";
const adminTabs = [
  { id: "games", label: "Jeux", icon: Boxes },
] as const;

type AdminTab = (typeof adminTabs)[number]["id"];
type AdminStatusFilter = "" | "published" | "review" | "image";

function matchesAdminStatus(game: Game, status: AdminStatusFilter): boolean {
  if (!status) return true;
  if (status === "image") return !game.imageUrl && !game.thumbnailUrl;
  if (status === "review") return game.dataQuality.some((quality) => quality !== "verified");
  return game.dataQuality.includes("verified") && !game.dataQuality.some((quality) => quality !== "verified");
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [pathname]);

  return null;
}

function App() {
  const [snapshot, setSnapshot] = useState<RepositorySnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    repository.getSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="app-loading">Chargement ExoGameFinder…</div>;
  }

  const saveGame = async (game: Game) => {
    setSnapshot(await repository.saveGame(game, "admin"));
  };

  const importSnapshot = async (snapshotImport: RepositoryImport) => {
    setSnapshot(await repository.importSnapshot(snapshotImport, "admin"));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/">
          <img className="brand-logo" src={logoImage} alt="" />
          <span>ExoGameFinder</span>
        </Link>
        <button className="nav-toggle" type="button" aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          Menu
        </button>
        <nav id="main-navigation" className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navigation principale">
          <div className="main-nav__center">
            <NavLink to="/" onClick={() => setMenuOpen(false)}><Home size={17} aria-hidden="true" /> Accueil</NavLink>
            <NavLink to="/finder" onClick={() => setMenuOpen(false)}><Sparkles size={17} aria-hidden="true" /> Finder</NavLink>
            <NavLink to="/library" onClick={() => setMenuOpen(false)}><BookOpen size={17} aria-hidden="true" /> Ludothèque</NavLink>
          </div>
          <NavLink className={({ isActive }) => isActive ? "main-nav__admin active" : "main-nav__admin"} to="/admin" onClick={() => setMenuOpen(false)}><Settings size={17} aria-hidden="true" /> Admin</NavLink>
        </nav>
      </header>

      <ScrollToTop />
      <main>
        <Routes>
          <Route path="/" element={<HomePage games={snapshot.games} />} />
          <Route path="/finder" element={<RecommendationWizard games={snapshot.games} />} />
          <Route path="/library" element={<LibraryPage games={snapshot.games} />} />
          <Route path="/game/:id" element={<GamePage games={snapshot.games} />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                snapshot={snapshot}
                onSaveGame={saveGame}
                onImportSnapshot={importSnapshot}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function HomePage({ games }: { games: Game[] }) {
  return (
    <div className="home-page">
      <section className="hero-section home-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.18)), url(${homeHeroImage})` }}>
        <div className="hero-copy">
          <div className="hero-actions hero-actions--primary">
            <Link className="primary-link" to="/finder"><Sparkles aria-hidden="true" size={21} /> Trouver un jeu</Link>
            <Link className="secondary-link" to="/library"><BookOpen aria-hidden="true" size={21} /> Voir la ludothèque</Link>
          </div>
          <div className="eyebrow">Le sélecteur de jeux du CSE</div>
          <h1>ExoGameFinder</h1>
          <p>Trouvez les meilleurs jeux parmi {games.length} références.</p>
        </div>
      </section>
    </div>
  );
}

function LibraryPage({ games }: { games: Game[] }) {
  const [filters, setFilters] = useState<GameFiltersType>({ sort: "title" });
  const visibleGames = useMemo(() => filterGames(games, filters), [games, filters]);

  return (
    <div className="page-stack">
      <section className="page-title">
        <div className="eyebrow">Ludothèque complète</div>
        <h1>{visibleGames.length} jeux</h1>
        <p>Recherche par nom, nombre de joueurs, durée, difficulté, mécanique et ambiance.</p>
      </section>
      <GameFilters games={games} filters={filters} onChange={setFilters} />
      {visibleGames.length ? (
        <div className="game-grid">
          {visibleGames.map((game) => <GameCard game={game} key={game.id} />)}
        </div>
      ) : (
        <EmptyState title="Aucun jeu trouvé" message="Essayez une autre durée ou activez les jeux presque compatibles." />
      )}
    </div>
  );
}

function GamePage({ games }: { games: Game[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const game = games.find((item) => item.id === id);

  if (!game) {
    return (
      <EmptyState
        title="Jeu introuvable"
        message="La fiche demandée n’existe pas dans la base locale."
        action={<button type="button" onClick={() => navigate("/library")}>Retour ludothèque</button>}
      />
    );
  }

  const similarGames = filterGames(games, {
    mood: game.mood[0],
    players: game.playersMin ?? undefined,
    includeAlmostCompatible: true,
    sort: "relevance",
  }).filter((item) => item.id !== game.id).slice(0, 4);

  return <GameDetail game={game} similarGames={similarGames} />;
}

function AdminPage({
  snapshot,
  onSaveGame,
  onImportSnapshot,
}: {
  snapshot: RepositorySnapshot;
  onSaveGame(game: Game): void;
  onImportSnapshot(snapshot: RepositoryImport): void;
}) {
  const [tab, setTab] = useState<AdminTab>("games");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | undefined>(snapshot.games[0]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>("");
  const adminGames = filterGames(snapshot.games, { search: adminSearch });
  const visibleAdminGames = adminGames.filter((game) => matchesAdminStatus(game, adminStatusFilter));

  const archiveGame = (game: Game) => {
    onSaveGame({ ...game, dataQuality: [...new Set([...game.dataQuality, "to-check" as DataQuality])], sourceNotes: `${game.sourceNotes ?? ""} | À vérifier depuis l'administration` });
  };

  const exportSnapshot = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exogamefinder-local-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLocalSnapshot = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        onImportSnapshot(JSON.parse(String(reader.result)) as RepositoryImport);
      } catch {
        window.alert("Import impossible: le fichier JSON est invalide.");
      }
    });
    reader.readAsText(file);
  };

  if (!isAuthenticated) {
    return (
      <section className="admin-login panel">
        <div className="section-heading"><LockKeyhole aria-hidden="true" /><h1>Administration locale</h1></div>
        <p className="muted">Cet espace sert uniquement à modifier la base locale, importer ou exporter un fichier JSON.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setAuthError("");
          } else {
            setAuthError("Mot de passe incorrect.");
          }
        }}>
          <label>Mot de passe administrateur<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          {authError ? <p className="alert-text">{authError}</p> : null}
          <button type="submit">Entrer</button>
        </form>
        <p className="admin-credit">création de l'app : Vincent Vallet</p>
      </section>
    );
  }

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="eyebrow">Administration locale · {repository.mode}</div>
          <h1>Base locale</h1>
          <p>Modifiez les fiches, contrôlez les données et sauvegardez l’état courant par export JSON.</p>
        </div>
      </section>

      <AdminDashboard games={snapshot.games} auditLog={snapshot.auditLog} onExport={exportSnapshot} onImport={importLocalSnapshot} />

      <div className="admin-tabs" role="tablist">
        {adminTabs.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} className={tab === tabId ? "is-selected" : ""} type="button" onClick={() => setTab(tabId)}>
            <Icon aria-hidden="true" size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "games" && (
        <section className="admin-split">
          <div className="panel">
            <div className="admin-filter-row">
              <div className="search-field"><Search aria-hidden="true" size={18} /><input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Filtrer les jeux" /></div>
              <select value={adminStatusFilter} onChange={(event) => setAdminStatusFilter(event.target.value as AdminStatusFilter)}>
                <option value="">Tous les états</option>
                <option value="published">Validés</option>
                <option value="review">À vérifier</option>
                <option value="image">Image à proposer</option>
              </select>
            </div>
            <GameAdminTable games={visibleAdminGames} selectedId={selectedGame?.id} onSelect={setSelectedGame} onArchive={archiveGame} />
          </div>
          <div className="panel editor-panel"><GameEditForm game={selectedGame} onSave={onSaveGame} /></div>
        </section>
      )}
      <p className="admin-credit">création de l'app : Vincent Vallet</p>
    </div>
  );
}

export default App;
