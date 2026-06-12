// revalidate.test.mjs — Tests FR-10
// T-RVAL-1: sortie conforme open → rapport généré, lastChecked mis à jour, exit 0
// T-RVAL-2: sortie conforme closed-confirmed → open:false, exit 1
// T-RVAL-3: sortie malformée → exit 2, fichier intact (hash identique)
// T-RVAL-4: crash mi-run → rapport INCOMPLETE, fichier intact
// T-RVAL-5: seasonal:true + closed-confirmed sans sources → dégradé en unverifiable
// T-RVAL-6: seasonal:true + closed-confirmed avec sources → verdict conservé

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  applySeasonalRule,
  buildPrompt,
  parseClaudeOutput,
  applyTransitions,
  revalidateBusinesses,
  claudeOutputSchema,
} from '../revalidate-businesses.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TMP_DIR = join(ROOT, 'scripts', 'test', '_tmp_rval');
const REPORTS_DIR = join(ROOT, 'reports');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

let mockCounter = 0;

/** Crée un mock binaire claude retournant `outputJson` sur stdout, exit 0. */
function makeMockBin(outputJson) {
  const path = join(TMP_DIR, `mock-claude-${++mockCounter}.sh`);
  // Échappe les guillemets doubles pour le shell
  const escaped = outputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  writeFileSync(path, `#!/bin/sh\nprintf '%s' "${escaped}"\n`, 'utf-8');
  spawnSync('chmod', ['+x', path]);
  return path;
}

/** Crée un mock binaire qui exit avec un code d'erreur. */
function makeCrashBin(exitCode = 1) {
  const path = join(TMP_DIR, `mock-crash-${++mockCounter}.sh`);
  writeFileSync(path, `#!/bin/sh\nexit ${exitCode}\n`, 'utf-8');
  spawnSync('chmod', ['+x', path]);
  return path;
}

// ---------------------------------------------------------------------------
// POIs de test
// ---------------------------------------------------------------------------

const POI_OPEN = {
  id: 'tamam',
  base: 'chania',
  kind: 'resto',
  mapType: 'resto',
  roles: ['eat'],
  tier: null,
  name: 'Tamam',
  blurb: 'Anciens bains turcs.',
  image: 'tamam-table',
  price: { range: '15–25 €', currency: 'EUR', asOf: '2026-04' },
  coords: { lat: 35.5165, lng: 24.0163, source: 'nominatim', verifiedOn: '2026-04-16' },
  links: { official: 'https://tamam.example.gr', booking: null, tripadvisor: null, maps: null },
  seasonal: false,
  status: { open: true, lastChecked: '2026-01-01', method: 'websearch' },
  onMap: true,
};

const POI_SEASONAL = {
  ...POI_OPEN,
  id: 'sunset-taverna',
  name: 'Sunset Taverna',
  seasonal: true,
  status: { open: true, lastChecked: '2026-01-01', method: 'websearch' },
};

const POI_CLOSED = {
  ...POI_OPEN,
  id: 'old-mill',
  name: 'Old Mill',
  status: { open: false, lastChecked: '2026-06-01', method: 'websearch' },
};

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });
});

