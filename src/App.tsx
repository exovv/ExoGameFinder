import {
  BookOpen,
  Boxes,
  CheckCircle2,
  Home,
  ImagePlus,
  LockKeyhole,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ContributionQueue } from "./components/admin/ContributionQueue";
import { GameAdminTable } from "./components/admin/GameAdminTable";
import { GameEditForm } from "./components/admin/GameEditForm";
import { ImageEnrichmentPanel } from "./components/admin/ImageEnrichmentPanel";
import { EmptyState } from "./components/EmptyState";
import { GameCard } from "./components/GameCard";
import { GameDetail } from "./components/GameDetail";
import { GameFilters } from "./components/GameFilters";
import { RecommendationWizard } from "./components/RecommendationWizard";
import { createGameRepository, type RepositorySnapshot } from "./repositories/gameRepository";
import type { Contribution, DataQuality, Game, GameFilters as GameFiltersType } from "./types/game";
import { filterGames } from "./utils/filterGames";
import "./styles/theme.css";

const homeHeroImage = new URL("../jeux.jpg", import.meta.url).href;
const logoImage = new URL("../logo.png", import.meta.url).href;
const repository = createGameRepository();
const ADMIN_PASSWORD = "exo";
const adminTabs = [
  { id: "games", label: "Jeux", icon: Boxes },
  { id: "contributions", label: "Propositions", icon: CheckCircle2 },
  { id: "images", label: "Images", icon: ImagePlus },
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

  const submitContribution = async (contribution: Contribution) => {
    setSnapshot(await repository.submitContribution(contribution));
  };

  const saveGame = async (game: Game) => {
    setSnapshot(await repository.saveGame(game, "admin"));
  };

  const reviewContribution = async (id: string, status: "approved" | "rejected") => {
    setSnapshot(await repository.reviewContribution(id, status, "admin"));
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
          <Route path="/library" element={<LibraryPage games={snapshot.games} onSubmitContribution={submitContribution} />} />
          <Route path="/game/:id" element={<GamePage games={snapshot.games} onSubmitContribution={submitContribution} />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                snapshot={snapshot}
                onSaveGame={saveGame}
                onSubmitContribution={submitContribution}
                onReviewContribution={reviewContribution}
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
          <p>Trouvez le bon jeu en 10 secondes parmi {games.length} références.</p>
          <Link className="admin-discreet" to="/admin">Administration collaborative</Link>
        </div>
      </section>
    </div>
  );
}

function LibraryPage({ games, onSubmitContribution }: { games: Game[]; onSubmitContribution(contribution: Contribution): void }) {
  const [filters, setFilters] = useState<GameFiltersType>({ sort: "title" });
  const visibleGames = useMemo(() => filterGames(games, filters), [games, filters]);
  const proposeGame = () => {
    const title = window.prompt("Nom du jeu à proposer");
    if (!title?.trim()) return;
    onSubmitContribution({
      id: `contrib-game-${Date.now()}`,
      type: "create-game",
      authorName: "Visiteur",
      status: "pending",
      payload: { title: title.trim() },
      comment: "Jeu proposé depuis la ludothèque.",
      createdAt: new Date().toISOString(),
    });
    window.alert("Merci, la proposition a été envoyée à l'administrateur.");
  };

  return (
    <div className="page-stack">
      <section className="page-title">
        <div className="eyebrow">Ludothèque complète</div>
        <h1>{visibleGames.length} jeux</h1>
        <p>Recherche par nom, nombre de joueurs, durée, difficulté, mécanique et ambiance.</p>
        <div className="hero-actions"><button type="button" onClick={proposeGame}>Proposer un jeu</button></div>
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

function GamePage({ games, onSubmitContribution }: { games: Game[]; onSubmitContribution(contribution: Contribution): void }) {
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

  return <GameDetail game={game} similarGames={similarGames} onSubmitContribution={onSubmitContribution} />;
}

function AdminPage({
  snapshot,
  onSaveGame,
  onSubmitContribution,
  onReviewContribution,
}: {
  snapshot: RepositorySnapshot;
  onSaveGame(game: Game): void;
  onSubmitContribution(contribution: Contribution): void;
  onReviewContribution(id: string, status: "approved" | "rejected"): void;
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

  if (!isAuthenticated) {
    return (
      <section className="admin-login panel">
        <div className="section-heading"><LockKeyhole aria-hidden="true" /><h1>Administration</h1></div>
        <p className="muted">Les visiteurs peuvent proposer des corrections ou des images. La validation est réservée à l’administrateur.</p>
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
      </section>
    );
  }

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="eyebrow">Administration · {repository.mode}</div>
          <h1>Back-office</h1>
          <p>Les visiteurs proposent des jeux, des corrections ou des images. L’administrateur valide ou rejette les propositions.</p>
        </div>
      </section>

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
      {tab === "contributions" && <ContributionQueue contributions={snapshot.contributions} games={snapshot.games} onReview={onReviewContribution} />}
      {tab === "images" && <ImageEnrichmentPanel games={snapshot.games} onSubmitContribution={onSubmitContribution} />}
    </div>
  );
}

export default App;
