#!/usr/bin/env node
// vision-images.mjs — ADR-5 : vision-check sémantique RÉSEAU (claude vision), test de l'ami-témoin.
// Passe CHAQUE image du manifeste au crible : le fichier dépeint-il bien ce que son `alt` (le claim)
// affirme, dans le contexte de ce qui l'affiche (POI/dish/gem) ? Écrit visionCheckedSemantic sur
// l'image dans images.json — match/mismatch/unverifiable TOUS persistés (un mismatch scellé reste
// rouge à la garde offline jusqu'à correction). Réseau → JAMAIS dans validate:fast.
//
// Usage : node scripts/vision-images.mjs [--json] [dest]   (défaut: toutes les destinations)
// Exit : 0 = aucun mismatch | 1 = ≥1 mismatch (images.json à jour) | 2 = sortie non conforme/crash (AUCUN fichier touché)
// Claude injectable via CLAUDE_BIN env var (tests) ou option claudeBin.

import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { verdict, makeReport } from './lib/report.mjs';
import { listDestinations, loadImages, loadPois, loadDishes, loadGems, DEST_ROOT } from './lib/load-content.mjs';
import { imageSlot, indexEntitiesByImageSlot } from './lib/image-context.mjs';
import { runClaude, writeReport } from './revalidate-businesses.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSET_ROOT = join(ROOT, 'src', 'assets', 'destinations');

// ---------------------------------------------------------------------------
// Contrat de sortie claude — JSON strict
// ---------------------------------------------------------------------------

const imageVerdictSchema = z.object({
  id: z.string(), // slot de l'image
  verdict: z.enum(['match', 'mismatch', 'unverifiable']),
  reason: z.string(),
});

