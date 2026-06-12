#!/usr/bin/env node
// revalidate-businesses.mjs — FR-10 : wrapper claude -p avec contrat JSON strict.
// Usage : node scripts/revalidate-businesses.mjs [dest]
// Exit : 0 = complet, aucun closed-confirmed
//        1 = complet, ≥1 closed-confirmed trouvé (pois.json mis à jour)
//        2 = sortie claude non conforme ou crash — AUCUN fichier modifié
//
// Session seulement (JAMAIS en cron — décision débat 4-0, ARCHITECTURE §1).
// Claude injectable via CLAUDE_BIN env var (tests) ou 3e argument CLI.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import { loadPois, DEST_ROOT } from './lib/load-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORTS_DIR = join(ROOT, 'reports');

// ---------------------------------------------------------------------------
// Schéma de sortie claude — contrat JSON strict
// ---------------------------------------------------------------------------

const poiVerdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(['open', 'closed-confirmed', 'unverifiable']),
  sources: z.array(z.string()),
  reason: z.string(),
});

export const claudeOutputSchema = z.object({
  results: z.array(poiVerdictSchema),
  incomplete: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Règle seasonal
// ---------------------------------------------------------------------------

/**
 * Si le POI est seasonal et que le verdict est closed-confirmed sans sources explicites,
 * dégrade vers unverifiable (ARCHITECTURE §6 — jamais closed-confirmed sans source hors-saison).
 * @param {{ verdict: string, sources: string[] }} poiVerdict
 * @param {{ seasonal?: boolean }} poi
 * @returns {{ verdict: string, sources: string[], reason: string }}
 */
export function applySeasonalRule(poiVerdict, poi) {
  if (
    poi.seasonal === true &&
    poiVerdict.verdict === 'closed-confirmed' &&
    poiVerdict.sources.length === 0
  ) {
    return {
      ...poiVerdict,
      verdict: 'unverifiable',
      reason: `[seasonal] ${poiVerdict.reason} — dégradé : closed-confirmed sans source explicite hors-saison interdit`,
    };
  }
  return poiVerdict;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Construit le prompt envoyé à claude.
 * @param {Array} pois — POIs avec open:true à revalider
 * @param {string} dest
 * @returns {string}
 */
export function buildPrompt(pois, dest) {
  const poisSummary = pois.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    seasonal: p.seasonal ?? false,
    official: p.links?.official ?? null,
    tripadvisor: p.links?.tripadvisor ?? null,
    maps: p.links?.maps ?? null,
  }));

  return `Tu es un assistant de validation de données touristiques pour la destination "${dest}".

Voici une liste de points d'intérêt (businesses) à revalider. Pour chacun, recherche s'il est encore ouvert.

POIs à valider :
${JSON.stringify(poisSummary, null, 2)}

Pour chaque POI, retourne un verdict parmi :
- "open" : ouvert (confirmé ou présumé)
- "closed-confirmed" : fermeture confirmée par une ou plusieurs sources explicites
- "unverifiable" : impossible à confirmer (site inaccessible, résultats ambigus, etc.)

RÈGLE IMPORTANTE : Si un POI a seasonal=true, n'utilise "closed-confirmed" que si tu as une source explicite qui confirme la fermeture hors-saison. Sinon, utilise "unverifiable".

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans commentaire :
{
  "results": [
    {
      "id": "id-du-poi",
      "verdict": "open|closed-confirmed|unverifiable",
      "sources": ["url ou description de la source"],
      "reason": "explication courte"
    }
  ],
  "incomplete": false
}

Si tu ne peux pas valider tous les POIs, mets incomplete:true et inclus les résultats partiels.`;
}

// ---------------------------------------------------------------------------
// Runner claude
// ---------------------------------------------------------------------------

/**
 * Lance claude -p et retourne stdout brut + code de sortie.
 * Ne lève PAS d'exception — retourne l'état brut.
 * @param {string} prompt
 * @param {{ bin?: string, timeoutMs?: number }} opts
 * @returns {{ stdout: string, stderr: string, status: number|null, timedOut: boolean }}
 */
