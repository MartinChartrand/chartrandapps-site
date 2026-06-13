#!/usr/bin/env node
// validate-image-claims.mjs — ADR-5 : garde OFFLINE du vision-check sémantique (test de l'ami-témoin).
// Chaque image du manifeste porte un claim (son `alt`). Cette garde n'évalue PAS l'image (aucun réseau) —
// elle vérifie que le SCEAU sémantique écrit par vision-images.mjs est présent et frais :
//   - mismatch confirmé OU sceau périmé (sha/alt changé) → probleme (rouge, bloque)
//   - jamais vérifiée → inverifiable (jaune : ni prouvée bonne ni mauvaise — à sceller)
//   - sceau frais (match/unverifiable) → ok
// Sûre dans validate:fast (offline). Le jugement vision lui-même vit dans vision-images.mjs.
//
// Usage : node scripts/validate-image-claims.mjs [--json] [--strict] [dest]
//   --strict : « jamais vérifiée » devient rouge (à activer par destination une fois nettoyée)
// Exit : 0 = aucun probleme | 1 = ≥1 probleme | 2 = erreur d'exécution

import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import { listDestinations, loadImages } from './lib/load-content.mjs';
import { imageSlot, evaluateSemanticSeal } from './lib/image-context.mjs';

// ---------------------------------------------------------------------------
// Pure validation fn (testable sans I/O)
// ---------------------------------------------------------------------------

/**
 * Valide les sceaux sémantiques d'un lot d'images. Fn pure.
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  [opts.images]
 * @param {boolean} [opts.strict] — « jamais vérifiée » → probleme au lieu d'inverifiable
 * @param {string} [opts.ranAt]
 * @returns {import('./lib/report.mjs').Report}
 */
export function validateImageClaims({ dest, images = [], strict = false, ranAt = new Date().toISOString() }) {
  const verdicts = [];

  if (images.length === 0) {
    verdicts.push(verdict(dest, 'ok', 'aucune image'));
    return makeReport({ dest, script: 'validate-image-claims', ranAt, verdicts });
  }

  for (const img of images) {
    const id = imageSlot(img);
    let { state, detail } = evaluateSemanticSeal(img);
    if (strict && state === 'inverifiable') {
      state = 'probleme';
      detail = `[strict] ${detail}`;
    }
    verdicts.push(verdict(id, state, detail));
  }

  return makeReport({ dest, script: 'validate-image-claims', ranAt, verdicts });
}

// ---------------------------------------------------------------------------
// CLI entrypoint (offline — inclus dans validate:fast)
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const strict = args.includes('--strict');
  const destArg = args.find((a) => !a.startsWith('--'));

  const dests = destArg ? [destArg] : listDestinations();
  const ranAt = new Date().toISOString();
  const allVerdicts = [];

  for (const dest of dests) {
    let report;
    try {
      report = validateImageClaims({ dest, images: loadImages(dest), strict, ranAt });
    } catch (e) {
      process.stderr.write(`ERREUR [${dest}]: ${e.message}\n`);
      process.exit(2);
    }
    const single = destArg || dests.length === 1;
    for (const v of report.verdicts) {
      allVerdicts.push(single ? v : { ...v, id: `${dest}/${v.id}` });
    }
  }

  const dest = destArg ?? 'global';
  const report = { dest, script: 'validate-image-claims', ranAt, verdicts: allVerdicts };

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
  process.stdout.write(`validate-image-claims [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
  process.stdout.write(`  OK (scellées)     : ${ok.length}\n`);
  process.stdout.write(`  PROBLEME          : ${problems.length}\n`);
  process.stdout.write(`  À SCELLER (jaune) : ${inv.length}\n`);
  for (const v of problems) {
    process.stdout.write(`  [PROBLEME] ${v.id}: ${v.detail}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    process.stderr.write(`ERREUR FATALE: ${e.message}\n`);
    process.exit(2);
  }
}
