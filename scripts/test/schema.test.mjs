// node:test — schémas zod (par-entrée) + validateDataset (cross-entrée). FR-2 acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { poiSchema, imageSchema, infoBlockSchema } from '../lib/schemas.mjs';
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