export function runClaude(prompt, { bin = 'claude', timeoutMs = 120_000 } = {}) {
  const result = spawnSync(bin, ['-p', prompt], {
    timeout: timeoutMs,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
    timedOut: result.error?.code === 'ETIMEDOUT',
  };
}

// ---------------------------------------------------------------------------
// Parser sortie claude
// ---------------------------------------------------------------------------

/**
 * Extrait et valide le JSON de la sortie brute de claude.
 * Accepte du JSON entouré de texte (markdown fences, etc.).
 * @param {string} raw
 * @returns {{ ok: true, data: object } | { ok: false, reason: string }}
 */
export function parseClaudeOutput(raw) {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, reason: 'sortie vide' };
  }

  // Cherche le premier objet JSON dans la sortie (ignore le markdown autour)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { ok: false, reason: 'aucun objet JSON trouvé dans la sortie' };
  }

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    return { ok: false, reason: `JSON invalide : ${e.message}` };
  }

  const result = claudeOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, reason: `schéma non conforme : ${result.error.message}` };
  }

  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Transitions d'état
// ---------------------------------------------------------------------------

/**
 * Applique les transitions d'état aux POIs selon les résultats claude.
 * Fn pure — ne touche pas au disque.
 * @param {Array} pois — liste complète des POIs (open et closed)
 * @param {Array} results — résultats claude (poiVerdictSchema[])
 * @param {string} ranAt — ISO timestamp
 * @returns {{ updatedPois: Array, verdicts: Array }}
 */
