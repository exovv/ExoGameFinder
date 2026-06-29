import { MapPin } from "lucide-react";

type LocationFilterProps = {
  locations: string[];
  value?: string;
  onChange(value: string): void;
  includeAll?: boolean;
};

export function LocationFilter({ locations, value = "", onChange, includeAll = true }: LocationFilterProps) {
  return (
    <div className="segmented-list" aria-label="Filtre par lieu">
      {includeAll && (
        <button type="button" className={!value ? "is-selected" : ""} onClick={() => onChange("")}>
          <MapPin size={15} aria-hidden="true" />
          Tous
        </button>
      )}
      {locations.map((location) => (
        <button
          key={location}
          type="button"
          className={value === location ? "is-selected" : ""}
          onClick={() => onChange(location)}
        >
          {location}
        </button>
      ))}
    </div>
  );
}
