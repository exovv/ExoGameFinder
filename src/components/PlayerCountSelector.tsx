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
  const presets = [2, 3, 4, 5, 6, 8, 10].filter((preset) => preset >= min && preset <= max);

  return (
    <div className="player-picker" aria-label="Nombre de joueurs">
      <div className="player-selector">
        <button className="player-selector__button" type="button" onClick={decrement} aria-label="Retirer un joueur" disabled={value <= min}>
          <Minus size={24} aria-hidden="true" />
        </button>
        <div className="player-selector__value">
          <Users size={22} aria-hidden="true" />
          <strong>{value}</strong>
          <span>joueurs</span>
        </div>
        <button className="player-selector__button" type="button" onClick={increment} aria-label="Ajouter un joueur" disabled={value >= max}>
          <Plus size={24} aria-hidden="true" />
        </button>
      </div>
      <div className="player-presets" aria-label="Formats rapides">
        {presets.map((preset) => (
          <button className={value === preset ? "is-selected" : ""} type="button" key={preset} onClick={() => onChange(preset)}>
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
