#!/usr/bin/env node
// Gate « machine à saucisse » — forcing function de fin de morceau.
// Roule le PLANCHER (test + validate:fast), puis sort l'auto-audit d'honnêteté.
// Ne déclare JAMAIS « fini » : le plafond (pixel + feel Bourdain) = verdict de Martin.
// Contrat : docs/CONTRAT-MACHINE-A-SAUCISSE.md
import { execSync } from 'node:child_process';

const rule = (c = '─') => console.log(c.repeat(64));
const banner = (t) => { rule('━'); console.log(t); rule('━'); };

function step(label, cmd) {
  console.log(`\n▶ ${label}  (${cmd})`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return { label, ok: true };
  } catch {
    return { label, ok: false };
  }
}

banner('MACHINE À SAUCISSE — plancher');
// Le plancher = les checks machine. Vert ici = on a le DROIT de regarder le plafond, pas que c'est fini.
const floor = [
  step('Tests', 'npm test'),
  step('validate:fast (build + validateurs)', 'npm run validate:fast'),
];

const failed = floor.filter((s) => !s.ok);
console.log('');
banner(failed.length ? '✗ PLANCHER PERCÉ' : '✓ PLANCHER VERT');
for (const s of floor) console.log(`  ${s.ok ? '✓' : '✗'} ${s.label}`);

if (failed.length) {
  console.log('\nLe plancher est percé. On répare AVANT de parler de plafond.');
  console.log('Pas de contournement silencieux, pas de placeholder pour faire passer la CI.');
  process.exit(1);
}

// Plancher vert → l'auto-audit. La machine peut pas juger ça : c'est à sortir à voix haute.
banner('AUTO-AUDIT — à répondre à Martin, honnêtement (surtout si c\'est gênant)');
const questions = [
  'Murs        — frappé quoi ? contourné comment ? spawné quoi ? abandonné quoi ?',
  'Placeholders — qu\'est-ce qui reste faux/temporaire (dates, slots, blurbs) ?',
  'Sources     — quel claim n\'a pas encore de source vérifiable ?',
  'Pixel       — chaque image passe le test du témoin ? alt = vrais pixels ?',
  'Vert-creux  — qu\'est-ce qui passe la machine mais pas la barre humaine ?',
  'Ce que je cache — qu\'est-ce que je serais tenté de ne PAS mentionner ?',
];
questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

console.log('');
rule('═');
console.log('VERT ≠ FINI. Le plancher est vert. Le PLAFOND (pixel + feel) = verdict de Martin.');
rule('═');
