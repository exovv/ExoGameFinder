const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(NON_ALPHANUMERIC, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function titleSlug(title: string): string {
  const normalized = normalizeTitle(title).replace(/\s+/g, "-");
  return normalized || "jeu-sans-titre";
}

export function includesNormalized(values: string[], expected: string): boolean {
  const needle = normalizeTitle(expected);
  return values.some((value) => normalizeTitle(value).includes(needle));
}
