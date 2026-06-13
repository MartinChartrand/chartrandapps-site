// node:test — schémas zod (par-entrée) + validateDataset (cross-entrée). FR-2 acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { poiSchema, imageSchema, infoBlockSchema, dishSchema, gemSchema, sourceSchema } from '../lib/schemas.mjs';
import { validateDataset } from '../lib/dataset.mjs';
import { hasProblems } from '../lib/report.mjs';
import { resolvePoiRefs } from '../lib/refs.mjs';
import {
  validPoi,
  validPoiOffMap,
  poiNoCoordsOnMap,
  poiNoAsOf,
  poiNoLastChecked,
  poiBadKind,
} from './fixtures/pois.mjs';
import {
  creteValid,
  turquieValid,
  datasetUnknownSlot,
  datasetDeadRef,
  datasetDupId,
} from './fixtures/dataset.mjs';

// --- Par-entrée : poiSchema ---
test('POI valide (onMap + coords) passe', () => {
  assert.equal(poiSchema.safeParse(validPoi).success, true);
});

test('POI valide hors carte (onMap:false, pas de coords) passe', () => {
  assert.equal(poiSchema.safeParse(validPoiOffMap).success, true);
});

test('POI onMap:true sans coords échoue (coords obligatoires si onMap)', () => {
  assert.equal(poiSchema.safeParse(poiNoCoordsOnMap).success, false);
});

test('POI price sans asOf échoue', () => {
  assert.equal(poiSchema.safeParse(poiNoAsOf).success, false);
});

test('POI status sans lastChecked échoue', () => {
  assert.equal(poiSchema.safeParse(poiNoLastChecked).success, false);
});

test('POI kind hors enum échoue', () => {
  assert.equal(poiSchema.safeParse(poiBadKind).success, false);
});

// --- Par-entrée : imageSchema ---
test('image valide passe / image sans sha256 échoue', () => {
  const base = {
    slot: 's',
    file: 's.jpg',
    alt: 'a',
    layout: null,
    claims: 'atmosphere',
    credit: { source: 'unsplash', photoId: 'x', photographer: 'y', license: 'unsplash-standard' },
    sha256: 'deadbeef',
    visionChecked: '2026-06-11',
  };
  assert.equal(imageSchema.safeParse(base).success, true);
  const { sha256, ...noSha } = base;
  assert.equal(imageSchema.safeParse(noSha).success, false);
});

// --- Par-entrée : infoBlockSchema ---
test('infoBlock poi-list sans items échoue', () => {
  assert.equal(infoBlockSchema.safeParse({ label: 'x', type: 'poi-list' }).success, false);
  assert.equal(infoBlockSchema.safeParse({ label: 'x', type: 'poi-list', items: ['tamam'] }).success, true);
});

// --- §v3 : provenance & carnet de bouche (ADR-1/2/3 — champs ADDITIFS, doivent rester rétrocompatibles) ---
const dishV2 = { id: 'a', title: 'b', body: 'c', image: 'd' }; // entrée v2 nue (zéro champ v3)

test('v3 — dish v2 nu (aucun champ provenance) passe : additif = rétrocompatible', () => {
  assert.equal(dishSchema.safeParse(dishV2).success, true);
  assert.equal(gemSchema.safeParse(dishV2).success, true);
});

test('v3 — dish avec provenance + carnet complet passe', () => {
  const dishV3 = {
    ...dishV2,
    type: 'plat',
    region: 'Chania',
    story: 'La file de locaux à 1866.',
    sources: [{ creator: 'Mark Wiens', url: 'https://youtube.com/watch?v=abc', date: '2017-05-01' }],
    verifiedAt: '2026-06-13',
    stale: false,
    singleSourceTrusted: false,
    approvedBy: 'human',
  };
  assert.equal(dishSchema.safeParse(dishV3).success, true);
});

test('v3 — POI accepte les champs provenance', () => {
  assert.equal(poiSchema.safeParse({ ...validPoi, story: 'x', verifiedAt: '2026-06-13', approvedBy: 'human' }).success, true);
});