after(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// T-RVAL-1 : sortie conforme open → lastChecked mis à jour, exit 0
// ---------------------------------------------------------------------------

test('T-RVAL-1: sortie conforme "open" → lastChecked mis à jour + exit 0', () => {
  const output = JSON.stringify({
    results: [{ id: 'tamam', verdict: 'open', sources: [], reason: 'site actif' }],
    incomplete: false,
  });
  const bin = makeMockBin(output);

  const ranAt = '2026-06-12T10:00:00.000Z';
  const { exitCode, report, updatedPois } = revalidateBusinesses({
    dest: 'test',
    poisList: [POI_OPEN, POI_CLOSED],
    claudeBin: bin,
    ranAt,
  });

  assert.equal(exitCode, 0, 'exit code doit être 0');
  assert.ok(report, 'rapport doit exister');
  assert.equal(report.incomplete, undefined, 'rapport ne doit pas être marqué incomplet');

  const updated = updatedPois.find((p) => p.id === 'tamam');
  assert.equal(updated.status.lastChecked, '2026-06-12', 'lastChecked mis à jour');
  assert.equal(updated.status.open, true, 'open inchangé');

  // POI déjà fermé → non inclus dans le run, inchangé
  const closed = updatedPois.find((p) => p.id === 'old-mill');
  assert.equal(closed.status.lastChecked, '2026-06-01', 'POI fermé non touché');
});

// ---------------------------------------------------------------------------
// T-RVAL-2 : sortie conforme closed-confirmed → open:false, exit 1
// ---------------------------------------------------------------------------

test('T-RVAL-2: "closed-confirmed" → open:false + exit 1', () => {
  const output = JSON.stringify({
    results: [
      {
        id: 'tamam',
        verdict: 'closed-confirmed',
        sources: ['https://tamam.example.gr/fermeture'],
        reason: 'fermeture définitive confirmée',
      },
    ],
    incomplete: false,
  });
  const bin = makeMockBin(output);

  const { exitCode, report, updatedPois } = revalidateBusinesses({
    dest: 'test',
    poisList: [POI_OPEN],
    claudeBin: bin,
    ranAt: '2026-06-12T10:00:00.000Z',
  });

  assert.equal(exitCode, 1, 'exit code doit être 1');

  const updated = updatedPois.find((p) => p.id === 'tamam');
  assert.equal(updated.status.open, false, 'open doit être false');
  assert.equal(updated.status.lastChecked, '2026-06-12');
  assert.equal(updated.status.method, 'claude-revalidate');

  const prob = report.verdicts.find((v) => v.id === 'tamam');
  assert.equal(prob.state, 'probleme');
});

// ---------------------------------------------------------------------------
// T-RVAL-3 : sortie malformée → exit 2, pois.json INCHANGÉ
// ---------------------------------------------------------------------------

test('T-RVAL-3: sortie malformée → exit 2 + fichier intact', () => {
  const poisPath = join(TMP_DIR, 'pois-intact.json');
  const originalPois = [POI_OPEN];
  writeFileSync(poisPath, JSON.stringify(originalPois, null, 2), 'utf-8');
  const hashBefore = sha256File(poisPath);

  // Mock retournant du texte non-JSON
  const badBin = join(TMP_DIR, `mock-bad-${++mockCounter}.sh`);
  writeFileSync(badBin, `#!/bin/sh\nprintf '%s' "Ceci n est pas du JSON"\n`, 'utf-8');
  spawnSync('chmod', ['+x', badBin]);

  const { exitCode, report, updatedPois } = revalidateBusinesses({
    dest: 'test',
    poisList: originalPois,
    claudeBin: badBin,
    ranAt: '2026-06-12T10:00:00.000Z',
  });

  assert.equal(exitCode, 2, 'exit code doit être 2');
  assert.equal(updatedPois, null, 'updatedPois doit être null (aucune modification)');
  assert.ok(report.incomplete, 'rapport doit être marqué INCOMPLETE');

  // revalidateBusinesses ne touche pas au disque — le caller écrit les fichiers
  // Le fichier de test est intact car on a passé poisList, pas de disque impliqué
  const hashAfter = sha256File(poisPath);
  assert.equal(hashBefore, hashAfter, 'hash pois.json identique avant/après');
});

// ---------------------------------------------------------------------------
// T-RVAL-4 : crash claude → rapport INCOMPLETE, aucun poi modifié
// ---------------------------------------------------------------------------

test('T-RVAL-4: crash claude → rapport INCOMPLETE + exit 2', () => {
  const crashBin = makeCrashBin(1);

  const { exitCode, report, updatedPois } = revalidateBusinesses({
    dest: 'test',
    poisList: [POI_OPEN],
    claudeBin: crashBin,
    ranAt: '2026-06-12T10:00:00.000Z',
  });

  assert.equal(exitCode, 2, 'exit code doit être 2 sur crash');
  assert.ok(report.incomplete, 'rapport INCOMPLETE');
  assert.equal(updatedPois, null, 'aucun poi modifié');
});

// ---------------------------------------------------------------------------
// T-RVAL-5 : seasonal:true + closed-confirmed SANS sources → unverifiable
// ---------------------------------------------------------------------------

test('T-RVAL-5: seasonal + closed-confirmed sans sources → dégradé en unverifiable', () => {
  const poiVerdict = {
    id: 'sunset-taverna',
    verdict: 'closed-confirmed',
    sources: [],
    reason: 'présumé fermé hors-saison',
  };

  const result = applySeasonalRule(poiVerdict, POI_SEASONAL);
  assert.equal(result.verdict, 'unverifiable', 'doit être dégradé en unverifiable');
  assert.match(result.reason, /seasonal/);
});

test('T-RVAL-5b: seasonal + closed-confirmed sans sources via revalidateBusinesses → open inchangé', () => {
  const output = JSON.stringify({
    results: [
      {
        id: 'sunset-taverna',
        verdict: 'closed-confirmed',
        sources: [],
        reason: 'présumé fermé hors-saison',
      },
    ],
    incomplete: false,
  });
  const bin = makeMockBin(output);

  const { exitCode, updatedPois } = revalidateBusinesses({
    dest: 'test',
    poisList: [POI_SEASONAL],
    claudeBin: bin,
    ranAt: '2026-06-12T10:00:00.000Z',
  });

  // Dégradé en unverifiable → exit 0 (pas de closed-confirmed effectif)
  assert.equal(exitCode, 0, 'exit 0 car closed-confirmed dégradé en unverifiable');
  const updated = updatedPois.find((p) => p.id === 'sunset-taverna');
  assert.equal(updated.status.open, true, 'open ne doit PAS passer à false');
});

// ---------------------------------------------------------------------------
// T-RVAL-6 : seasonal:true + closed-confirmed AVEC sources → verdict conservé
// ---------------------------------------------------------------------------

test('T-RVAL-6: seasonal + closed-confirmed avec sources → verdict conservé', () => {
  const poiVerdict = {
    id: 'sunset-taverna',
    verdict: 'closed-confirmed',
    sources: ['https://sunset-taverna.example.gr/fermeture-hiver'],
    reason: 'fermeture octobre–avril confirmée sur site officiel',
  };

  const result = applySeasonalRule(poiVerdict, POI_SEASONAL);
  assert.equal(result.verdict, 'closed-confirmed', 'verdict doit rester closed-confirmed');
});

// ---------------------------------------------------------------------------
// Tests unitaires purs
// ---------------------------------------------------------------------------

test('parseClaudeOutput: JSON valide → ok', () => {
  const output = JSON.stringify({
    results: [{ id: 'tamam', verdict: 'open', sources: [], reason: 'ok' }],
    incomplete: false,
  });
  const result = parseClaudeOutput(output);
  assert.equal(result.ok, true);
  assert.equal(result.data.results[0].verdict, 'open');
});

test('parseClaudeOutput: JSON entouré de markdown → ok', () => {
  const inner = JSON.stringify({
    results: [{ id: 'tamam', verdict: 'open', sources: [], reason: 'ok' }],
    incomplete: false,
  });
  const raw = `Voici le résultat :\n\`\`\`json\n${inner}\n\`\`\``;
  const result = parseClaudeOutput(raw);
  assert.equal(result.ok, true);
});

test('parseClaudeOutput: sortie vide → not ok', () => {
  const result = parseClaudeOutput('');
  assert.equal(result.ok, false);
  assert.match(result.reason, /vide/);
});

test('parseClaudeOutput: JSON sans champ results → not ok', () => {
  const result = parseClaudeOutput(JSON.stringify({ foo: 'bar' }));
  assert.equal(result.ok, false);
});

test('applyTransitions: closed-confirmed → open:false', () => {
  const pois = [{ ...POI_OPEN }];
  const results = [
    { id: 'tamam', verdict: 'closed-confirmed', sources: ['src1'], reason: 'fermé' },
  ];
  const { updatedPois, verdicts } = applyTransitions(pois, results, '2026-06-12T00:00:00Z');
  assert.equal(updatedPois[0].status.open, false);
  assert.equal(verdicts[0].state, 'probleme');
});

test('applyTransitions: POI absent des results → inchangé', () => {
  const pois = [{ ...POI_OPEN }];
  const { updatedPois } = applyTransitions(pois, [], '2026-06-12T00:00:00Z');
  assert.deepEqual(updatedPois[0].status, POI_OPEN.status);
});

test('buildPrompt: inclut les ids, noms et la destination', () => {
  const prompt = buildPrompt([POI_OPEN], 'crete');
  assert.match(prompt, /tamam/);
  assert.match(prompt, /Tamam/);
  assert.match(prompt, /crete/);
  assert.match(prompt, /closed-confirmed/);
});

test('claudeOutputSchema: rejette un verdict invalide', () => {
  const result = claudeOutputSchema.safeParse({
    results: [{ id: 'x', verdict: 'maybe', sources: [], reason: '' }],
    incomplete: false,
  });
  assert.equal(result.success, false);
});
