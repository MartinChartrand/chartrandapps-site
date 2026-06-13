#!/usr/bin/env node
// validate-provenance.mjs — ADR-1/2/3 : garde OFFLINE de provenance (build ROUGE).
// Une reco publiable (entité poi/dish/gem avec `story` non-vide) DOIT porter sa provenance :
//   - récit d'une longueur minimale (un narratif vide est pire que rien — ADR-1 Sophie)
//   - approvedBy:human (pas de publication auto — ADR-3)
//   - ≥2 sources de créateurs DISTINCTS, OU singleSourceTrusted (convergence — ADR-2)
// Déterministe, aucun réseau → sûre dans validate:fast. Aujourd'hui zéro `story` → no-op vert ;
// mord dès que le carnet de bouche arrive (Léa : échouer FORT, pas un warning).
//
// Ce que la garde NE fait PAS (jugement du skill, ADR-2) : le vrai test d'indépendance — antériorité
// temporelle disjointe, absence de citation croisée, divergence du détail concret. Ni le schéma ni un
// compte de sources ne peuvent le faire ; ça vit dans /voyage-new. La garde est le plancher structurel.
//
// Usage : node scripts/validate-provenance.mjs [--json] [dest]
// Exit : 0 = aucun probleme | 1 = ≥1 probleme | 2 = erreur d'exécution

import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import { listDestinations, loadPois, loadDishes, loadGems } from './lib/load-content.mjs';

// Longueur minimale d'un récit publiable (≈ une vraie phrase). En-deçà = fiche déguisée, pas un narratif.
export const MIN_STORY_LEN = 60;

/** Vrai si l'entité porte un récit non-vide (story optionnelle ; vide => non affiché). */
export function hasStory(entity) {
  return typeof entity?.story === 'string' && entity.story.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Pure validation fn (testable sans I/O)
// ---------------------------------------------------------------------------

/**
 * Valide la provenance des entités porteuses de récit. Fn pure.
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  [opts.pois]
 * @param {Array}  [opts.dishes]
 * @param {Array}  [opts.gems]
 * @param {string} [opts.ranAt]
 * @returns {import('./lib/report.mjs').Report}
 */
export function validateProvenance({ dest, pois = [], dishes = [], gems = [], ranAt = new Date().toISOString() }) {
  const verdicts = [];

  const entities = [];
  for (const [collection, arr] of [['pois', pois], ['dishes', dishes], ['gems', gems]]) {
    for (const entity of arr) {
      if (hasStory(entity)) entities.push({ collection, entity });
    }
  }

  if (entities.length === 0) {
    verdicts.push(verdict(dest, 'ok', 'aucun récit à valider'));
    return makeReport({ dest, script: 'validate-provenance', ranAt, verdicts });
  }

  for (const { collection, entity } of entities) {
    const id = `${collection}/${entity.id}`;
    const problems = [];

    if (entity.story.trim().length < MIN_STORY_LEN) {
      problems.push(`récit trop court (${entity.story.trim().length} < ${MIN_STORY_LEN} car.)`);
    }
    if (entity.approvedBy !== 'human') {
      problems.push('approbation humaine manquante (approvedBy:"human" requis — pas de publication auto)');
    }

    const sources = Array.isArray(entity.sources) ? entity.sources : [];
    const distinctCreators = new Set(sources.map((s) => s?.creator).filter(Boolean)).size;
    if (entity.singleSourceTrusted === true) {
      // 1 créateur d'autorité vérifiée — convergence non requise. (Le skill a validé l'autorité.)
    } else if (sources.length < 2) {
      problems.push(`convergence insuffisante : ${sources.length} source(s), ≥2 requis (ou singleSourceTrusted)`);
    } else if (distinctCreators < 2) {
      problems.push(`${sources.length} sources mais ${distinctCreators} créateur distinct — pas une convergence (≥2 créateurs)`);
    }

    if (problems.length > 0) {
      verdicts.push(verdict(id, 'probleme', problems.join(' ; ')));
    } else {
      verdicts.push(verdict(id, 'ok', 'provenance complète'));
    }
  }

  return makeReport({ dest, script: 'validate-provenance', ranAt, verdicts });
}

// ---------------------------------------------------------------------------
// CLI entrypoint (offline — inclus dans validate:fast)
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const destArg = args.find((a) => !a.startsWith('--'));

  const dests = destArg ? [destArg] : listDestinations();
  const ranAt = new Date().toISOString();
  const allVerdicts = [];

  for (const dest of dests) {
    let report;
    try {
      report = validateProvenance({
        dest,
        pois: loadPois(dest),
        dishes: loadDishes(dest),
        gems: loadGems(dest),
        ranAt,
      });
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
  const report = { dest, script: 'validate-provenance', ranAt, verdicts: allVerdicts };

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
  process.stdout.write(`validate-provenance [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
  process.stdout.write(`  OK       : ${ok.length}\n`);
  process.stdout.write(`  PROBLEME : ${problems.length}\n`);
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
