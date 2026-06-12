import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  pointInLandmask,
  loadLandmask,
  validateGeo,
} from '../validate-geo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_LANDMASK = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/landmask-crete.geojson'), 'utf-8')
);

// T-GEO-1 : POI en mer (lat 35.20 < bbox 35.4) → probleme
test('T-GEO-1: POI en mer → probleme', async () => {
  const pois = [{ id: 'sea-poi', onMap: true, coords: { lat: 35.20, lng: 24.00 } }];
  const report = await validateGeo({ dest: 'crete', pois, landmask: FIXTURE_LANDMASK, network: false });
  const v = report.verdicts.find((x) => x.id === 'sea-poi');
  assert.equal(v.state, 'probleme');
});

// T-GEO-2 : POI à terre — Tamam [lng=24.0163, lat=35.5165] est dans la bbox fixture
test('T-GEO-2: POI à terre (Tamam) → ok', async () => {
  const pois = [{ id: 'tamam', onMap: true, coords: { lat: 35.5165, lng: 24.0163 } }];
  const report = await validateGeo({ dest: 'crete', pois, landmask: FIXTURE_LANDMASK, network: false });
  const v = report.verdicts.find((x) => x.id === 'tamam');
  assert.equal(v.state, 'ok');
});

// T-GEO-3 : Landmask absent → code LANDMASK_MISSING
test('T-GEO-3: landmask absent → LANDMASK_MISSING', () => {
  assert.throws(
    () => loadLandmask('nonexistent-dest-xyz'),
    (err) => err.code === 'LANDMASK_MISSING'
  );
});

// T-GEO-4 : Mode fast — global.fetch mockée pour lancer, ne doit JAMAIS être appelée
test('T-GEO-4: mode fast — fetch jamais appelé', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch invoqué en mode fast — interdit!'); };
  try {
    const pois = [{ id: 'sea-poi', onMap: true, coords: { lat: 35.20, lng: 24.00 } }];
    const report = await validateGeo({ dest: 'crete', pois, landmask: FIXTURE_LANDMASK, network: false });
    assert.equal(report.verdicts[0].state, 'probleme');
  } finally {
    if (originalFetch !== undefined) {
      globalThis.fetch = originalFetch;
    } else {
      delete globalThis.fetch;
    }
  }
});
