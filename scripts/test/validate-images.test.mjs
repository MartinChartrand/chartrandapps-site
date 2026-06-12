// validate-images.test.mjs — Tests FR-8
// T-IMG-1: doublon sha256 → probleme
// T-IMG-2: claims:place + source:unsplash → probleme
// T-IMG-3: alt modifié (visionLock alt diff, même sha) → probleme
// T-IMG-3b: sha modifié → probleme
// T-IMG-4: doublon sha mais sha ∈ reuseAllowlist → ok
// T-IMG-5: manifest propre → ok

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImages, imgId } from '../validate-images.mjs';
import { hasProblems } from '../lib/report.mjs';

// ---------------------------------------------------------------------------
// T-IMG-1 : doublon sha256 → probleme
// ---------------------------------------------------------------------------
test('T-IMG-1: doublon sha256 → probleme', () => {
  const images = [
    { id: 'img-a', slot: 'img-a', sha256: 'dup-sha', alt: 'A', claims: 'atmosphere', credit: { source: 'unsplash' } },
    { id: 'img-b', slot: 'img-b', sha256: 'dup-sha', alt: 'B', claims: 'atmosphere', credit: { source: 'unsplash' } },
  ];
  const report = validateImages({ dest: 'test', images });
  assert.ok(hasProblems(report), 'doit avoir au moins 1 probleme (dup sha256)');
  const dupVerdicts = report.verdicts.filter((v) => v.state === 'probleme' && v.detail.includes('sha256 dupliqué'));
  assert.ok(dupVerdicts.length >= 2, 'les deux images dupliquées doivent être flaggées');
});

// ---------------------------------------------------------------------------
// T-IMG-2 : claims:place + source:unsplash → probleme
// ---------------------------------------------------------------------------
test('T-IMG-2: claims:place + source:unsplash → probleme', () => {
  const images = [
    { id: 'stock-place', slot: 'stock-place', sha256: 'sha-unique', alt: 'Place du marché', claims: 'place', credit: { source: 'unsplash' } },
  ];
  const report = validateImages({ dest: 'test', images });
  assert.ok(hasProblems(report));
  const v = report.verdicts.find((x) => x.id === 'stock-place' && x.state === 'probleme');
  assert.ok(v, 'doit avoir un probleme claims:place');
  assert.match(v.detail, /claims:"place"/);
});

// ---------------------------------------------------------------------------
// T-IMG-3 : alt modifié (même sha, alt différent dans visionLock) → probleme
// ---------------------------------------------------------------------------
test('T-IMG-3: alt modifié après visionLock → probleme', () => {
  const images = [
    { id: 'img-v', slot: 'img-v', sha256: 'sha-same', alt: 'Alt modifié', claims: 'atmosphere', credit: { source: 'perso' } },
  ];
  const visionLock = { 'img-v': { sha256: 'sha-same', alt: 'Alt original' } };
  const report = validateImages({ dest: 'test', images, visionLock });
  assert.ok(hasProblems(report));
  const v = report.verdicts.find((x) => x.id === 'img-v' && x.state === 'probleme');
  assert.ok(v, 'doit avoir un probleme vision-check (alt)');
  assert.match(v.detail, /alt modifié/);
});

// ---------------------------------------------------------------------------
// T-IMG-3b : sha256 modifié → probleme
// ---------------------------------------------------------------------------
test('T-IMG-3b: sha256 modifié après visionLock → probleme', () => {
  const images = [
    { id: 'img-sha', slot: 'img-sha', sha256: 'sha-nouveau', alt: 'Alt original', claims: 'atmosphere', credit: { source: 'perso' } },
  ];
  const visionLock = { 'img-sha': { sha256: 'sha-ancien', alt: 'Alt original' } };
  const report = validateImages({ dest: 'test', images, visionLock });
  assert.ok(hasProblems(report));
  const v = report.verdicts.find((x) => x.id === 'img-sha' && x.state === 'probleme');
  assert.ok(v, 'doit avoir un probleme vision-check (sha)');
  assert.match(v.detail, /sha256 modifié/);
});

// ---------------------------------------------------------------------------
// T-IMG-4 : doublon sha mais sha ∈ reuseAllowlist → pas de probleme
// ---------------------------------------------------------------------------
test('T-IMG-4: doublon sha dans reuseAllowlist → ok (pas de probleme)', () => {
  const images = [
    { id: 'img-r1', slot: 'img-r1', sha256: 'allowed-sha', alt: 'A', claims: 'atmosphere', credit: { source: 'perso' } },
    { id: 'img-r2', slot: 'img-r2', sha256: 'allowed-sha', alt: 'B', claims: 'atmosphere', credit: { source: 'perso' } },
  ];
  const reuseAllowlist = new Set(['allowed-sha']);
  const report = validateImages({ dest: 'test', images, reuseAllowlist });
  assert.ok(!hasProblems(report), 'ne doit PAS avoir de probleme (sha dans allowlist)');
  const dupProblems = report.verdicts.filter((v) => v.state === 'probleme' && v.detail.includes('sha256 dupliqué'));
  assert.equal(dupProblems.length, 0);
});

// ---------------------------------------------------------------------------
// T-IMG-5 : manifest propre → ok
// ---------------------------------------------------------------------------
test('T-IMG-5: manifest propre → ok', () => {
  const images = [
    { id: 'img-clean', slot: 'img-clean', sha256: 'unique-sha-1', alt: 'Clean', claims: 'atmosphere', credit: { source: 'unsplash' } },
    { id: 'img-perso', slot: 'img-perso', sha256: 'unique-sha-2', alt: 'Place perso', claims: 'place', credit: { source: 'perso' } },
  ];
  const report = validateImages({ dest: 'test', images });
  assert.ok(!hasProblems(report), 'ne doit PAS avoir de probleme');
  const okVerdicts = report.verdicts.filter((v) => v.state === 'ok');
  assert.ok(okVerdicts.length > 0);
});

// ---------------------------------------------------------------------------
// Tests unitaires imgId
// ---------------------------------------------------------------------------
test('imgId: utilise id si présent', () => {
  assert.equal(imgId({ id: 'mon-id', slot: 'mon-slot' }), 'mon-id');
});

test('imgId: fallback sur slot', () => {
  assert.equal(imgId({ slot: 'mon-slot' }), 'mon-slot');
});

test('imgId: fallback sans-id si aucun', () => {
  assert.equal(imgId({}), '(sans-id)');
});
