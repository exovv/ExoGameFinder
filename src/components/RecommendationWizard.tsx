import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { Game, GameFilters } from "../types/game";
import { getRecommendedGames } from "../utils/getRecommendedGames";
import { GameCard } from "./GameCard";
import { PlayerCountSelector } from "./PlayerCountSelector";

type RecommendationWizardProps = {
  games: Game[];
};

const moods = ["ambiance", "stratégie", "familial", "coopération", "enquête", "duel", "énergie", "expert"];
const durations = [15, 30, 45, 60, 90, 150];
const difficulties: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "moins de 2 min" },
  { value: 2, label: "facile" },
  { value: 3, label: "intermédiaire" },
  { value: 4, label: "long" },
  { value: 5, label: "expert" },
];

export function RecommendationWizard({ games }: RecommendationWizardProps) {
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState<GameFilters>({ players: 4, sort: "relevance" });
  const recommended = getRecommendedGames(games, filters, 8);
  const progress = Math.round(((Math.min(step, 4) + 1) / 5) * 100);
  const update = (patch: GameFilters) => setFilters((current) => ({ ...current, ...patch }));
  const toggleDuration = (duration: number) => {
    const next = (filters.durations ?? []).includes(duration)
      ? (filters.durations ?? []).filter((item) => item !== duration)
      : [...(filters.durations ?? []), duration];
    update({ durations: next, duration: next.length ? Math.max(...next) : undefined });
  };
  const toggleMood = (mood: string) => {
    const next = (filters.moods ?? []).includes(mood)
      ? (filters.moods ?? []).filter((item) => item !== mood)
      : [...(filters.moods ?? []), mood];
    update({ moods: next, mood: next[0] });
  };
  const toggleDifficulty = (difficulty: 1 | 2 | 3 | 4 | 5) => {
    const next = (filters.learningDifficultyMaxes ?? []).includes(difficulty)
      ? (filters.learningDifficultyMaxes ?? []).filter((item) => item !== difficulty)
      : [...(filters.learningDifficultyMaxes ?? []), difficulty];
    const maxDifficulty = next.length ? Math.max(...next) as 1 | 2 | 3 | 4 | 5 : undefined;
    update({ learningDifficultyMaxes: next, gameComplexityMaxes: next, learningDifficultyMax: maxDifficulty, gameComplexityMax: maxDifficulty });
  };

  return (
    <section className="wizard-shell">
      <div className="wizard-topline">
        <span>Étape {Math.min(step + 1, 5)} / 5</span>
        <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
      </div>

      {step === 0 && (
        <div className="wizard-step">
          <h1>Combien de joueurs ?</h1>
          <PlayerCountSelector value={filters.players ?? 4} onChange={(players) => update({ players })} />
        </div>
      )}

      {step === 1 && (
        <div className="wizard-step">
          <h1>Combien de temps ?</h1>
          <div className="choice-grid">
            {durations.map((duration) => (
              <button className={filters.durations?.includes(duration) ? "choice-card is-selected" : "choice-card"} key={duration} type="button" onClick={() => toggleDuration(duration)}>
                {duration >= 150 ? "2 h +" : `${duration} min`}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step">
          <h1>Quelle(s) ambiance(s) ?</h1>
          <div className="choice-grid">
            {moods.map((mood) => (
              <button className={filters.moods?.includes(mood) ? "choice-card is-selected" : "choice-card"} key={mood} type="button" onClick={() => toggleMood(mood)}>
                {mood}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-step">
          <h1>Règles du jeu</h1>
          <div className="choice-grid">
            {difficulties.map((difficulty) => (
              <button className={filters.learningDifficultyMaxes?.includes(difficulty.value) ? "choice-card is-selected" : "choice-card"} key={difficulty.value} type="button" onClick={() => toggleDifficulty(difficulty.value)}>
                <strong>{difficulty.value}/5</strong>
                {difficulty.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="wizard-step wizard-results">
          <div className="result-heading">
            <CheckCircle2 aria-hidden="true" />
            <div>
              <h1>Recommandations</h1>
              <p>{recommended.length} jeux classés pour votre créneau</p>
            </div>
          </div>
          <div className="game-grid">
            {recommended.map((entry) => (
              <GameCard game={entry.game} score={entry.score} reasons={entry.reasons} key={entry.game.id} />
            ))}
          </div>
        </div>
      )}

      <div className="wizard-actions">
        {step > 0 ? (
          <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>
            <ArrowLeft aria-hidden="true" size={18} />
            Retour
          </button>
        ) : null}
        {step < 4 ? (
          <button type="button" onClick={() => setStep(step + 1)}>
            Continuer
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        ) : (
          <button type="button" onClick={() => setStep(0)}>
            Nouvelle recherche
            <RotateCcw aria-hidden="true" size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
