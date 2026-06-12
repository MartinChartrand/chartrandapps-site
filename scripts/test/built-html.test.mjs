// built-html.test.mjs — node:test — teste le HTML builté depuis la fixture test-fixture/
// FR-3 acceptance criteria : composants §4 ARCHITECTURE.md
// La mini-destination fixture (src/content/destinations/test-fixture/) doit être buildée
// avant de lancer ces tests. Le test lance lui-même `npm run build` si dist/ est absent.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const FIXTURE_DEST = 'test-fixture';
const HTML_PATH = join(DIST, FIXTURE_DEST, 'index.html');

let html = '';

before(async () => {
  // Build si nécessaire (ou forcer rebuild)
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    throw new Error(`Build failed:\n${e.stderr?.toString() ?? e.message}`);
  }
  html = readFileSync(HTML_PATH, 'utf-8');
});

// T1. Présence et ordre des sections par base
test('T1: sections présentes dans le bon ordre (vue → testville → budget → pratique)', () => {
  const vueIdx = html.indexOf('id="vue"');
  const baseIdx = html.indexOf('id="testville"');
  const budgetIdx = html.indexOf('id="budget"');
  const pratiqueIdx = html.indexOf('id="pratique"');

  assert.ok(vueIdx !== -1, 'section #vue absente');
  assert.ok(baseIdx !== -1, 'section #testville absente');
  assert.ok(budgetIdx !== -1, 'section #budget absente');
  assert.ok(pratiqueIdx !== -1, 'section #pratique absente');

  assert.ok(vueIdx < baseIdx, '#vue doit précéder #testville');
  assert.ok(baseIdx < budgetIdx, '#testville doit précéder #budget');
  assert.ok(budgetIdx < pratiqueIdx, '#budget doit précéder #pratique');
});

// T2. Aucun [[poi:]] non résolu dans le HTML final
test('T2: aucun [[poi:]] non résolu dans le HTML', () => {
  const unresolvedRe = /\[\[poi:[a-z0-9-]+\]\]/;
  assert.ok(!unresolvedRe.test(html), `Des refs [[poi:]] non résolues trouvées dans le HTML`);
});

// T3. Totaux budget = somme des lignes (600 + 400 + 300 = 1300)
test('T3: total budget = somme des lignes (1300)', () => {
  // Lignes : 600 + 400 + 300 = 1300
  const expectedTotal = 1300;
  // Le total s'affiche en français : "1 300 $" (espace = séparateur milliers)
  // On cherche aussi sans espace au cas où le locale varie
  const totalPresent =
    html.includes('1 300') || // espace insécable
    html.includes('1 300') ||
    html.includes('1300') ||
    html.includes('1,300');
  assert.ok(totalPresent, `Total budget ${expectedTotal} absent du HTML`);

  // Vérifier que chaque ligne est présente
  assert.ok(html.includes('Hébergement'), 'Ligne Hébergement absente');
  assert.ok(html.includes('Transport'), 'Ligne Transport absente');
  assert.ok(html.includes('Repas'), 'Ligne Repas absente');
});

