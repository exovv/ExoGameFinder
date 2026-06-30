import { Clock3 } from "lucide-react";

type DurationBadgeProps = {
  min: number | null;
  max: number | null;
};

function formatDuration(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Durée à vérifier";
  if (min !== null && max !== null && min !== max) return `${min}-${max} min`;
  return `${max ?? min} min`;
}

export function DurationBadge({ min, max }: DurationBadgeProps) {
  return (
    <span className="meta-badge">
      <Clock3 size={15} aria-hidden="true" />
      {formatDuration(min, max)}
    </span>
  );
}
