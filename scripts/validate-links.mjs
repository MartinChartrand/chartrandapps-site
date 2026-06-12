#!/usr/bin/env node
// validate-links.mjs — FR-7 : HTTP HEAD/GET sur domaines officiels seulement.
// Allowlist bot-walled → inverifiable SANS requête.
// Usage : node scripts/validate-links.mjs [--json] [dest]
// Exit : 0 = aucun probleme | 1 = ≥1 probleme | 2 = erreur d'exécution
// JAMAIS inclus dans validate:fast (réseau requis).

import { fileURLToPath } from 'node:url';
import { verdict, makeReport, hasProblems } from './lib/report.mjs';
import { listDestinations, loadPois } from './lib/load-content.mjs';

// ---------------------------------------------------------------------------
// Bot-wall detection
// ---------------------------------------------------------------------------

/**
 * Retourne true si l'URL appartient à un domaine bot-wallé (tripadvisor, booking, google maps).
 * Ces URLs sont inverifiables — on ne fait AUCUNE requête.
 * @param {string} url
 * @returns {boolean}
 */
export function isBotWalled(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (/tripadvisor\./.test(host)) return true;
  if (host === 'booking.com' || host.endsWith('.booking.com')) return true;
  if (host === 'goo.gl') return true;
  // Google Maps : maps.google.*, *.google.*/maps — on détecte juste le host google.*
  if (/google\./.test(host)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// URL collection
// ---------------------------------------------------------------------------

/**
 * Collecte toutes les URLs officielles d'un POI avec leur id de verdict.
 * @param {Array} pois
 * @returns {Array<{id:string, url:string}>}
 */
export function collectUrls(pois) {
  const out = [];
  for (const poi of pois) {
    const links = poi.links ?? {};
    for (const clé of ['official', 'booking', 'tripadvisor', 'maps']) {
      if (links[clé]) out.push({ id: `${poi.id}.${clé}`, url: links[clé] });
    }
    for (const extra of poi.extraLinks ?? []) {
      if (extra.url) out.push({ id: `${poi.id}.extraLink.${extra.label ?? extra.url}`, url: extra.url });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP check
// ---------------------------------------------------------------------------

/**
 * Vérifie une URL par HEAD puis GET si 405/501.
 * @param {string} url
 * @param {object} opts
 * @param {number} [opts.timeoutMs=8000]
 * @param {Function} [opts.fetchImpl]
 * @returns {Promise<{state:string, detail:string}>}
 */
export async function checkUrl(url, { timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
  const tryFetch = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method,
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'chartrandapps-site/validate-links (martin.chartrand@gmail.com)' },
      });
      if (res.ok) return { state: 'ok', detail: `HTTP ${res.status}` };
      return { state: null, status: res.status }; // à interpréter par l'appelant
    } catch (e) {
      if (e.name === 'AbortError') return { state: 'probleme', detail: `timeout (${timeoutMs}ms)` };
      return { state: 'probleme', detail: `erreur réseau: ${e.message}` };
    } finally {
      clearTimeout(timer);
    }
  };

  const head = await tryFetch('HEAD');
  if (head.state === 'ok') return head;
  if (head.state === 'probleme') return head; // timeout ou réseau → stop

  // HEAD non-ok (status présent) : 405/501 → réessayer avec GET
  if (head.status === 405 || head.status === 501) {
    const get = await tryFetch('GET');
    if (get.state === 'ok') return get;
    if (get.state === 'probleme') return get;
    return { state: 'probleme', detail: `HTTP ${get.status ?? head.status}` };
  }

  return { state: 'probleme', detail: `HTTP ${head.status}` };
}

// ---------------------------------------------------------------------------
// Pure validation fn
// ---------------------------------------------------------------------------

/**
 * Valide tous les liens d'une destination.
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  opts.pois
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs]
 * @param {string} [opts.ranAt]
 * @returns {Promise<import('./lib/report.mjs').Report>}
 */
export async function validateLinks({ dest, pois = [], fetchImpl, timeoutMs = 8000, ranAt = new Date().toISOString() }) {
  const verdicts = [];
  const urls = collectUrls(pois);

  if (urls.length === 0) {
    verdicts.push(verdict(dest, 'ok', 'aucun lien'));
    return makeReport({ dest, script: 'validate-links', ranAt, verdicts });
  }

  for (const { id, url } of urls) {
    if (isBotWalled(url)) {
      verdicts.push(verdict(id, 'inverifiable', `domaine bot-wallé — aucune requête effectuée (${url})`));
      continue;
    }
    const { state, detail } = await checkUrl(url, { timeoutMs, fetchImpl });
    verdicts.push(verdict(id, state, detail));
  }

  return makeReport({ dest, script: 'validate-links', ranAt, verdicts });
}

// ---------------------------------------------------------------------------
// CLI entrypoint (réseau — jamais dans validate:fast)
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const destArg = args.find((a) => !a.startsWith('--'));

  const dests = destArg ? [destArg] : listDestinations();

  const allReports = [];
  const ranAt = new Date().toISOString();

  for (const dest of dests) {
    const pois = loadPois(dest);
    let report;
    try {
      report = await validateLinks({ dest, pois, ranAt });
    } catch (e) {
      process.stderr.write(`ERREUR [${dest}]: ${e.message}\n`);
      process.exit(2);
    }
    allReports.push(report);
  }

  // Agréger si multi-dest
  const dest = destArg ?? 'global';
  const verdicts = allReports.flatMap((r) => r.verdicts);
  const report = { dest, script: 'validate-links', ranAt, verdicts };

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
  process.stdout.write(`validate-links [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
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
