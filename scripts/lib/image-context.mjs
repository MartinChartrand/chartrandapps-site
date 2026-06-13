// image-context.mjs — ADR-5 : le vision-check sémantique vit au niveau IMAGE (test de l'ami-témoin).
// L'`alt` d'une image EST son claim ("Vieux port de Chania") ; le fichier doit le montrer, sinon
// n'importe qui qui connaît la place le voit. Le contexte d'entité (quel POI/dish affiche l'image)
// enrichit le jugement vision. La garde de fraîcheur du sceau est partagée pour rester cohérente
// entre la garde offline (validate-image-claims.mjs) et l'écrivain réseau (vision-images.mjs).
// Pure : zéro I/O.

/** Libellé lisible d'une entité (POI: name ; dish/gem: title ; sinon id). */
function entityLabel(e) {
  return e.title ?? e.name ?? e.id;
}

/** Slot d'une image (slot ?? id) — clé de rattachement entité↔image. */
export function imageSlot(img) {
  return img.slot ?? img.id;
}

/**
 * Indexe les entités par le slot d'image qu'elles affichent.
 * Une même image peut être affichée par plusieurs entités → tableau.
 * @param {{pois?:Array, dishes?:Array, gems?:Array}} collections
 * @returns {Map<string, Array<{collection:string, id:string, label:string, story?:string}>>}
 */
export function indexEntitiesByImageSlot({ pois = [], dishes = [], gems = [] }) {
  const map = new Map();
  for (const [collection, arr] of [
    ['pois', pois],
    ['dishes', dishes],
    ['gems', gems],
  ]) {
    for (const e of arr) {
      if (!e.image) continue;
      if (!map.has(e.image)) map.set(e.image, []);
      map.get(e.image).push({ collection, id: e.id, label: entityLabel(e), story: e.story });
    }
  }
  return map;
}

/**
 * Évalue la fraîcheur du sceau sémantique d'une image — garde OFFLINE, aucun réseau.
 * États (3-états du repo : seul `probleme` est rouge/bloquant) :
 *  - inverifiable : jamais vérifiée (ni prouvée bonne ni mauvaise — état juste)
 *  - probleme     : sceau périmé (sha/alt changé) OU mismatch confirmé
 *  - ok           : sceau frais, verdict match ou unverifiable (revue, pas de mensonge)
 * @param {object} img — entrée du manifeste images.json
 * @returns {{state:'ok'|'probleme'|'inverifiable', detail:string}}
 */
export function evaluateSemanticSeal(img) {
  const seal = img.visionCheckedSemantic;
  if (!seal) {
    return { state: 'inverifiable', detail: 'jamais vérifiée sémantiquement (rouler vision:images)' };
  }
  if (seal.sha256 !== img.sha256) {
    return { state: 'probleme', detail: 'vision-check périmé : image changée depuis le sceau (re-check requis)' };
  }
  if (seal.alt !== img.alt) {
    return { state: 'probleme', detail: 'vision-check périmé : alt (claim) changé depuis le sceau (re-check requis)' };
  }
  if (seal.verdict === 'mismatch') {
    return { state: 'probleme', detail: "image ↔ claim : mismatch confirmé — corriger l'image ou l'alt" };
  }
  return { state: 'ok', detail: `claim vérifié (${seal.verdict}, ${seal.checkedAt})` };
}
