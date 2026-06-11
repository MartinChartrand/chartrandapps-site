// Validation CROSS-entrée / cross-collection d'une destination (§3.3 :194).
// Les schémas zod (schemas.mjs) garantissent le PAR-entrée (coords si onMap, asOf, lastChecked).
// Ici on valide ce qu'un schéma par-entrée ne peut pas voir : ids uniques intra-destination,
// refs `[[poi:]]` résolues, items infoBlocks résolus, poiRefs résolus, slots d'images existants.
// Réutilisé par les validate:* scripts (ticket 60) et exercé par les node:test (scripts/test/).
import { extractPoiRefs } from './refs.mjs';
import { verdict, makeReport } from './report.mjs';

/**
 * @param {object} dataset
 * @param {string} dataset.dest        slug de destination (ids scopés par dest → pas de collision inter-dest)
 * @param {Array}  dataset.pois        objets POI (déjà valides par-entrée)
 * @param {Array}  dataset.bases       { slug, cover, body, infoBlocks }
 * @param {Array}  dataset.images      manifest { slot, ... }
 * @param {Array}  dataset.dishes
 * @param {Array}  dataset.gems
 * @param {string} [dataset.ranAt]
 */
export function validateDataset({ dest, pois = [], bases = [], images = [], dishes = [], gems = [], ranAt = '' }) {
  const verdicts = [];
  const p = (id, detail) => verdicts.push(verdict(id, 'probleme', detail));

  // ids POI uniques intra-destination
  const poiIds = new Set();
  for (const poi of pois) {
    if (poiIds.has(poi.id)) p(poi.id, `id POI dupliqué intra-destination: ${poi.id}`);
    poiIds.add(poi.id);
  }

  const slots = new Set(images.map((i) => i.slot));

  // refs prose + infoBlocks + cover des bases
  for (const base of bases) {
    const ref = `base:${base.slug ?? '?'}`;
    for (const id of extractPoiRefs(base.body)) {
      if (!poiIds.has(id)) p(ref, `ref morte [[poi:${id}]] dans le narratif`);
    }
    for (const block of base.infoBlocks ?? []) {
      if (block.type !== 'poi-list') continue;
      for (const id of block.items ?? []) {
        if (!poiIds.has(id)) p(ref, `infoBlock "${block.label}" pointe un POI inconnu: ${id}`);
      }
    }
    if (base.cover && !slots.has(base.cover)) p(ref, `slot image inconnu (cover): ${base.cover}`);
  }

  // slots d'images des POIs
  for (const poi of pois) {
    if (poi.image && !slots.has(poi.image)) p(poi.id, `slot image inconnu: ${poi.image}`);
  }

  // dishes / gems : slot d'image + poiRef
  for (const item of [...dishes, ...gems]) {
    if (item.image && !slots.has(item.image)) p(item.id, `slot image inconnu: ${item.image}`);
    if (item.poiRef && !poiIds.has(item.poiRef)) p(item.id, `poiRef mort: ${item.poiRef}`);
  }

  if (verdicts.length === 0) verdicts.push(verdict(dest, 'ok', 'dataset cohérent'));
  return makeReport({ dest, script: 'validate-dataset', ranAt, verdicts });
}