export const visionOutputSchema = z.object({
  results: z.array(imageVerdictSchema),
  incomplete: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Collecte des cibles — toute image dont le fichier existe sur disque
// ---------------------------------------------------------------------------

/**
 * Construit la liste des images à soumettre : chaque entrée du manifeste dont le fichier est présent,
 * enrichie du contexte d'entité (ce comme quoi l'image est affichée). Fn pure ; fileExists injectable.
 * @returns {Array<{slot:string, alt:string, sha256:string, file:string, imagePath:string, shownAs:Array}>}
 */
export function collectImageTargets({ dest, images = [], pois = [], dishes = [], gems = [], fileExists = existsSync }) {
  const bySlot = indexEntitiesByImageSlot({ pois, dishes, gems });
  const targets = [];
  for (const img of images) {
    const slot = imageSlot(img);
    const imagePath = join(ASSET_ROOT, dest, img.file);
    if (!fileExists(imagePath)) continue; // fichier absent → la garde offline le verra (inverifiable)
    targets.push({
      slot,
      alt: img.alt,
      sha256: img.sha256,
      file: img.file,
      imagePath,
      shownAs: bySlot.get(slot) ?? [],
    });
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Construit le prompt vision. Claude ouvre chaque image via son chemin (outil de lecture de fichier).
 * @param {Array} targets — sortie de collectImageTargets
 * @param {string} dest
 * @returns {string}
 */
export function buildVisionPrompt(targets, dest) {
  const items = targets.map((t) => ({
    id: t.slot,
    claim_alt: t.alt,
    affiche_comme: t.shownAs.map((s) => (s.story ? `${s.label} — ${s.story}` : s.label)),
    chemin_image: t.imagePath,
  }));

  return `Tu fais le « test de l'ami-témoin » pour un site de voyage (destination "${dest}").
Quelqu'un qui connaît cette destination — qui y est allé, a ses propres photos, a mangé ces plats —
juge instantanément chaque image contre sa mémoire. Aucune image ne doit trahir son claim.

Pour chaque item : OUVRE l'image au chemin "chemin_image" (outil de lecture de fichier), puis juge si
elle dépeint PLAUSIBLEMENT ce qu'affirme "claim_alt" (et "affiche_comme" : ce comme quoi elle est présentée).

Items :
${JSON.stringify(items, null, 2)}

Verdicts :
- "match"        : l'image colle au claim (loukoumades pour un alt de loukoumades, le bon port, le bon monument)
- "mismatch"     : l'image trahit le claim (autre lieu, autre plat, alt manifestement décalé) — un témoin le verrait
- "unverifiable" : sujet trop générique/abstrait pour qu'un témoin puisse juger (texture, ciel, gros plan anonyme)

Sois STRICT sur les mismatch : c'est tout le but. Un monument nommé montrant un AUTRE monument = mismatch.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni commentaire :
{
  "results": [ { "id": "slot-image", "verdict": "match|mismatch|unverifiable", "reason": "explication courte" } ],
  "incomplete": false
}

Si tu ne peux pas tout traiter, mets incomplete:true et inclus les résultats partiels.`;
}

// ---------------------------------------------------------------------------
// Parser sortie claude
// ---------------------------------------------------------------------------

export function parseVisionOutput(raw) {
  if (!raw || raw.trim().length === 0) return { ok: false, reason: 'sortie vide' };
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, reason: 'aucun objet JSON trouvé dans la sortie' };
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    return { ok: false, reason: `JSON invalide : ${e.message}` };
  }
  const result = visionOutputSchema.safeParse(parsed);
  if (!result.success) return { ok: false, reason: `schéma non conforme : ${result.error.message}` };
  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Application des résultats — écrit visionCheckedSemantic sur chaque image évaluée
// ---------------------------------------------------------------------------

/**
 * Applique les verdicts vision au manifeste. Fn pure — ne touche pas au disque.
 * TOUS les verdicts sont scellés (un `mismatch` persisté reste rouge à la garde jusqu'à correction).
 * @param {Array} images — manifeste complet
 * @param {Array} targets — sortie de collectImageTargets (porte sha256+alt vérifiés)
 * @param {Array} results — imageVerdictSchema[]
 * @param {string} ranAt
 * @returns {{ updated: Array, changed: boolean, verdicts: Array }}
 */
export function applyVisionResults(images, targets, results, ranAt) {
  const today = ranAt.slice(0, 10);
  const resultBySlot = new Map(results.map((r) => [r.id, r]));
  const targetBySlot = new Map(targets.map((t) => [t.slot, t]));
  const verdicts = [];
  let changed = false;

  const updated = images.map((img) => {
    const slot = imageSlot(img);
    const target = targetBySlot.get(slot);
    if (!target) return img; // pas une cible (fichier absent) → inchangé

    const res = resultBySlot.get(slot);
    if (!res) {
      verdicts.push(verdict(slot, 'inverifiable', 'non évalué par claude (absent des résultats)'));
      return img;
    }

    const state = res.verdict === 'match' ? 'ok' : res.verdict === 'mismatch' ? 'probleme' : 'inverifiable';
    verdicts.push(verdict(slot, state, res.reason || res.verdict));
    changed = true;
    return {
      ...img,
      visionCheckedSemantic: { sha256: target.sha256, alt: target.alt, verdict: res.verdict, checkedAt: today },
    };
  });

  return { updated, changed, verdicts };
}

// ---------------------------------------------------------------------------
// I/O write-back
// ---------------------------------------------------------------------------

export function writeImages(dest, images) {
  const path = join(DEST_ROOT, dest, 'images.json');
  writeFileSync(path, JSON.stringify(images, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Core — orchestrateur testable (claude injecté)
// ---------------------------------------------------------------------------

/**
 * Lance le vision-check d'une destination. Logique pure ; l'écriture disque est déléguée au caller.
 * @returns {{ exitCode:number, report:object, updated:Array|null, changed:boolean }}
 */
export function visionImages({ dest, images, pois, dishes, gems, claudeBin = 'claude', timeoutMs = 300_000, batchSize = 0, ranAt, fileExists }) {
  const ts = ranAt ?? new Date().toISOString();
  const imgs = images ?? loadImages(dest);
  const targets = collectImageTargets({
    dest,
    images: imgs,
    pois: pois ?? loadPois(dest),
    dishes: dishes ?? loadDishes(dest),
    gems: gems ?? loadGems(dest),
    fileExists,
  });

  if (targets.length === 0) {
    const report = makeReport({ dest, script: 'vision-images', ranAt: ts, verdicts: [verdict(dest, 'ok', 'aucune image à vérifier')] });
    return { exitCode: 0, report, updated: imgs, changed: false };
  }

  // Lots (VISION_BATCH) : un gros manifeste dépasse le timeout d'un seul appel claude.
  // Tous les lots doivent réussir — sinon rien n'est écrit (même contrat qu'avant).
  const chunks = [];
  const size = batchSize > 0 ? batchSize : targets.length;
  for (let i = 0; i < targets.length; i += size) chunks.push(targets.slice(i, i + size));

  const allResults = [];
  let anyIncomplete = false;
  for (const chunk of chunks) {
    const prompt = buildVisionPrompt(chunk, dest);
    const { stdout, status, timedOut } = runClaude(prompt, { bin: claudeBin, timeoutMs });

    if (status !== 0 || timedOut) {
      const report = makeReport({ dest, script: 'vision-images', ranAt: ts, verdicts: [], incomplete: true });
      return { exitCode: 2, report, updated: null, changed: false };
    }

    const parsed = parseVisionOutput(stdout);
    if (!parsed.ok) {
      const report = makeReport({
        dest,
        script: 'vision-images',
        ranAt: ts,
        verdicts: [verdict(dest, 'inverifiable', `sortie claude non conforme : ${parsed.reason}`)],
        incomplete: true,
      });
      return { exitCode: 2, report, updated: null, changed: false };
    }
    allResults.push(...parsed.data.results);
    if (parsed.data.incomplete) anyIncomplete = true;
  }
  const parsed = { data: { results: allResults, incomplete: anyIncomplete } };

  const { updated, changed, verdicts } = applyVisionResults(imgs, targets, parsed.data.results, ts);
  const hasMismatch = verdicts.some((v) => v.state === 'probleme');
  const report = makeReport({ dest, script: 'vision-images', ranAt: ts, verdicts, incomplete: parsed.data.incomplete });
  return { exitCode: hasMismatch ? 1 : 0, report, updated, changed };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const destArg = args.find((a) => !a.startsWith('--'));
  const claudeBin = process.env.CLAUDE_BIN ?? 'claude';
  // VISION_TIMEOUT_MS / VISION_BATCH : overrides env pour les gros manifestes (défauts inchangés).
  const timeoutMs = Number(process.env.VISION_TIMEOUT_MS ?? 300_000);
  const batchSize = Number(process.env.VISION_BATCH ?? 0);
  const dests = destArg ? [destArg] : listDestinations();

  let anyMismatch = false;
  const ranAt = new Date().toISOString();

  for (const dest of dests) {
    const { exitCode, report, updated, changed } = visionImages({ dest, claudeBin, timeoutMs, batchSize, ranAt });

    if (exitCode === 2) {
      process.stderr.write(`vision-images [${dest}] — ERREUR : sortie claude non conforme ou crash (aucun fichier touché)\n`);
      if (report.verdicts.length > 0) process.stderr.write(`  ${report.verdicts[0].detail}\n`);
      process.exit(2);
    }

    if (changed) writeImages(dest, updated);
    const reportPath = writeReport(report);
    if (exitCode === 1) anyMismatch = true;

    if (jsonOutput) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else {
      printReport(report, reportPath);
    }
  }

  process.exit(anyMismatch ? 1 : 0);
}

function printReport(report, reportPath) {
  const problems = report.verdicts.filter((v) => v.state === 'probleme');
  const ok = report.verdicts.filter((v) => v.state === 'ok');
  const inv = report.verdicts.filter((v) => v.state === 'inverifiable');
  process.stdout.write(`vision-images [${report.dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
  process.stdout.write(`  MATCH        : ${ok.length}\n`);
  process.stdout.write(`  MISMATCH     : ${problems.length}\n`);
  process.stdout.write(`  INVERIFIABLE : ${inv.length}\n`);
  if (report.incomplete) process.stdout.write(`  ⚠ RAPPORT INCOMPLET\n`);
  for (const v of problems) process.stdout.write(`  [MISMATCH] ${v.id}: ${v.detail}\n`);
  process.stdout.write(`  Rapport : ${reportPath}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    process.stderr.write(`ERREUR FATALE: ${e.message}\n`);
    process.exit(2);
  }
}