test('v3 — type hors enum (plat|vin|bière|alcool|produit) échoue', () => {
  assert.equal(dishSchema.safeParse({ ...dishV2, type: 'dessert' }).success, false);
});

test('v3 — approvedBy ≠ "human" échoue (pas de publication auto)', () => {
  assert.equal(dishSchema.safeParse({ ...dishV2, approvedBy: 'auto' }).success, false);
});

test('v3 — source date non-ISO échoue ; verifiedAt non-ISO échoue', () => {
  assert.equal(sourceSchema.safeParse({ creator: 'x', url: 'y', date: 'hier' }).success, false);
  assert.equal(sourceSchema.safeParse({ creator: 'x', url: 'y', date: '2017-05-01' }).success, true);
  assert.equal(dishSchema.safeParse({ ...dishV2, verifiedAt: 'hier' }).success, false);
});

// --- ADR-5 : vision-check sémantique sur l'IMAGE (sceau écrit par vision-images.mjs, test ami-témoin) ---
const imgBase = {
  slot: 's',
  file: 's.jpg',
  alt: 'a',
  layout: null,
  claims: 'atmosphere',
  credit: { source: 'unsplash', photoId: 'x', photographer: 'y', license: 'unsplash-standard' },
  sha256: 'deadbeef',
  visionChecked: '2026-06-11',
};

test('ADR-5 — image avec visionCheckedSemantic complet passe (3 verdicts acceptés)', () => {
  for (const v of ['match', 'mismatch', 'unverifiable']) {
    const vc = { sha256: 'deadbeef', alt: 'a', verdict: v, checkedAt: '2026-06-13' };
    assert.equal(imageSchema.safeParse({ ...imgBase, visionCheckedSemantic: vc }).success, true, v);
  }
});

test('ADR-5 — visionCheckedSemantic reste optionnel (image nue passe)', () => {
  assert.equal(imageSchema.safeParse(imgBase).success, true);
});

test('ADR-5 — verdict hors enum échoue ; sans checkedAt échoue ; checkedAt non-ISO échoue', () => {
  assert.equal(imageSchema.safeParse({ ...imgBase, visionCheckedSemantic: { sha256: 'a', alt: 'b', verdict: 'oui', checkedAt: '2026-06-13' } }).success, false);
  assert.equal(imageSchema.safeParse({ ...imgBase, visionCheckedSemantic: { sha256: 'a', alt: 'b', verdict: 'match' } }).success, false);
  assert.equal(imageSchema.safeParse({ ...imgBase, visionCheckedSemantic: { sha256: 'a', alt: 'b', verdict: 'match', checkedAt: 'hier' } }).success, false);
});

test('ADR-5 — le sceau ne vit PAS sur poi/dish (champ inconnu ignoré, pas un claim d\'entité)', () => {
  // provenanceFields ne porte plus visionCheckedSemantic — il appartient à l'image. Le schéma entité
  // reste strict sur ses champs connus mais zod ignore les inconnus par défaut → dish nu passe.
  assert.equal(dishSchema.safeParse(dishV2).success, true);
});

// --- Cross-entrée : validateDataset ---
test('dataset Crète valide → aucun problème', () => {
  assert.equal(hasProblems(validateDataset(creteValid)), false);
});

test('edge case : Crète et Turquie partagent l’id `tamam` → aucune collision', () => {
  assert.equal(hasProblems(validateDataset(creteValid)), false);
  assert.equal(hasProblems(validateDataset(turquieValid)), false);
});

test('slot image inconnu → problème', () => {
  assert.equal(hasProblems(validateDataset(datasetUnknownSlot)), true);
});

test('ref [[poi:]] morte → problème', () => {
  assert.equal(hasProblems(validateDataset(datasetDeadRef)), true);
});

test('id POI dupliqué intra-destination → problème', () => {
  assert.equal(hasProblems(validateDataset(datasetDupId)), true);
});

// --- Module de refs partagé ---
test('resolvePoiRefs sépare résolus / non résolus', () => {
  const r = resolvePoiRefs('a [[poi:tamam]] b [[poi:mort]]', ['tamam']);
  assert.deepEqual(r, { resolved: ['tamam'], unresolved: ['mort'] });
});
