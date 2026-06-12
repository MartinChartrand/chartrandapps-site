#!/usr/bin/env node
// lint-orphans.mjs — FR-9 : POI jamais référencé → warning inverifiable, exit 0 toujours.
// Usage : node scripts/lint-orphans.mjs [--json] [dest]
// Exit : 0 toujours (orphelins = inverifiable, pas bloquant) | 2 = erreur d'exécution

import { fileURLToPath } from 'node:url';
import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import { extractPoiRefs } from './lib/refs.mjs';
import {
  listDestinations,
  loadPois,
  loadDishes,
  loadGems,
  loadBases,
} from './lib/load-content.mjs';

// ---------------------------------------------------------------------------
// Pure orphan detection
// ---------------------------------------------------------------------------

/**
 * Trouve les POIs orphelins (jamais référencés dans les sources de rendu).
 * Sources : onMap, roles∋sleep, prose [[poi:id]], infoBlocks poi-list items, dish/gem poiRef.
 *
 * @param {object} opts
 * @param {Array} opts.pois
 * @param {Array} opts.bases — [{...frontmatter, body}]
 * @param {Array} opts.dishes
 * @param {Array} opts.gems
 * @returns {string[]} ids orphelins
 */
export function findOrphans({ pois, bases, dishes, gems }) {
  const referenced = new Set();

  // 1. onMap : MapSection
  for (const poi of pois) {
    if (poi.onMap) referenced.add(poi.id);
  }

  // 2. roles∋sleep : AccomGrid
  for (const poi of pois) {
    if (Array.isArray(poi.roles) && poi.roles.includes('sleep')) referenced.add(poi.id);
  }

  // 3. Curatorial : refs [[poi:id]] dans la prose (body des bases)
  for (const base of bases) {
    for (const id of extractPoiRefs(base.body ?? '')) {
      referenced.add(id);
    }
  }

  // 4. InfoColumns : infoBlocks type:poi-list → items (ids)
  for (const base of bases) {
    for (const block of base.infoBlocks ?? []) {
      if (block.type === 'poi-list') {
        for (const id of block.items ?? []) {
          referenced.add(id);
        }
      }
    }
  }

  // 5. Dishes/gems poiRef
  for (const item of [...dishes, ...gems]) {
    if (item.poiRef) referenced.add(item.poiRef);
  }

  return pois.map((p) => p.id).filter((id) => !referenced.has(id));
}

// ---------------------------------------------------------------------------
// Lint fn (gère incomplete)
// ---------------------------------------------------------------------------

/**
 * Lint les POIs orphelins d'une destination.
 * Fn asychrone pour loadBases, mais logique pure une fois chargée.
 *
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  opts.pois
 * @param {Array}  opts.bases
 * @param {Array}  opts.dishes
 * @param {Array}  opts.gems
 * @param {boolean} opts.incomplete
 * @param {string} [opts.ranAt]
 * @returns {import('./lib/report.mjs').Report}
 */
export function lintOrphans({ dest, pois, bases, dishes, gems, incomplete, ranAt = new Date().toISOString() }) {
  const verdicts = [];

  if (incomplete) {
    verdicts.push(
      verdict(dest, 'inverifiable', 'bases illisibles — impossible de détecter les orphelins (re-check requis)')
    );
    return makeReport({ dest, script: 'lint-orphans', ranAt, verdicts, incomplete: true });
  }

  const orphans = findOrphans({ pois, bases, dishes, gems });

  if (orphans.length === 0) {
    verdicts.push(verdict(dest, 'ok', `${pois.length} POI(s) — aucun orphelin`));
  } else {
    for (const id of orphans) {
      verdicts.push(verdict(id, 'inverifiable', `POI orphelin : jamais référencé (narratif, infoBlocks, onMap, rôles, poiRef)`));
    }
  }

  return makeReport({ dest, script: 'lint-orphans', ranAt, verdicts });
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
  let anyIncomplete = false;

  for (const dest of dests) {
    const pois = loadPois(dest);
    const dishes = loadDishes(dest);
    const gems = loadGems(dest);

    let bases, incomplete;
    try {
      ({ bases, incomplete } = await loadBases(dest));
    } catch (e) {
      process.stderr.write(`ERREUR [${dest}]: ${e.message}\n`);
      process.exit(2);
    }

    if (incomplete) anyIncomplete = true;

    let report;
    try {
      report = lintOrphans({ dest, pois, bases, dishes, gems, incomplete, ranAt });
    } catch (e) {
      process.stderr.write(`ERREUR [${dest}]: ${e.message}\n`);
      process.exit(2);
    }

    allVerdicts.push(...report.verdicts);
  }

  const dest = destArg ?? 'global';
  const report = makeReport({ dest, script: 'lint-orphans', ranAt, verdicts: allVerdicts, incomplete: anyIncomplete });

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printReport(report);
  }

  // exit 0 toujours (orphelins = inverifiable, pas bloquant) sauf erreur→2
  process.exit(0);
}

function printReport(report) {
  const ok = report.verdicts.filter((v) => v.state === 'ok');
  const inv = report.verdicts.filter((v) => v.state === 'inverifiable');
  process.stdout.write(`lint-orphans [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
  process.stdout.write(`  OK           : ${ok.length}\n`);
  process.stdout.write(`  INVERIFIABLE : ${inv.length}\n`);
  if (report.incomplete) {
    process.stdout.write(`  [INCOMPLET] bases illisibles — résultat partiel\n`);
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
