/**
 * fetch-images.test.mjs — Test manifest (ticket 24abdaae).
 * « chaque slot d'images.json a un fichier existant et un sha256 valide
 *   (sur fixture réduite — pas de réseau dans les tests ; fetch mocké/local). »
 *
 * Le cœur `downloadManifest` est injecté avec un `fetchImpl` mock qui renvoie des
 * bytes locaux déterministes — aucun accès réseau.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { downloadManifest, sha256hex } from '../migrate/fetch-images.mjs';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// Bytes déterministes par slot (faux JPEG — le contenu importe peu, seule la cohérence sha256 compte).
const fakeBytes = (slot) => Buffer.from(`FAKE-JPEG::${slot}::`.repeat(16), 'utf8');

/** fetchImpl mock : sert des bytes locaux pour les URLs connues, 404 sinon. Zéro réseau. */
function mockFetch(byUrl) {
  return async (url) => {
    if (byUrl.has(url)) {
      const bytes = byUrl.get(url);
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
    }
    return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

function tmpDir() {
  const dir = mkdtempSync(join(tmpdir(), 'fetch-img-test-'));
  return { dir, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} } };
}

// Manifest réduit type sortie d'extract.mjs (slots + `_url`, sans sha256/file résolu).
function reducedManifest() {
  return [
    { slot: 'chania-cover', file: 'chania-cover.jpg', alt: 'Port vénitien', layout: 'wide',
      claims: 'atmosphere', credit: { source: 'unsplash', photoId: 'aaa', photographer: '', license: 'unsplash-standard' },
      _url: 'https://images.unsplash.com/photo-aaa?w=1800&q=85' },
    { slot: 'loutro-cover', file: 'loutro-cover.jpg', alt: 'Baie de Loutro', layout: null,
      claims: 'atmosphere', credit: { source: 'unsplash', photoId: 'bbb', photographer: '', license: 'unsplash-standard' },
      _url: 'https://images.unsplash.com/photo-bbb?w=1800&q=85' },
    { slot: 'tamam-table', file: 'tamam-table.jpg', alt: 'Mezze crétois', layout: null,
      claims: 'atmosphere', credit: { source: 'unsplash', photoId: 'ccc', photographer: '', license: 'unsplash-standard' },
      _url: 'https://images.unsplash.com/photo-ccc?w=600&q=80' },
  ];
}

test('MAN-1: chaque slot a un fichier existant et un sha256 valide (fetch mocké)', async () => {
  const { dir, cleanup } = tmpDir();
  try {
    const images = reducedManifest();
    const byUrl = new Map(images.map((i) => [i._url, fakeBytes(i.slot)]));

    const { results } = await downloadManifest({ images, assetsDir: dir, fetchImpl: mockFetch(byUrl) });

    assert.equal(results.ok, 3, 'les 3 images doivent être téléchargées');
    assert.equal(results.dead, 0);

    for (const img of images) {
      // 1. fichier existant
      const file = join(dir, img.file);
      assert.ok(existsSync(file), `fichier manquant pour slot ${img.slot}`);
      // 2. sha256 présent + format valide (64 hex)
      assert.match(img.sha256 || '', /^[0-9a-f]{64}$/, `sha256 invalide pour ${img.slot}`);
      // 3. sha256 cohérent avec le contenu réel du fichier sur disque
      assert.equal(img.sha256, sha(readFileSync(file)), `sha256 ≠ contenu disque pour ${img.slot}`);
      // 4. `_url` retiré une fois résolu (manifest final propre)
      assert.equal(img._url, undefined, `_url devrait être retiré pour ${img.slot}`);
    }
  } finally {
    cleanup();
  }
});

test('MAN-2: image morte (404) → rapportée, non bloquante, pas de fichier', async () => {
  const { dir, cleanup } = tmpDir();
  try {
    const images = reducedManifest();
    // Seules 2 des 3 URLs servent des bytes ; la 3e (tamam) renverra 404.
    const byUrl = new Map(images.slice(0, 2).map((i) => [i._url, fakeBytes(i.slot)]));

    const { results, dead } = await downloadManifest({ images, assetsDir: dir, fetchImpl: mockFetch(byUrl) });

    assert.equal(results.ok, 2);
    assert.equal(results.dead, 1);
    assert.equal(dead.length, 1);
    assert.equal(dead[0].slot, 'tamam-table');
    assert.equal(dead[0].status, 404);

    const tamam = images.find((i) => i.slot === 'tamam-table');
    assert.equal(tamam.dead, true, 'image morte marquée dead');
    assert.ok(!existsSync(join(dir, tamam.file)), 'aucun fichier écrit pour image morte');
  } finally {
    cleanup();
  }
});

test('MAN-3: sha256hex est déterministe et conforme', () => {
  const buf = Buffer.from('hello');
  assert.equal(sha256hex(buf), sha(buf));
  assert.match(sha256hex(buf), /^[0-9a-f]{64}$/);
});
