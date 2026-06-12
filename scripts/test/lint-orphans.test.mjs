// lint-orphans.test.mjs — Tests FR-9
// T-ORF-1: POI orphelin → verdict inverifiable + hasProblems=false (exit 0)
// T-ORF-2: POI onMap → pas orphelin
// T-ORF-3: POI seulement dans infoBlock poi-list → pas orphelin
// T-ORF-4: POI seulement role sleep → pas orphelin
// T-ORF-5: POI via poiRef → pas orphelin
// T-ORF-6: incomplete=true → aucun orphelin + report.incomplete

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findOrphans, lintOrphans } from '../lint-orphans.mjs';
import { hasProblems } from '../lib/report.mjs';

// ---------------------------------------------------------------------------
// T-ORF-1 : POI orphelin → inverifiable + hasProblems=false
// ---------------------------------------------------------------------------
test('T-ORF-1: POI orphelin → inverifiable, exit 0 (hasProblems false)', () => {
  const pois = [{ id: 'orphan-poi', onMap: false, roles: ['eat'] }];
  const bases = [{ body: 'Aucune référence.', infoBlocks: [] }];
  const report = lintOrphans({ dest: 'test', pois, bases, dishes: [], gems: [], incomplete: false });

  assert.ok(!hasProblems(report), 'hasProblems doit être false (orphelins = inverifiable, pas probleme)');
  const v = report.verdicts.find((x) => x.id === 'orphan-poi');
  assert.ok(v, 'doit avoir un verdict pour orphan-poi');
  assert.equal(v.state, 'inverifiable');
  assert.match(v.detail, /orphelin/);
});

// ---------------------------------------------------------------------------
// T-ORF-2 : POI onMap → pas orphelin
// ---------------------------------------------------------------------------
test('T-ORF-2: POI onMap:true → pas orphelin', () => {
  const pois = [{ id: 'map-poi', onMap: true, roles: ['see'] }];
  const bases = [{ body: '', infoBlocks: [] }];

  const orphans = findOrphans({ pois, bases, dishes: [], gems: [] });
  assert.ok(!orphans.includes('map-poi'), 'map-poi onMap ne doit pas être orphelin');
});

// ---------------------------------------------------------------------------
// T-ORF-3 : POI seulement dans infoBlock poi-list → pas orphelin
// ---------------------------------------------------------------------------
test('T-ORF-3: POI dans infoBlock poi-list → pas orphelin', () => {
  const pois = [{ id: 'infoblock-poi', onMap: false, roles: ['eat'] }];
  const bases = [
    {
      body: 'Pas de ref prose.',
      infoBlocks: [
        { type: 'poi-list', items: ['infoblock-poi'] },
      ],
    },
  ];

  const orphans = findOrphans({ pois, bases, dishes: [], gems: [] });
  assert.ok(!orphans.includes('infoblock-poi'), 'infoblock-poi dans poi-list ne doit pas être orphelin');
});

// ---------------------------------------------------------------------------
// T-ORF-4 : POI seulement role sleep → pas orphelin (AccomGrid)
// ---------------------------------------------------------------------------
test('T-ORF-4: POI roles:sleep → pas orphelin (AccomGrid)', () => {
  const pois = [{ id: 'sleep-poi', onMap: false, roles: ['sleep', 'eat'] }];
  const bases = [{ body: '', infoBlocks: [] }];

  const orphans = findOrphans({ pois, bases, dishes: [], gems: [] });
  assert.ok(!orphans.includes('sleep-poi'), 'sleep-poi ne doit pas être orphelin (AccomGrid)');
});

// ---------------------------------------------------------------------------
// T-ORF-5 : POI via poiRef dans dish/gem → pas orphelin
// ---------------------------------------------------------------------------
test('T-ORF-5: POI via dish.poiRef → pas orphelin', () => {
  const pois = [{ id: 'dish-poi', onMap: false, roles: ['eat'] }];
  const bases = [{ body: '', infoBlocks: [] }];
  const dishes = [{ id: 'plat-1', title: 'Plat test', poiRef: 'dish-poi' }];

  const orphans = findOrphans({ pois, bases, dishes, gems: [] });
  assert.ok(!orphans.includes('dish-poi'), 'dish-poi via poiRef ne doit pas être orphelin');
});

// ---------------------------------------------------------------------------
// T-ORF-6 : incomplete=true → aucun orphelin flaggé + report.incomplete
// ---------------------------------------------------------------------------
test('T-ORF-6: incomplete=true → aucun orphelin, report.incomplete=true', () => {
  const pois = [{ id: 'maybe-orphan', onMap: false, roles: ['eat'] }];
  const report = lintOrphans({ dest: 'test', pois, bases: [], dishes: [], gems: [], incomplete: true });

  assert.ok(!hasProblems(report), 'hasProblems doit être false');
  assert.equal(report.incomplete, true, 'report.incomplete doit être true');

  // Aucun verdict pour maybe-orphan (on ne peut pas garantir qu'il n'est pas référencé)
  const orphanVerdict = report.verdicts.find((v) => v.id === 'maybe-orphan');
  assert.ok(!orphanVerdict, 'ne doit PAS avoir de verdict pour maybe-orphan en mode incomplete');
});

// ---------------------------------------------------------------------------
// Test intégration : base avec [[poi:id]] → pas orphelin
// ---------------------------------------------------------------------------
test('T-ORF-7: POI via [[poi:id]] dans prose → pas orphelin', () => {
  const pois = [{ id: 'prose-poi', onMap: false, roles: ['eat'] }];
  const bases = [
    {
      body: 'Visitez [[poi:prose-poi]] pour les meilleures crêpes.',
      infoBlocks: [],
    },
  ];

  const orphans = findOrphans({ pois, bases, dishes: [], gems: [] });
  assert.ok(!orphans.includes('prose-poi'), 'prose-poi référencé dans le corps ne doit pas être orphelin');
});

// ---------------------------------------------------------------------------
// findOrphans : deux POIs — un orphelin, un référencé
// ---------------------------------------------------------------------------
test('findOrphans: mixte → seul orphelin retourné', () => {
  const pois = [
    { id: 'ref-poi', onMap: true, roles: ['see'] },
    { id: 'lost-poi', onMap: false, roles: ['eat'] },
  ];
  const bases = [{ body: '', infoBlocks: [] }];

  const orphans = findOrphans({ pois, bases, dishes: [], gems: [] });
  assert.deepEqual(orphans, ['lost-poi']);
});
