// Garde-fou ADR-6 (v3-generalisation-decisions.md) : le CSS de l'épisode DOIT rester `is:global`.
// Pourquoi : EpisodeLayout rend la coquille, mais .beat-card / .beat-quote / .scene-map sont
// rendus par des SOUS-composants (ScrollyMapSection, SceneSection, CarnetSection). Un <style>
// scopé Astro porterait un data-astro-cid propre au layout → ne matcherait PAS ces éléments,
// le CSS tomberait ET l'IntersectionObserver (qui observe .beat-card) piloterait un flyTo sur
// des cartes non stylées. Même classe de bug que la leçon Leaflet v2.
// Ce test échoue si un refactor « propre » re-scope le style — exactement ce qu'on veut empêcher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LAYOUT = fileURLToPath(new URL('../../src/layouts/EpisodeLayout.astro', import.meta.url));
const src = readFileSync(LAYOUT, 'utf-8');
// Corps du composant uniquement (après le frontmatter) — sinon on matche les mentions
// de « <style> » dans les commentaires du frontmatter (faux positif).
const fmEnd = src.indexOf('\n---', src.indexOf('---') + 3);
const body = fmEnd === -1 ? src : src.slice(fmEnd + 4);

test('EpisodeLayout : le <style> de l’épisode est is:global', () => {
  const styleTags = [...body.matchAll(/<style\b([^>]*)>/g)].map((m) => m[1]);
  assert.ok(styleTags.length > 0, 'aucun <style> dans EpisodeLayout');
  for (const attrs of styleTags) {
    assert.ok(
      /\bis:global\b/.test(attrs),
      `<style${attrs}> n’est pas is:global — un style scopé casserait le CSS/flyTo des sous-composants (ADR-6)`
    );
  }
});

test('EpisodeLayout : la CSS Leaflet est importée en frontmatter (jamais @import scopé)', () => {
  // Leçon v2 reconfirmée : un @import dans <style> scopé → tuiles empilées dans un coin.
  assert.ok(src.includes("import 'leaflet/dist/leaflet.css'"), 'CSS Leaflet absente du frontmatter');
  assert.ok(!/@import\s+['"][^'"]*leaflet/.test(src), '@import Leaflet dans <style> interdit (scoping casse les tuiles)');
});
