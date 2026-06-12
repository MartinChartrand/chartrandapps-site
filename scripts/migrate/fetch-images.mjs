#!/usr/bin/env node
/**
 * fetch-images.mjs — Télécharge les hotlinks Unsplash et génère/complète images.json (sha256).
 * Usage: node scripts/migrate/fetch-images.mjs <dest-slug>
 *        node scripts/migrate/fetch-images.mjs <dest-slug> --images-json <path>
 *        node scripts/migrate/fetch-images.mjs <dest-slug> --dry-run
 * Exit 0 = OK (même si des images sont mortes — non bloquant), 2 = erreur critique.
 *
 * One-shot migration script — gelé, jamais maintenu, commité pour traçabilité.
 * Le cœur (`downloadManifest`) est injectable (`fetchImpl`) pour être testé hors réseau.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 15_000;

export function sha256hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export async function fetchWithTimeout(url, ms = TIMEOUT_MS, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cœur testable : télécharge chaque image d'un manifest, écrit le fichier,
 * complète l'entrée (sha256 + file) et retire `_url`. Mute `images` en place.
 * `fetchImpl` est injectable (mock local dans les tests — zéro réseau).
 * @returns {{results:{ok:number,dead:number,skipped:number}, dead:Array}}
 */
export async function downloadManifest({
  images,
  assetsDir,
  fetchImpl = fetch,
  dryRun = false,
  timeoutMs = TIMEOUT_MS,
  log = () => {},
}) {
  if (!Array.isArray(images)) throw new Error('images must be an array');
  if (!dryRun) mkdirSync(assetsDir, { recursive: true });

  const results = { ok: 0, dead: 0, skipped: 0 };
  const dead = [];

  for (const img of images) {
    const url = img._url || img.url;
    if (!url) {
      log(`  SKIP  ${img.slot} — no URL`);
      results.skipped++;
      continue;
    }

    const file = img.file || `${img.slot}.jpg`;
    const outFile = join(assetsDir, file);

    if (existsSync(outFile) && img.sha256) {
      log(`  CACHED ${img.slot}`);
      results.skipped++;
      continue;
    }

    if (dryRun) {
      log(`  DRY   ${img.slot} ← ${url.slice(0, 80)}`);
      results.ok++;
      continue;
    }

    try {
      const res = await fetchWithTimeout(url, timeoutMs, fetchImpl);
      if (!res.ok) {
        log(`  ${res.status} DEAD ${img.slot}`);
        dead.push({ slot: img.slot, url, status: res.status });
        results.dead++;
        img.dead = true;
        img.deadStatus = res.status;
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(outFile, buf);
      img.sha256 = sha256hex(buf);
      img.file = file;
      delete img._url;
      delete img.dead;
      delete img.deadStatus;
      delete img.deadReason;

      log(`  OK    ${img.slot} (${buf.length} bytes, sha256=${img.sha256.slice(0, 12)}…)`);
      results.ok++;
    } catch (e) {
      const reason = e.name === 'AbortError' ? 'TIMEOUT' : e.message;
      log(`  ERR   ${img.slot}: ${reason}`);
      dead.push({ slot: img.slot, url, reason });
      results.dead++;
      img.dead = true;
      img.deadReason = reason;
    }
  }

  return { results, dead };
}

async function main() {
  const args = process.argv.slice(2);
  const destSlug = args.find((a) => !a.startsWith('-'));
  const dryRun = args.includes('--dry-run');
  const imagesJsonIdx = args.indexOf('--images-json');
  const customImagesJson = imagesJsonIdx !== -1 ? args[imagesJsonIdx + 1] : null;

  if (!destSlug) {
    process.stderr.write('Usage: node fetch-images.mjs <dest-slug> [--dry-run] [--images-json <path>]\n');
    process.exit(2);
  }

  const imagesJsonPath = customImagesJson || `src/content/destinations/${destSlug}/images.json`;
  if (!existsSync(imagesJsonPath)) {
    process.stderr.write(`Error: images.json not found at ${imagesJsonPath}\n`);
    process.exit(2);
  }

  let images;
  try {
    images = JSON.parse(readFileSync(imagesJsonPath, 'utf8'));
  } catch (e) {
    process.stderr.write(`Error parsing images.json: ${e.message}\n`);
    process.exit(2);
  }
  if (!Array.isArray(images)) {
    process.stderr.write('Error: images.json must be an array\n');
    process.exit(2);
  }

  const assetsDir = `src/assets/destinations/${destSlug}`;
  const log = (m) => process.stdout.write(m + '\n');

  let out;
  try {
    out = await downloadManifest({ images, assetsDir, dryRun, log });
  } catch (e) {
    process.stderr.write(`Fatal: ${e.message}\n`);
    process.exit(2);
  }

  if (!dryRun) {
    writeFileSync(imagesJsonPath, JSON.stringify(images, null, 2) + '\n');
    log(`\nimages.json mis à jour — ${imagesJsonPath}`);
  }

  const { results, dead } = out;
  log(`\nRésumé: ${results.ok} OK · ${results.dead} mortes · ${results.skipped} ignorées`);
  if (dead.length) {
    log('\nImages mortes (à remplacer — workflow images du skill, hors scope extracteur) :');
    for (const d of dead) log(`  ${d.slot} — ${(d.url || '').slice(0, 80)} (${d.status || d.reason})`);
  }
  // Exit 0 même si des images sont mortes (non bloquant). Exit 2 = erreur critique seulement.
  process.exit(0);
}

const isMain =
  process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1]?.endsWith('fetch-images.mjs');

if (isMain) {
  main().catch((e) => {
    process.stderr.write(`Fatal: ${e.message}\n${e.stack}\n`);
    process.exit(2);
  });
}
