// vision-images.test.mjs — ADR-5 : écrivain réseau du sceau sémantique (claude mocké).
// T-VI-1 : match → sceau écrit (sha+alt+verdict+checkedAt), exit 0
// T-VI-2 : mismatch → sceau écrit AVEC verdict mismatch (reste rouge à la garde), exit 1
// T-VI-3 : unverifiable → sceau écrit, exit 0
// T-VI-4 : sortie malformée → exit 2, manifeste intact (null)
// T-VI-5 : crash claude → exit 2, INCOMPLETE, null
// T-VI-6 : aucune cible (fichiers absents) → exit 0 sans appel claude
// T-VI-7 : collectImageTargets enrichit le contexte d'entité (shownAs)
// + buildVisionPrompt / parseVisionOutput unitaires

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  collectImageTargets,
  buildVisionPrompt,
  parseVisionOutput,
  applyVisionResults,
  visionImages,
  visionOutputSchema,
} from '../vision-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TMP_DIR = join(ROOT, 'scripts', 'test', '_tmp_vi');

let mockCounter = 0;
function makeMockBin(outputJson) {
  const path = join(TMP_DIR, `mock-${++mockCounter}.sh`);
  const escaped = outputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  writeFileSync(path, `#!/bin/sh\nprintf '%s' "${escaped}"\n`, 'utf-8');
  spawnSync('chmod', ['+x', path]);
  return path;
}
function makeCrashBin() {
  const path = join(TMP_DIR, `crash-${++mockCounter}.sh`);
  writeFileSync(path, `#!/bin/sh\nexit 1\n`, 'utf-8');
  spawnSync('chmod', ['+x', path]);
  return path;
}

const IMG = { slot: 'food-1', file: 'p.jpg', alt: 'loukoumades au miel', sha256: 'sha-good' };
const DISH = { id: 'loukoumades', title: 'Loukoumades chez Ntourountous', image: 'food-1', story: 'La file de locaux à 1866.' };
const ranAt = '2026-06-13T10:00:00.000Z';
const fileExists = (p) => p.endsWith('p.jpg');
const out = (verdict) => JSON.stringify({ results: [{ id: 'food-1', verdict, reason: 'r' }], incomplete: false });

before(() => mkdirSync(TMP_DIR, { recursive: true }));
after(() => { if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true }); });

test('T-VI-7: collectImageTargets — fichier présent → cible enrichie du contexte ; absent → ignoré', () => {
  const targets = collectImageTargets({ dest: 'crete', images: [IMG], dishes: [DISH], fileExists });
  assert.equal(targets.length, 1);
  assert.equal(targets[0].slot, 'food-1');
  assert.deepEqual(targets[0].shownAs[0], { collection: 'dishes', id: 'loukoumades', label: 'Loukoumades chez Ntourountous', story: 'La file de locaux à 1866.' });
  // fichier absent → ignoré
  assert.equal(collectImageTargets({ dest: 'crete', images: [IMG], fileExists: () => false }).length, 0);
});

test('T-VI-1: match → sceau écrit + exit 0', () => {
  const { exitCode, updated, changed } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], pois: [], gems: [], claudeBin: makeMockBin(out('match')), ranAt, fileExists });
  assert.equal(exitCode, 0);
  assert.equal(changed, true);
  assert.deepEqual(updated[0].visionCheckedSemantic, { sha256: 'sha-good', alt: 'loukoumades au miel', verdict: 'match', checkedAt: '2026-06-13' });
});

test('T-VI-2: mismatch → sceau écrit avec verdict mismatch + exit 1', () => {
  const { exitCode, updated, report } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], claudeBin: makeMockBin(out('mismatch')), ranAt, fileExists });
  assert.equal(exitCode, 1);
  assert.equal(updated[0].visionCheckedSemantic.verdict, 'mismatch');
  assert.equal(report.verdicts.find((v) => v.id === 'food-1').state, 'probleme');
});

test('T-VI-3: unverifiable → sceau écrit + exit 0', () => {
  const { exitCode, updated, report } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], claudeBin: makeMockBin(out('unverifiable')), ranAt, fileExists });
  assert.equal(exitCode, 0);
  assert.equal(updated[0].visionCheckedSemantic.verdict, 'unverifiable');
  assert.equal(report.verdicts.find((v) => v.id === 'food-1').state, 'inverifiable');
});

test('T-VI-4: sortie malformée → exit 2, manifeste null', () => {
  const badBin = join(TMP_DIR, `bad-${++mockCounter}.sh`);
  writeFileSync(badBin, `#!/bin/sh\nprintf '%s' "pas JSON"\n`, 'utf-8');
  spawnSync('chmod', ['+x', badBin]);
  const { exitCode, updated, report } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], claudeBin: badBin, ranAt, fileExists });
  assert.equal(exitCode, 2);
  assert.equal(updated, null);
  assert.ok(report.incomplete);
});

test('T-VI-5: crash claude → exit 2, INCOMPLETE, null', () => {
  const { exitCode, updated, report } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], claudeBin: makeCrashBin(), ranAt, fileExists });
  assert.equal(exitCode, 2);
  assert.equal(updated, null);
  assert.ok(report.incomplete);
});

test('T-VI-6: aucune cible (fichiers absents) → exit 0 sans appeler claude', () => {
  const crashBin = makeCrashBin(); // appelé → exit 2 ; on prouve qu'il ne l'est pas
  const { exitCode, report } = visionImages({ dest: 'crete', images: [IMG], dishes: [DISH], claudeBin: crashBin, ranAt, fileExists: () => false });
  assert.equal(exitCode, 0);
  assert.match(report.verdicts[0].detail, /aucune image/);
});

// --- fns pures ---
test('applyVisionResults: scelle tous les verdicts ; absent → inverifiable', () => {
  const targets = collectImageTargets({ dest: 'crete', images: [IMG], dishes: [DISH], fileExists });
  const r = applyVisionResults([IMG], targets, [{ id: 'food-1', verdict: 'mismatch', reason: 'plage' }], ranAt);
  assert.equal(r.changed, true);
  assert.equal(r.updated[0].visionCheckedSemantic.verdict, 'mismatch');
  assert.equal(r.verdicts[0].state, 'probleme');

  const absent = applyVisionResults([IMG], targets, [], ranAt);
  assert.equal(absent.changed, false);
  assert.equal(absent.verdicts[0].state, 'inverifiable');
});

test('buildVisionPrompt: inclut slot, chemin, claim alt, contexte et la consigne témoin', () => {
  const targets = collectImageTargets({ dest: 'crete', images: [IMG], dishes: [DISH], fileExists });
  const p = buildVisionPrompt(targets, 'crete');
  assert.match(p, /food-1/);
  assert.match(p, /p\.jpg/);
  assert.match(p, /loukoumades au miel/);
  assert.match(p, /1866/); // contexte story
  assert.match(p, /ami-témoin/);
  assert.match(p, /mismatch/);
});

test('parseVisionOutput / schema : markdown ok, vide ko, verdict invalide rejeté', () => {
  const inner = JSON.stringify({ results: [{ id: 's', verdict: 'match', reason: 'x' }], incomplete: false });
  assert.equal(parseVisionOutput(`\`\`\`json\n${inner}\n\`\`\``).ok, true);
  assert.equal(parseVisionOutput('').ok, false);
  assert.equal(visionOutputSchema.safeParse({ results: [{ id: 's', verdict: 'peut-être', reason: '' }] }).success, false);
});
