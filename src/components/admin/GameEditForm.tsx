import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { DataQuality, Game, LanguageDependency, RulesKnowledge } from "../../types/game";

type GameEditFormProps = {
  game?: Game;
  onSave(game: Game): void;
};

const qualities: DataQuality[] = ["verified", "to-check", "ambiguous", "missing-image", "missing-rules"];

function splitList(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function GameEditForm({ game, onSave }: GameEditFormProps) {
  const [draft, setDraft] = useState<Game | undefined>(game);

  useEffect(() => {
    setDraft(game);
  }, [game]);

  if (!draft) {
    return <div className="empty-editor">Sélectionnez un jeu à éditer.</div>;
  }

  const update = <K extends keyof Game>(key: K, value: Game[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const toggleQuality = (quality: DataQuality) => update("dataQuality", draft.dataQuality.includes(quality) ? draft.dataQuality.filter((item) => item !== quality) : [...draft.dataQuality, quality]);

  return (
    <form className="edit-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <div className="editor-game-title">
        <span>Jeu sélectionné</span>
        <strong>{draft.title}</strong>
      </div>
      <div className="form-grid">
        <label>imageUrl<input value={draft.imageUrl ?? ""} onChange={(event) => update("imageUrl", event.target.value || undefined)} /></label>
        <label>thumbnailUrl<input value={draft.thumbnailUrl ?? ""} onChange={(event) => update("thumbnailUrl", event.target.value || undefined)} /></label>
        <label>bggId<input type="number" value={draft.bggId ?? ""} onChange={(event) => update("bggId", event.target.value ? Number(event.target.value) : undefined)} /></label>
        <label>bggUrl<input value={draft.bggUrl ?? ""} onChange={(event) => update("bggUrl", event.target.value || undefined)} /></label>
        <label>Joueurs min<input type="number" value={draft.playersMin ?? ""} onChange={(event) => update("playersMin", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Joueurs max<input type="number" value={draft.playersMax ?? ""} onChange={(event) => update("playersMax", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Durée min<input type="number" value={draft.durationMin ?? ""} onChange={(event) => update("durationMin", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Durée max<input type="number" value={draft.durationMax ?? ""} onChange={(event) => update("durationMax", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Difficulté apprentissage<input type="range" min="1" max="5" value={draft.learningDifficulty} onChange={(event) => update("learningDifficulty", Number(event.target.value) as Game["learningDifficulty"])} /></label>
        <label>Complexité<input type="range" min="1" max="5" value={draft.gameComplexity} onChange={(event) => update("gameComplexity", Number(event.target.value) as Game["gameComplexity"])} /></label>
        <label>Mécaniques<textarea value={draft.mechanics.join("\n")} onChange={(event) => update("mechanics", splitList(event.target.value))} /></label>
        <label>Ambiances<textarea value={draft.mood.join("\n")} onChange={(event) => update("mood", splitList(event.target.value))} /></label>
        <label>Résumé<textarea value={draft.summary ?? ""} onChange={(event) => update("summary", event.target.value)} /></label>
        <label>Pourquoi choisir ce jeu ?<textarea value={draft.whyPickIt ?? ""} onChange={(event) => update("whyPickIt", event.target.value)} /></label>
        <label>Dépendance langue<select value={draft.languageDependency} onChange={(event) => update("languageDependency", event.target.value as LanguageDependency)}><option value="none">none</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
        <label>Règles connues<select value={draft.rulesKnowledge} onChange={(event) => update("rulesKnowledge", event.target.value as RulesKnowledge)}><option value="known">oui</option><option value="partial">partiel</option><option value="unknown">à vérifier</option></select></label>
        <label>Liens règles<textarea value={(draft.rulesLinks ?? []).join("\n")} onChange={(event) => update("rulesLinks", splitList(event.target.value))} /></label>
        <label>Liens vidéo<textarea value={(draft.videoLinks ?? []).join("\n")} onChange={(event) => update("videoLinks", splitList(event.target.value))} /></label>
      </div>
      <div className="checkbox-panel"><strong>Qualité de donnée</strong>{qualities.map((quality) => <label key={quality}><input type="checkbox" checked={draft.dataQuality.includes(quality)} onChange={() => toggleQuality(quality)} /> {quality}</label>)}</div>
      <button type="submit"><Save aria-hidden="true" size={18} /> Enregistrer</button>
    </form>
  );
}
