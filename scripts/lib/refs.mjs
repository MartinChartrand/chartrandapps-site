// Résolution des refs `[[poi:id]]` dans la prose (§3.0, §3.3).
// Module UNIQUE : réutilisé par le composant Curatorial (ticket 30, rendu) et le lint inverse
// (ticket 60). Aucune logique de ref dupliquée ailleurs.

// ids POI = kebab/alphanum minuscule (cohérent avec POI_REF_RE côté validation)
export const POI_REF_RE = /\[\[poi:([a-z0-9-]+)\]\]/g;

/** Extrait les ids POI référencés dans un texte markdown (dédupliqués, ordre d'apparition). */
export function extractPoiRefs(markdown) {
  if (!markdown) return [];
  const out = [];
  for (const m of markdown.matchAll(POI_REF_RE)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/**
 * Résout les refs contre un ensemble d'ids connus.
 * @param {string} markdown
 * @param {Iterable<string>} knownIds
 * @returns {{ resolved: string[], unresolved: string[] }}
 */
export function resolvePoiRefs(markdown, knownIds) {
  const known = knownIds instanceof Set ? knownIds : new Set(knownIds);
  const resolved = [];
  const unresolved = [];
  for (const id of extractPoiRefs(markdown)) {
    (known.has(id) ? resolved : unresolved).push(id);
  }
  return { resolved, unresolved };
}

/** Remplace chaque `[[poi:id]]` par `fn(id)` (utilisé au rendu, ticket 30). */
export function replacePoiRefs(markdown, fn) {
  if (!markdown) return markdown;
  return markdown.replace(POI_REF_RE, (_match, id) => fn(id));
}
