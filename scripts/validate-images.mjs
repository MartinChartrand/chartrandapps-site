#!/usr/bin/env node
// validate-images.mjs — FR-8 : unicité sha256 globale, claims:place, vision-check.
// Usage : node scripts/validate-images.mjs [--json] [dest]
// Exit : 0 = aucun probleme | 1 = ≥1 probleme | 2 = erreur d'exécution

import { fileURLToPath } from 'node:url';
import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import {
  listDestinations,
  loadImages,
  loadVisionLock,
  loadReuseAllowlist,
} from './lib/load-content.mjs';

// ---------------------------------------------------------------------------
// Pure validation fn (testable sans I/O)
// ---------------------------------------------------------------------------

/**
 * Identifiant d'une image : id ?? slot.
 * @param {{id?:string, slot?:string}} img
 * @returns {string}
 */
export function imgId(img) {
  return img.id ?? img.slot ?? '(sans-id)';
}

/**
 * Valide un ensemble d'images pour une destination.
 * Fn pure : aucun I/O.
 *
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  opts.images
 * @param {Set<string>} [opts.reuseAllowlist]
 * @param {Record<string,{sha256:string,alt:string}>} [opts.visionLock]
 * @param {string} [opts.ranAt]
 * @returns {import('./lib/report.mjs').Report}
 */
export function validateImages({
  dest,
  images = [],
  reuseAllowlist = new Set(),
  visionLock = {},
  ranAt = new Date().toISOString(),
}) {
  const verdicts = [];

  if (images.length === 0) {
    verdicts.push(verdict(dest, 'ok', 'aucune image'));
    return makeReport({ dest, script: 'validate-images', ranAt, verdicts });
  }

  // 1. Unicité sha256 (globale dans le périmètre fourni)
  const bySha = new Map();
  for (const img of images) {
    const sha = img.sha256;
    if (!sha) continue;
    if (!bySha.has(sha)) bySha.set(sha, []);
    bySha.get(sha).push(img);
  }
  for (const [sha, group] of bySha.entries()) {
    if (group.length > 1 && !reuseAllowlist.has(sha)) {
      const ids = group.map(imgId).join(', ');
      for (const img of group) {
        verdicts.push(
          verdict(imgId(img), 'probleme', `sha256 dupliqué (${sha.slice(0, 12)}…) partagé avec : ${ids}`)
        );
      }
    }
  }

  // 2. claims:place interdit si source ≠ perso
  for (const img of images) {
    if (img.claims === 'place' && img.credit?.source !== 'perso') {
      verdicts.push(
        verdict(
          imgId(img),
          'probleme',
          `claims:"place" interdit avec source:"${img.credit?.source ?? 'absente'}" (réservé aux photos perso)`
        )
      );
    }
  }

  // 3. Vision-check invalidé si sha256 OU alt modifié depuis le lock
  for (const img of images) {
    const id = imgId(img);
    const lock = visionLock[id];
    if (!lock) continue; // sidecar absent ou id absent → check dormant
    if (img.sha256 !== lock.sha256) {
      verdicts.push(
        verdict(id, 'probleme', `vision-check invalidé : sha256 modifié depuis le lock (re-check requis)`)
      );
    } else if (img.alt !== lock.alt) {
      verdicts.push(
        verdict(id, 'probleme', `vision-check invalidé : alt modifié depuis le lock (re-check requis)`)
      );
    }
  }

  if (verdicts.length === 0) {
    verdicts.push(verdict(dest, 'ok', `${images.length} image(s) valides`));
  }

  return makeReport({ dest, script: 'validate-images', ranAt, verdicts });
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const destArg = args.find((a) => !a.startsWith('--'));

  const dests = destArg ? [destArg] : listDestinations();

  const allVerdicts = [];
  const ranAt = new Date().toISOString();

  // Agrégat sha256 global (cross-dest) : on charge toutes les images d'abord
  if (!destArg && dests.length > 1) {
    // Mode multi-dest : unicité globale → agréger toutes les images avec id préfixé par dest
    const allImages = [];
    const reuseAllowlist = new Set();
    const visionLock = {};

    for (const dest of dests) {
      const images = loadImages(dest).map((img) => ({
        ...img,
        id: `${dest}/${imgId(img)}`,
      }));
      allImages.push(...images);
      for (const sha of loadReuseAllowlist(dest)) reuseAllowlist.add(sha);
      const lock = loadVisionLock(dest);
      for (const [id, v] of Object.entries(lock)) {
        visionLock[`${dest}/${id}`] = v;
      }
    }

    const report = validateImages({ dest: 'global', images: allImages, reuseAllowlist, visionLock, ranAt });
    if (jsonOutput) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else {
      printReport(report);
    }
    process.exit(hasProblems(report) ? 1 : 0);
    return;
  }

  // Mode single-dest (ou dests.length === 1)
  for (const dest of dests) {
    const images = loadImages(dest);
    const reuseAllowlist = loadReuseAllowlist(dest);
    const visionLock = loadVisionLock(dest);

    let report;
    try {
      report = validateImages({ dest, images, reuseAllowlist, visionLock, ranAt });
    } catch (e) {
      process.stderr.write(`ERREUR [${dest}]: ${e.message}\n`);
      process.exit(2);
    }
    allVerdicts.push(...report.verdicts);
  }

  const dest = destArg ?? (dests[0] ?? 'global');
  const report = { dest, script: 'validate-images', ranAt, verdicts: allVerdicts };

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printReport(report);
  }

  process.exit(hasProblems(report) ? 1 : 0);
}

function printReport(report) {
  const problems = report.verdicts.filter((v) => v.state === 'probleme');
  const ok = report.verdicts.filter((v) => v.state === 'ok');
  const inv = report.verdicts.filter((v) => v.state === 'inverifiable');
  process.stdout.write(`validate-images [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
  process.stdout.write(`  OK           : ${ok.length}\n`);
  process.stdout.write(`  PROBLEME     : ${problems.length}\n`);
  process.stdout.write(`  INVERIFIABLE : ${inv.length}\n`);
  for (const v of problems) {
    process.stdout.write(`  [PROBLEME] ${v.id}: ${v.detail}\n`);
  }
  for (const v of inv) {
    process.stdout.write(`  [?] ${v.id}: ${v.detail}\n`);
  }
}

// Lance main() seulement si exécuté directement (pas importé par les tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    process.stderr.write(`ERREUR FATALE: ${e.message}\n`);
    process.exit(2);
  });
}
