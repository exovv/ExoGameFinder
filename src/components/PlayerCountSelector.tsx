import { Minus, Plus, Users } from "lucide-react";

type PlayerCountSelectorProps = {
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
};

export function PlayerCountSelector({ value, onChange, min = 1, max = 12 }: PlayerCountSelectorProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className="player-selector" aria-label="Nombre de joueurs">
      <button type="button" onClick={decrement} aria-label="Retirer un joueur">
        <Minus size={18} aria-hidden="true" />
      </button>
      <div className="player-selector__value">
        <Users size={18} aria-hidden="true" />
        <strong>{value}</strong>
      </div>
      <button type="button" onClick={increment} aria-label="Ajouter un joueur">
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
