// e2e-correction.test.mjs — node:test — CUJ-2 : modifier un champ POI → rebuild → vérification HTML
// ARCHITECTURE §8 : v2 pipeline — correction d'un champ = rebuild = HTML mis à jour.
// Ce test modifie temporairement la fixture pois.json, rebuild, vérifie, puis restaure.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const POIS_PATH = join(ROOT, 'src/content/destinations/test-fixture/pois.json');
const HTML_PATH = join(DIST, 'test-fixture/index.html');

const ORIGINAL_NAME = 'Auberge du Test';
const MODIFIED_NAME = 'Auberge Modifiée';

let originalPoisJson = '';

before(() => {
  // Sauvegarder le contenu original
  originalPoisJson = readFileSync(POIS_PATH, 'utf-8');
});

after(() => {
  // Toujours restaurer le fichier original, même en cas d'échec
  if (originalPoisJson) {
    writeFileSync(POIS_PATH, originalPoisJson, 'utf-8');
    // Rebuild pour remettre dist/ dans son état d'origine
    try {
      execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
    } catch {
      // best-effort — ne pas masquer une erreur de test
    }
  }
});

test('CUJ-2: modifier un champ POI → rebuild → changement visible dans le HTML', async () => {
  // 1. Modifier le nom de auberge-test
  const pois = JSON.parse(originalPoisJson);
  const auberge = pois.find((p) => p.id === 'auberge-test');
  assert.ok(auberge, 'POI auberge-test introuvable dans la fixture');
  assert.equal(auberge.name, ORIGINAL_NAME, `Nom original attendu: "${ORIGINAL_NAME}"`);

  auberge.name = MODIFIED_NAME;
  writeFileSync(POIS_PATH, JSON.stringify(pois, null, 2), 'utf-8');

  // 2. Rebuild
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    throw new Error(`Build failed after modification:\n${e.stderr?.toString() ?? e.message}`);
  }

  // 3. Lire le HTML builté et vérifier le changement
  const html = readFileSync(HTML_PATH, 'utf-8');

  // Le nom modifié doit apparaître dans le HTML
  assert.ok(html.includes(MODIFIED_NAME), `"${MODIFIED_NAME}" absent du HTML après rebuild`);

  // L'ancien nom ne doit plus apparaître
  assert.ok(!html.includes(ORIGINAL_NAME), `"${ORIGINAL_NAME}" encore présent dans le HTML après modification`);
});
