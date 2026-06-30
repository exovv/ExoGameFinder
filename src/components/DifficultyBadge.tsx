import type { Game } from "../types/game";

type DifficultyBadgeProps = {
  label: string;
  value: Game["learningDifficulty"] | Game["gameComplexity"];
};

const labels = ["", "Très facile", "Facile", "Intermédiaire", "Long", "Expert"];

export function DifficultyBadge({ label, value }: DifficultyBadgeProps) {
  return (
    <span className="difficulty-badge" title={`${label}: ${labels[value]}`}>
      <span>{label}</span>
      <span className="difficulty-dots" aria-label={`${value} sur 5`}>
        {[1, 2, 3, 4, 5].map((level) => (
          <span key={level} className={level <= value ? "is-active" : ""} />
        ))}
      </span>
    </span>
  );
}
