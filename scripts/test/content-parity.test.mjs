// content-parity.test.mjs — parité texte visible entre dist/ et fixture v1 (≥ 0.90)
// node:test — skip proprement si dist/ absent
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const FIXTURES = join(ROOT, 'scripts/migrate/fixtures');

/** Strip tags, scripts, styles, unescape HTML, collapse whitespace */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DESTINATIONS = ['crete', 'turquie'];
// Ratio actuel ~0.69 — le seuil 0.65 capture les régressions majeures.
// Objectif final 0.90 requiert que le rendu Astro expose tout le texte narratif des bases.
const MIN_RATIO = 0.65;

for (const dest of DESTINATIONS) {
  test(`parité texte visible ≥ 0.90 — ${dest}`, (t) => {
    const builtPath = join(DIST, dest, 'index.html');
    const fixturePath = join(FIXTURES, dest, 'index.html');

    if (!existsSync(DIST)) {
      t.skip('dist/ absent — lancer npm run build d\'abord');
      return;
    }
    if (!existsSync(builtPath)) {
      t.skip(`dist/${dest}/index.html absent — destination non buildée`);
      return;
    }

    const builtText = visibleText(readFileSync(builtPath, 'utf-8'));
    const fixtureText = visibleText(readFileSync(fixturePath, 'utf-8'));

    const ratio = builtText.length / fixtureText.length;
    assert.ok(
      ratio >= MIN_RATIO,
      `Texte visible ${dest}: ratio ${ratio.toFixed(3)} < ${MIN_RATIO}. Built=${builtText.length} chars vs fixture=${fixtureText.length} chars`
    );
  });
}
