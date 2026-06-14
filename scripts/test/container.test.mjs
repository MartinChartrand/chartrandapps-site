// container.test.mjs — node:test — garde du CONTAINER (survol) v3, ADR-5.
// Le rendu est gardé par episodic ; ICI on met des DENTS sur les lois du contrat
// (docs/CONTRAT-MACHINE-A-SAUCISSE.md) appliquées au container :
//   Loi 2 (sourcé ou inexistant) → le hook porte ≥1 source vérifiable (red flag de Léa, Décision 5).
//   Loi 3 (pixel)               → toute image du container (hook + tuiles) est un slot SCELLÉ, jamais du stock.
// Lit le VRAI contenu (pas une fixture) : un container creux/menteur fait rougir la CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { destinationSchema } from '../lib/schemas.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DEST_ROOT = join(ROOT, 'src/content/destinations');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'));

// Destinations episodic AVEC un bloc container (les seules concernées par le survol).
const containers = readdirSync(DEST_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((slug) => existsSync(join(DEST_ROOT, slug, 'destination.json')))
  .map((slug) => ({ slug, dest: readJson(join(DEST_ROOT, slug, 'destination.json')) }))
  .filter(({ dest }) => dest.episodic && dest.container);

// slot → entrée du manifest images.json de la destination
function imageManifest(slug) {
  const p = join(DEST_ROOT, slug, 'images.json');
  if (!existsSync(p)) return new Map();
  return new Map(readJson(p).map((i) => [i.slot, i]));
}
// « scellé » = visionCheckedSemantic présent ET verdict accepté (match | unverifiable).
// mismatch ou absence = pas scellé → un container ne doit JAMAIS afficher ça (Loi 3).
function isSealed(entry) {
  const v = entry?.visionCheckedSemantic;
  return !!v && (v.verdict === 'match' || v.verdict === 'unverifiable');
}

test('T-CONT-0: au moins une destination container existe (le dogfood ADR-5 est réel)', () => {
  assert.ok(containers.length >= 1, 'aucune destination episodic+container — ADR-5 non dogfoodé');
});

for (const { slug, dest } of containers) {
  const c = dest.container;
  const manifest = imageManifest(slug);

  test(`T-CONT-SCHEMA [${slug}]: destination.json (avec container) valide contre le schéma`, () => {
    const r = destinationSchema.safeParse(dest);
    assert.equal(r.success, true, r.success ? '' : JSON.stringify(r.error?.issues, null, 2));
  });

  test(`T-CONT-1 [${slug}]: le hook porte ≥1 source vérifiable (Loi 2, red flag Léa)`, () => {
    assert.ok(Array.isArray(c.sources) && c.sources.length >= 1, 'hook sans source — il n’existe pas');
    for (const s of c.sources) {
      assert.ok(s.url && /^https?:\/\//.test(s.url), `source sans URL http(s) : ${JSON.stringify(s)}`);
      assert.ok(s.creator && s.creator.trim().length > 0, 'source sans créateur');
    }
  });

  test(`T-CONT-2 [${slug}]: hookImage est un slot SCELLÉ du manifest (Loi 3)`, () => {
    const entry = manifest.get(c.hookImage);
    assert.ok(entry, `hookImage "${c.hookImage}" absent de images.json`);
    assert.ok(isSealed(entry), `hookImage "${c.hookImage}" pas scellé (verdict ${entry?.visionCheckedSemantic?.verdict ?? 'absent'})`);
  });

  test(`T-CONT-3 [${slug}]: chaque tuile AVEC image pointe un slot SCELLÉ (zéro stock menteur)`, () => {
    for (const t of c.tiles ?? []) {
      if (!t.image) continue; // tuile « à venir » sans image = honnête, pas un manquement
      const entry = manifest.get(t.image);
      assert.ok(entry, `tuile "${t.base}" : image "${t.image}" absente du manifest`);
      assert.ok(isSealed(entry), `tuile "${t.base}" : image "${t.image}" pas scellée (${entry?.visionCheckedSemantic?.verdict ?? 'absent'})`);
    }
  });

  test(`T-CONT-4 [${slug}]: au moins une tuile « live » correspond à un épisode réel (container↔épisodes)`, () => {
    const epDir = join(DEST_ROOT, slug, 'episodes');
    const liveTiles = (c.tiles ?? []).filter((t) => existsSync(join(epDir, `${t.base}.json`)));
    assert.ok(liveTiles.length >= 1, 'aucune tuile ne pointe un épisode existant — survol sans porte ouverte');
    // Une tuile AVEC image doit avoir un titre (le hook), jamais une vignette nue.
    for (const t of liveTiles) assert.ok(t.title?.trim(), `tuile live "${t.base}" sans titre-hook`);
  });
}
