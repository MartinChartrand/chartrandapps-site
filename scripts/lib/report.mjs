// Contrat de rapport typé des validateurs — PRD :89, ARCHITECTURE §6.
// Forme partagée réutilisée par les validateurs des tickets 50-70 (validate-geo, validate-links,
// validate-images, revalidate-businesses). Verdicts à TROIS états : seul `probleme` est rouge
// (faux-rouge et faux-vert ont une valeur négative — ARCHITECTURE :17).
import { z } from 'zod';

export const VERDICT_STATES = ['ok', 'probleme', 'inverifiable'];

export const verdictSchema = z.object({
  id: z.string(),
  state: z.enum(['ok', 'probleme', 'inverifiable']),
  detail: z.string(),
});

export const reportSchema = z.object({
  dest: z.string(),
  script: z.string(),
  ranAt: z.string(),
  verdicts: z.array(verdictSchema),
  incomplete: z.boolean().optional(),
});

/** Construit un verdict validé. */
export function verdict(id, state, detail = '') {
  return verdictSchema.parse({ id, state, detail });
}

/** Construit un rapport validé. `incomplete` omis si falsy (jamais de dégradation silencieuse). */
export function makeReport({ dest, script, ranAt, verdicts = [], incomplete = false }) {
  const report = { dest, script, ranAt, verdicts };
  if (incomplete) report.incomplete = true;
  return reportSchema.parse(report);
}

/** Vrai si au moins un verdict est `probleme` (le seul état rouge / bloquant). */
export function hasProblems(report) {
  return report.verdicts.some((v) => v.state === 'probleme');
}
