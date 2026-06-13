// validate-image-claims.test.mjs — ADR-5 : garde OFFLINE du sceau sémantique (test ami-témoin).
// T-VIC-1 : image jamais scellée → inverifiable (jaune, pas rouge)
// T-VIC-2 : sceau frais (match) → ok
// T-VIC-3 : sceau frais (unverifiable) → ok (ambiance revue, pas un mensonge)
// T-VIC-4 : sceau mismatch confirmé → probleme (rouge, bloque en CI)
// T-VIC-5 : sceau périmé (sha256 changé) → probleme
// T-VIC-6 : sceau périmé (alt changé) → probleme
// T-VIC-7 : mode --strict : jamais scellée → probleme
// T-VIC-8 : aucune image → ok

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImageClaims } from '../validate-image-claims.mjs';
import { evaluateSemanticSeal } from '../lib/image-context.mjs';
import { hasProblems } from '../lib/report.mjs';

const baseImg = { slot: 'food-1', file: 'p.jpg', alt: 'loukoumades au miel', sha256: 'sha-good' };
const sealed = (verdict, over = {}) => ({
  ...baseImg,
  visionCheckedSemantic: { sha256: 'sha-good', alt: 'loukoumades au miel', verdict, checkedAt: '2026-06-13', ...over },
});
const ranAt = '2026-06-13T10:00:00.000Z';
const only = (r) => r.verdicts[0];

test('T-VIC-1: jamais scellée → inverifiable', () => {
  const r = validateImageClaims({ dest: 'crete', images: [baseImg], ranAt });
  assert.equal(hasProblems(r), false);
  assert.equal(only(r).state, 'inverifiable');
  assert.match(only(r).detail, /jamais vérifiée/);
});

test('T-VIC-2: sceau frais match → ok', () => {
  const r = validateImageClaims({ dest: 'crete', images: [sealed('match')], ranAt });
  assert.equal(only(r).state, 'ok');
});

test('T-VIC-3: sceau frais unverifiable → ok', () => {
  const r = validateImageClaims({ dest: 'crete', images: [sealed('unverifiable')], ranAt });
  assert.equal(only(r).state, 'ok');
});

test('T-VIC-4: mismatch confirmé → probleme', () => {
  const r = validateImageClaims({ dest: 'crete', images: [sealed('mismatch')], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(only(r).detail, /mismatch/);
});

test('T-VIC-5: sceau périmé (sha changé) → probleme', () => {
  const img = { ...sealed('match'), sha256: 'sha-NEW' };
  const r = validateImageClaims({ dest: 'crete', images: [img], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(only(r).detail, /image changée/);
});

test('T-VIC-6: sceau périmé (alt changé) → probleme', () => {
  const img = { ...sealed('match'), alt: 'AUTRE chose' };
  const r = validateImageClaims({ dest: 'crete', images: [img], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(only(r).detail, /alt.*changé/);
});

test('T-VIC-7: --strict → jamais scellée devient probleme', () => {
  const r = validateImageClaims({ dest: 'crete', images: [baseImg], strict: true, ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(only(r).detail, /\[strict\]/);
});

test('T-VIC-8: aucune image → ok', () => {
  const r = validateImageClaims({ dest: 'crete', images: [], ranAt });
  assert.equal(only(r).state, 'ok');
});

// --- helper pur ---
test('evaluateSemanticSeal: couvre les 4 transitions', () => {
  assert.equal(evaluateSemanticSeal(baseImg).state, 'inverifiable');
  assert.equal(evaluateSemanticSeal(sealed('match')).state, 'ok');
  assert.equal(evaluateSemanticSeal(sealed('mismatch')).state, 'probleme');
  assert.equal(evaluateSemanticSeal({ ...sealed('match'), sha256: 'x' }).state, 'probleme');
});
