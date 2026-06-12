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
// Phase 2 (récupération summary/focus/overview/intro-grid/dishes/gems/notes/budget-cat) :
// ratios mesurés crete 1.030 · turquie 1.054 — zéro segment v1 (>40 chars) absent du dist.
// Le léger dépassement de 1.0 vient du rendu v2 qui duplique volontairement les blurbs des
// POIs sleep (AccomGrid + poi-list « Où dormir », testé par built-html T4).
const MIN_RATIO = 0.90;

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

// Parité IMAGES — leçon du checkpoint 2026-06-12 : la parité texte ne voit pas les <img>.
// La dédup par photoId de l'ancien extract perdait les usages réutilisés (turquie : 82 <img>
// v1 pour 50 photoIds uniques → 49 entrées manifest → 34 rendues). On compte donc les
// <img> RENDUES dans le dist vs la fixture v1, plus le hero et les covers de chapitre
// (rendus en background-image, invisibles au compte des <img>).
const MIN_IMG_RATIO = 0.95;

for (const dest of DESTINATIONS) {
  test(`parité images rendues ≥ ${MIN_IMG_RATIO} — ${dest}`, (t) => {
    const builtPath = join(DIST, dest, 'index.html');
    if (!existsSync(builtPath)) {
      t.skip(`dist/${dest}/index.html absent — destination non buildée`);
      return;
    }
    const built = readFileSync(builtPath, 'utf-8');
    const fixture = readFileSync(join(FIXTURES, dest, 'index.html'), 'utf-8');

    // v1 contient des <img src=""> morts — on ne compte que les images avec une vraie source
    const countImgs = (html) => (html.match(/<img\b[^>]*src="[^"]/g) || []).length;
    const builtCount = countImgs(built);
    const fixtureCount = countImgs(fixture);
    const ratio = builtCount / fixtureCount;
    assert.ok(
      ratio >= MIN_IMG_RATIO,
      `Images rendues ${dest}: ${builtCount} vs ${fixtureCount} dans la fixture v1 (ratio ${ratio.toFixed(3)} < ${MIN_IMG_RATIO})`
    );

    // hero : background-image résolu (le bug « slot jamais câblé » rendait un hero sans image)
    assert.match(
      built,
      /class="hero"[^>]*style="background-image:[^"]*url\(/,
      `Hero ${dest}: pas de background-image résolu`
    );

    // chaque chapter-cover doit avoir son image de fond (slot <base>-cover résolu)
    const fixtureCovers = (fixture.match(/class="chapter-cover"/g) || []).length;
    const builtCovers = (built.match(/<div class="chapter-cover"[^>]*style="background-image[^"]*url\(/g) || []).length;
    assert.equal(
      builtCovers,
      fixtureCovers,
      `Covers ${dest}: ${builtCovers} avec image rendues vs ${fixtureCovers} dans la fixture v1`
    );
  });
}