export function applyTransitions(pois, results, ranAt) {
  const resultById = new Map(results.map((r) => [r.id, r]));
  const today = ranAt.slice(0, 10); // YYYY-MM-DD

  const verdicts = [];
  const updatedPois = pois.map((poi) => {
    const raw = resultById.get(poi.id);
    if (!raw) return poi; // non inclus dans ce run → inchangé

    const poiResult = applySeasonalRule(raw, poi);

    if (poiResult.verdict === 'closed-confirmed') {
      verdicts.push(verdict(poi.id, 'probleme', `closed-confirmed : ${poiResult.reason}`));
      return {
        ...poi,
        status: { open: false, lastChecked: today, method: 'claude-revalidate' },
      };
    }

    if (poiResult.verdict === 'unverifiable') {
      verdicts.push(verdict(poi.id, 'inverifiable', poiResult.reason));
      return {
        ...poi,
        status: { ...poi.status, lastChecked: today, method: 'claude-revalidate' },
      };
    }

    // open
    verdicts.push(verdict(poi.id, 'ok', poiResult.reason || 'ouvert'));
    return {
      ...poi,
      status: { open: true, lastChecked: today, method: 'claude-revalidate' },
    };
  });

  return { updatedPois, verdicts };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * Écrit pois.json pour une destination.
 * @param {string} dest
 * @param {Array} pois
 */
export function writePoisJson(dest, pois) {
  const path = join(DEST_ROOT, dest, 'pois.json');
  writeFileSync(path, JSON.stringify(pois, null, 2) + '\n', 'utf-8');
}

/**
 * Écrit le rapport dans reports/<dest>-<date>.json.
 * Crée le répertoire reports/ si absent.
 * @param {object} report
 */
export function writeReport(report) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const date = report.ranAt.slice(0, 10);
  const path = join(REPORTS_DIR, `${report.dest}-${date}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  return path;
}

// ---------------------------------------------------------------------------
// Core — fn testable sans I/O
// ---------------------------------------------------------------------------

/**
 * Revalide les businesses d'une destination.
 * Fn pure côté logique — les I/O (writePoisJson, writeReport) sont délégués au caller.
 *
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array} [opts.poisList] — POIs injectés (tests) ; si absent, chargés depuis le disque
 * @param {string} [opts.claudeBin]
 * @param {number} [opts.timeoutMs]
 * @param {string} [opts.ranAt]
 * @returns {{ exitCode: number, report: object, updatedPois: Array|null }}
 */
export function revalidateBusinesses({
  dest,
  poisList,
  claudeBin = 'claude',
  timeoutMs = 120_000,
  ranAt,
}) {
  const ts = ranAt ?? new Date().toISOString();
  const pois = poisList ?? loadPois(dest);
  const openPois = pois.filter((p) => p.status?.open === true);

  if (openPois.length === 0) {
    const report = makeReport({
      dest,
      script: 'revalidate-businesses',
      ranAt: ts,
      verdicts: [verdict(dest, 'ok', 'aucun POI open à revalider')],
    });
    return { exitCode: 0, report, updatedPois: pois };
  }

  const prompt = buildPrompt(openPois, dest);
  const { stdout, status, timedOut } = runClaude(prompt, { bin: claudeBin, timeoutMs });

  // Crash / timeout → rapport INCOMPLETE, exit 2
  if (status !== 0 || timedOut) {
    const report = makeReport({
      dest,
      script: 'revalidate-businesses',
      ranAt: ts,
      verdicts: [],
      incomplete: true,
    });
    return { exitCode: 2, report, updatedPois: null };
  }

  const parsed = parseClaudeOutput(stdout);

  // Sortie non conforme → exit 2
  if (!parsed.ok) {
    const report = makeReport({
      dest,
      script: 'revalidate-businesses',
      ranAt: ts,
      verdicts: [verdict(dest, 'inverifiable', `sortie claude non conforme : ${parsed.reason}`)],
      incomplete: true,
    });
    return { exitCode: 2, report, updatedPois: null };
  }

  const { data } = parsed;
  const { updatedPois, verdicts: transitionVerdicts } = applyTransitions(pois, data.results, ts);

  const hasClosedConfirmed = transitionVerdicts.some((v) => v.state === 'probleme');
  const report = makeReport({
    dest,
    script: 'revalidate-businesses',
    ranAt: ts,
    verdicts: transitionVerdicts,
    incomplete: data.incomplete,
  });

  return {
    exitCode: hasClosedConfirmed ? 1 : 0,
    report,
    updatedPois,
  };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const dest = args.find((a) => !a.startsWith('--')) ?? 'crete';
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  const jsonOutput = args.includes('--json');

  const { exitCode, report, updatedPois } = revalidateBusinesses({ dest, claudeBin });

  if (exitCode === 2) {
    process.stderr.write(`revalidate-businesses [${dest}] — ERREUR : sortie claude non conforme ou crash\n`);
    if (report.verdicts.length > 0) {
      process.stderr.write(`  ${report.verdicts[0].detail}\n`);
    }
    process.exit(2);
  }

  writePoisJson(dest, updatedPois);
  const reportPath = writeReport(report);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const problems = report.verdicts.filter((v) => v.state === 'probleme');
    const ok = report.verdicts.filter((v) => v.state === 'ok');
    const inv = report.verdicts.filter((v) => v.state === 'inverifiable');
    process.stdout.write(`revalidate-businesses [${dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
    process.stdout.write(`  OK              : ${ok.length}\n`);
    process.stdout.write(`  CLOSED-CONFIRMED: ${problems.length}\n`);
    process.stdout.write(`  INVERIFIABLE    : ${inv.length}\n`);
    if (report.incomplete) process.stdout.write(`  ⚠ RAPPORT INCOMPLET\n`);
    for (const v of problems) {
      process.stdout.write(`  [FERMÉ] ${v.id}: ${v.detail}\n`);
    }
    for (const v of inv) {
      process.stdout.write(`  [?] ${v.id}: ${v.detail}\n`);
    }
    process.stdout.write(`  Rapport : ${reportPath}\n`);
  }

  process.exit(exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    process.stderr.write(`ERREUR FATALE: ${e.message}\n`);
    process.exit(2);
  }
}