// T4. POI roles:["sleep","eat"] apparaît dans AccomGrid ET dans InfoColumns (poi-list)
test('T4: POI sleep+eat (auberge-test) dans AccomGrid ET liste poi-list', () => {
  // AccomGrid : la section .accom-grid doit être présente
  assert.ok(html.includes('accom-grid'), 'accom-grid absente du HTML');
  assert.ok(html.includes('accom-card'), 'accom-card absente du HTML');

  // InfoColumns poi-list : chercher poi-list-name contenant l'auberge
  assert.ok(html.includes('poi-list-name'), 'poi-list-name absent du HTML');

  // Les deux éléments distinctifs de AccomGrid pour l'auberge
  assert.ok(html.includes('accom-name'), 'accom-name absent (AccomGrid vide?)');
  assert.ok(html.includes('accom-tier'), 'accom-tier absent (tier du POI sleep non rendu)');

  // Le nom doit apparaître au moins 2 fois : accom-name + poi-list-name
  // (plus place-link dans le curatorial = au moins 3 fois total)
  const poiName = 'Auberge du Test';
  const count = (html.match(new RegExp(poiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.ok(count >= 2, `"${poiName}" devrait apparaître ≥2 fois (accom + poi-list), trouvé: ${count}`);
});

// T5. Base sans tagBlock → bloc tag-block absent (pas de markup vide)
test('T5: base sans tagBlock → pas de div.tag-block dans le HTML', () => {
  // La base testville n'a pas de tagBlock dans le frontmatter
  // Seule la classe tag-list vient des infoBlocks type:tags (Climat) — pas de tag-block
  const tagBlockCount = (html.match(/class="tag-block/g) || []).length;
  assert.equal(tagBlockCount, 0, `div.tag-block ne devrait pas apparaître (base sans tagBlock), trouvé: ${tagBlockCount}`);
});

// T6. infoBlock type:prose → body rendu tel quel
test('T6: infoBlock type:prose → body rendu tel quel dans le HTML', () => {
  assert.ok(html.includes('Une note en prose.'), 'Le body de l\'infoBlock prose absent du HTML');
});

// T7. extraLinks → pill stylée (.link-pill)
test('T7: extraLinks → classe .link-pill présente dans le HTML', () => {
  // auberge-test a extraLinks: [{ label: "AllTrails Test", url: "..." }]
  const pillCount = (html.match(/link-pill/g) || []).length;
  assert.ok(pillCount > 0, 'Aucun .link-pill trouvé dans le HTML (extraLinks non rendus)');
  assert.ok(html.includes('AllTrails Test'), 'Le label AllTrails Test absent du HTML');
});

// T8. package.json sans framework UI (react/svelte/vue/preact) — ARCHITECTURE §4 + ticket FR-4
test('T8: package.json sans framework UI (react/svelte/vue/preact)', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const forbidden = [
    'react', 'svelte', 'vue', 'preact',
    '@astrojs/react', '@astrojs/svelte', '@astrojs/vue', '@astrojs/preact',
  ];
  for (const dep of forbidden) {
    assert.ok(!allDeps[dep], `Framework UI interdit trouvé dans package.json: ${dep}`);
  }
});

// T9. MapSection : données markers sérialisées dans le HTML builté contiennent nom+coords d'un POI onMap
test('T9: markers sérialisés contiennent nom+coords d\'un POI onMap de la fixture', () => {
  // POI témoin : auberge-test (onMap:true, lat:48.85, lng:2.35, name:"Auberge du Test")
  // Les données sont sérialisées dans <script type="application/json" id="map-data-testville">
  assert.ok(
    html.includes('map-data-testville'),
    'Balise map-data-testville absente du HTML (MapSection non intégré)'
  );
  assert.ok(
    html.includes('Auberge du Test'),
    'Nom POI onMap "Auberge du Test" absent des données markers'
  );
  assert.ok(
    html.includes('48.85'),
    'Latitude 48.85 du POI onMap absente des données markers'
  );
  assert.ok(
    html.includes('2.35'),
    'Longitude 2.35 du POI onMap absente des données markers'
  );
});

// T10. Pas de NaN ni >undefined dans le HTML builté
test('T10: pas de "NaN" ni ">undefined" dans le HTML', () => {
  assert.ok(!html.includes('NaN'), 'Le HTML contient "NaN"');
  assert.ok(!html.includes('>undefined'), 'Le HTML contient ">undefined"');
});

// T11. header.hero présent dans le HTML (background-image conditionnel à imageUrl)
test('T11: header avec class="hero" présent dans le HTML', () => {
  assert.ok(
    html.includes('class="hero"'),
    'header.hero absent du HTML (composant Hero non rendu)'
  );
});
