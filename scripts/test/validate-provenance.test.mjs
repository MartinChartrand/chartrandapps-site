// validate-provenance.test.mjs — ADR-1/2/3 : garde OFFLINE de provenance (build rouge).
// T-VP-1 : aucun récit → ok (no-op vert, état actuel du repo)
// T-VP-2 : récit + approved:human + 2 sources / 2 créateurs → ok
// T-VP-3 : récit + singleSourceTrusted + 1 source → ok
// T-VP-4 : récit sans approvedBy → probleme
// T-VP-5 : récit + 1 source sans trust → probleme (convergence insuffisante)
// T-VP-6 : récit + 2 sources MÊME créateur → probleme (pas une convergence)
// T-VP-7 : récit trop court → probleme
// T-VP-8 : poi + gem couverts (pas juste dish)
// T-VP-9 : plusieurs problèmes cumulés sur une entité → un seul verdict détaillé

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProvenance, hasStory, MIN_STORY_LEN } from '../validate-provenance.mjs';
import { hasProblems } from '../lib/report.mjs';

const LONG = 'La file de locaux à 1866 dès 7h, la pâte qui tombe dans l\'huile, le miel de thym par-dessus.';
const src = (creator, date) => ({ creator, url: `https://youtube.com/watch?v=${creator}`, date });
const dishOk = {
  id: 'loukoumades',
  title: 'Loukoumades',
  body: 'b',
  image: 'foodie-5',
  story: LONG,
  approvedBy: 'human',
  sources: [src('Wiens', '2018-05-01'), src('Lila', '2022-09-01')],
};
const ranAt = '2026-06-13T10:00:00.000Z';
const vd = (id, r) => r.verdicts.find((v) => v.id === id);

test('T-VP-1: aucun récit → ok (no-op vert)', () => {
  const r = validateProvenance({ dest: 'crete', dishes: [{ id: 'x', title: 't', body: 'b', image: 'i' }], ranAt });
  assert.equal(hasProblems(r), false);
  assert.match(r.verdicts[0].detail, /aucun récit/);
});

test('T-VP-2: récit + approved + 2 sources / 2 créateurs → ok', () => {
  const r = validateProvenance({ dest: 'crete', dishes: [dishOk], ranAt });
  assert.equal(hasProblems(r), false);
  assert.equal(vd('dishes/loukoumades', r).state, 'ok');
});

test('T-VP-3: récit + singleSourceTrusted + 1 source → ok', () => {
  const dish = { ...dishOk, singleSourceTrusted: true, sources: [src('LocalGuide', '2024-03-01')] };
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  assert.equal(hasProblems(r), false);
});

test('T-VP-4: récit sans approvedBy → probleme', () => {
  const { approvedBy, ...dish } = dishOk;
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(vd('dishes/loukoumades', r).detail, /approbation humaine/);
});

test('T-VP-5: récit + 1 source sans trust → probleme (convergence)', () => {
  const dish = { ...dishOk, sources: [src('Wiens', '2018-05-01')] };
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(vd('dishes/loukoumades', r).detail, /convergence insuffisante/);
});

test('T-VP-6: récit + 2 sources MÊME créateur → probleme', () => {
  const dish = { ...dishOk, sources: [src('Wiens', '2018-05-01'), src('Wiens', '2022-09-01')] };
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(vd('dishes/loukoumades', r).detail, /1 créateur distinct/);
});

test('T-VP-7: récit trop court → probleme', () => {
  const dish = { ...dishOk, story: 'Trop court.' };
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  assert.equal(hasProblems(r), true);
  assert.match(vd('dishes/loukoumades', r).detail, /trop court/);
});

test('T-VP-8: poi et gem couverts (pas juste dish)', () => {
  const poi = { id: 'tamam', name: 'Tamam', story: LONG }; // sans provenance
  const gem = { id: 'harismari', title: 'Harismari', body: 'b', image: 'i', story: LONG, approvedBy: 'human', singleSourceTrusted: true, sources: [src('LocalGuide', '2024-01-01')] };
  const r = validateProvenance({ dest: 'crete', pois: [poi], gems: [gem], ranAt });
  assert.equal(vd('pois/tamam', r).state, 'probleme'); // poi sans approved/sources
  assert.equal(vd('gems/harismari', r).state, 'ok');    // gem complet
});

test('T-VP-9: problèmes cumulés → un verdict avec tous les motifs', () => {
  const dish = { id: 'x', title: 't', body: 'b', image: 'i', story: 'court' }; // court + no approved + no sources
  const r = validateProvenance({ dest: 'crete', dishes: [dish], ranAt });
  const detail = vd('dishes/x', r).detail;
  assert.match(detail, /trop court/);
  assert.match(detail, /approbation humaine/);
  assert.match(detail, /convergence insuffisante/);
});

test('hasStory / MIN_STORY_LEN exportés et cohérents', () => {
  assert.equal(hasStory({ story: 'x' }), true);
  assert.equal(hasStory({ story: '  ' }), false);
  assert.equal(hasStory({}), false);
  assert.ok(MIN_STORY_LEN > 0);
});
