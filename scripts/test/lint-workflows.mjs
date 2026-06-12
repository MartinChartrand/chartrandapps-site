#!/usr/bin/env node
// lint-workflows.mjs — FR-14/FR-15 : anti-rot des GitHub Actions.
// Garde le repo réactivable après 8+ mois de dormance : versions épinglées partout,
// aucun runner `-latest`, heartbeat mensuel + permissions correctes, chemin Astro→Pages officiel.
// Parsing texte volontaire : zéro dépendance (deps figées à astro/leaflet/zod — ARCHITECTURE §2).
//
// Usage : node scripts/test/lint-workflows.mjs [--json]
// Exit  : 0 = propre | 1 = au moins un problème (BLOQUANT) | 2 = erreur d'exécution

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKFLOWS_DIR = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))), // scripts/test/<file> → racine repo
  '.github',
  'workflows'
);

// Une ref est épinglée si elle cible @vN[.N[.N]] OU un SHA complet (40 hex). Refus de @main/@master/@latest/@HEAD.
const PINNED_REF = /^(v\d+(\.\d+){0,2}|\d+\.\d+\.\d+|[0-9a-f]{40})$/;

// ---------------------------------------------------------------------------
// Détection pure (testable, sans fs)
// ---------------------------------------------------------------------------

/** Extrait la cible de chaque ligne `uses:` (commentaires inline retirés). */
function extractUses(content) {
  const out = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*-?\s*uses:\s*(\S+)/);
    if (m) out.push({ line: i + 1, ref: m[1].replace(/#.*$/, '') });
  }
  return out;
}

/** Vrai si au moins un cron du fichier est mensuel (jour-du-mois fixe, mois `*`, dow `*`). */
function hasMonthlyCron(content) {
  const crons = [...content.matchAll(/cron:\s*['"]?([^'"\n#]+)/g)].map((m) => m[1].trim());
  return crons.some((expr) => {
    const f = expr.split(/\s+/);
    if (f.length !== 5) return false;
    const [, , dom, month, dow] = f;
    return dom !== '*' && month === '*' && dow === '*';
  });
}

/** Vrai si le bloc permissions accorde contents: write. */
function grantsContentsWrite(content) {
  return /contents:\s*write/.test(content);
}

/**
 * Lint d'un ensemble de workflows.
 * @param {Array<{name: string, content: string}>} workflows
 * @returns {{ problems: string[] }}
 */
export function lintWorkflows(workflows) {
  const problems = [];

  for (const { name, content } of workflows) {
    // R1 — toutes les actions épinglées
    for (const { line, ref } of extractUses(content)) {
      const at = ref.lastIndexOf('@');
      const version = at >= 0 ? ref.slice(at + 1) : null;
      if (version === null || !PINNED_REF.test(version)) {
        problems.push(`${name}:${line} action non épinglée : "${ref}" (exiger @vN ou @<sha40>)`);
      }
    }

    // R2 — aucun runner -latest
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('-latest')) {
        problems.push(`${name}:${i + 1} runner flottant interdit : "${l.trim()}" (épingler ex. ubuntu-24.04)`);
      }
    });
  }

  // R3+R4 — heartbeat
  const heartbeat = workflows.find((w) => w.name === 'heartbeat.yml');
  if (!heartbeat) {
    problems.push('heartbeat.yml manquant (pacemaker mensuel requis — ARCHITECTURE §7)');
  } else {
    if (!hasMonthlyCron(heartbeat.content)) {
      problems.push('heartbeat.yml : cron mensuel absent (champ jour-du-mois fixe, mois/dow = *)');
    }
    if (!grantsContentsWrite(heartbeat.content)) {
      problems.push('heartbeat.yml : permissions contents: write absent (commit du heartbeat impossible)');
    }
  }

  // R5 — deploy : chemin officiel Astro→Pages
  const deploy = workflows.find((w) => w.name === 'deploy.yml');
  if (!deploy) {
    problems.push('deploy.yml manquant (chemin Astro→Pages requis — ARCHITECTURE §7)');
  } else {
    if (!deploy.content.includes('withastro/action@v6')) {
      problems.push('deploy.yml : withastro/action@v6 absent (ARCHITECTURE §7)');
    }
    if (!deploy.content.includes('actions/deploy-pages@v5')) {
      problems.push('deploy.yml : actions/deploy-pages@v5 absent (ARCHITECTURE §7)');
    }
  }

  return { problems };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function loadWorkflows(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((name) => ({ name, content: readFileSync(join(dir, name), 'utf8') }));
}

function main() {
  const jsonOutput = process.argv.includes('--json');

  if (!existsSync(WORKFLOWS_DIR)) {
    process.stderr.write(`ERREUR : ${WORKFLOWS_DIR} introuvable\n`);
    process.exit(2);
  }

  let workflows;
  try {
    workflows = loadWorkflows(WORKFLOWS_DIR);
  } catch (e) {
    process.stderr.write(`ERREUR : lecture des workflows — ${e.message}\n`);
    process.exit(2);
  }

  const { problems } = lintWorkflows(workflows);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify({ problems, ok: problems.length === 0 }, null, 2) + '\n');
  } else {
    process.stdout.write(`lint-workflows — ${workflows.length} fichier(s) analysé(s)\n`);
    if (problems.length === 0) {
      process.stdout.write('  OK — versions épinglées, heartbeat mensuel, chemin Astro→Pages conforme\n');
    } else {
      for (const p of problems) process.stdout.write(`  [✗] ${p}\n`);
    }
  }

  process.exit(problems.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
