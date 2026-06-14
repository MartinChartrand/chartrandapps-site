# HANDOFF — Séville fini à fond + machine à saucisse prouvée (session 2026-06-13/14)

> **MISE À JOUR (session 2026-06-14, suite) — lire la mémoire `andalousie-dogfood-seville` pour le détail à jour.**
> Depuis ce handoff : **ADR-5 (container survol) SHIPPÉ** (`de24dff`) ; **chapitre 2 Ronda bâti FROM-SCRATCH par la machine** (`91b2af9`+`613ee81` — recherche fan-out → data → 10 images CC scellées → fiche → tuile live, la machine SCALE) ; **`ImageCredit` câblé → deploy DÉBLOQUÉ** (`d13e1ea`, composant `ImageCredits.astro`, attribution TASL sur épisode+container+Séville). **Chapitre 3 Granada = recherche EN COURS.** Garde-fous hard-codés ajoutés (hooks `~/.claude/` : modèle sonnet obligatoire en fan-out + rappel Loi 1). Toujours sur `feat/andalousie-seville-dogfood`, **PAS mergé/déployé** (merge/deploy = outward-facing, demander Martin). Les sections ci-dessous restent valides comme fondation/contrat.

**Autoportant. BÉTON.** Remplace `HANDOFF-v3-container-episodes.md` (dépassé). LE document de reprise.
**À lire EN PREMIER à froid : `docs/CONTRAT-MACHINE-A-SAUCISSE.md`** (le contrat d'opération — 4 lois + gate).
Spec archi verrouillée : `modele-voyage-container-decisions.md` (7 ADRs). Storyboard : `storyboard-bourdain-andalousie.md`.
Mémoires Claude clés : `contrat-machine-a-saucisse`, `editorial-genere-par-la-machine`, `createurs-sources-fiables`,
`modele-voyage-container-episodes`, `andalousie-dogfood-seville`, `definition-produit-guide-et-outil`,
`v3-north-star-episode-images`, `bareme-temoin-images`, `principe-debloquer-avant-consulter`, `principe-cloner-pas-reinventer`.

## Statut (vérifié par agents, pas de mémoire)
- Branche **`feat/andalousie-seville-dogfood`**, working tree **PROPRE**. **PAS mergée, PAS déployée.**
  crete + turquie restent en PROD sur le rendu v2 — **on n'a rien cassé** (route épisode = parallèle, additive).
- **139 tests verts, `npm run validate:fast` exit 0.** 8 commits cette session (`2d411c1` → `e9f4a45`).
- **La machine à saucisse a tourné end-to-end sur un chapitre complet (Séville).** C'est le dogfood prouvé.

## Ce qui a été fait cette session (8 commits)
1. **ADR-7 (`2d411c1`)** — DRY : helpers épisode extraits dans `src/lib/episode.ts` (factory `createEpisode(dest, base, opts)`
   → 16 helpers : resolveSlot, poi, poiPills, poiThumb, toBeat, carnetRow, byKind, mapMarkers, allCoords, kmlCount…).
   Golden-master : protos byte-identiques avant/après.
2. **Contrat + gate (`038183c`)** — `docs/CONTRAT-MACHINE-A-SAUCISSE.md` (4 lois) + `npm run audit` (plancher
   test+validate:fast + auto-audit d'honnêteté). **Rouler `npm run audit` à la fin de chaque morceau, SORTIR les réponses.**
3. **ADR-2 (`4423116`)** — route généralisée `src/pages/[dest]/[base]/index.astro` (getStaticPaths sur la
   collection `episodes`) + modèle de fiche. Flag `episodic` + `chapterTotal` sur destinationSchema. Golden-master :
   `/andalousie/seville/` ≡ `/proto/seville/` (delta = blanc seulement).
4. **Fix iOS (`18eee99`)** — carte scrolly blanche sur iPhone = **race condition** (chania la gagnait, seville plus
   lourde la perdait). Recalage `invalidateSize`+refit (rAF/200/600 ms, gardé par `userMoved`). Vérifié au **simulateur Xcode**.
5. **Sourçage épisode (`8c95cf1`)** + **carnet (`0994105`)** + **mirror (`e9f4a45`)** — 2 runs machine (34 agents
   Sonnet, recherche + vérif adversariale). ~18 corrections factuelles, ~90 sources vérifiées attachées.
6. **La Azotea repointée (`622b85b`)** — décision Martin : Conde de Barajas 13 (coords géocodées Photon).

## Le modèle « épisode » (ADR-2 — comment ça marche)
- **Fiche** = `src/content/destinations/<dest>/episodes/<base>.json` (collection `episodes`, glob `*/episodes/*.json`).
  Clés : `coldOpen[]`, `scenes[]`, `montage[]` (beats/scènes avec `sources[]`), `carnet{groups,dishesTitle}`, `outro`, `carnetThumbs?`.
  La fiche **référence par `poiRef`/slot** — JAMAIS d'URL/coordonnée dupliquée. La route résout coords/pills/images.
- **C'est l'OUTPUT de la machine** (`editorial-genere-par-la-machine`) : remplie par la RECHERCHE, pas à la main.
- Schéma : `scripts/lib/schemas.mjs` → `episodeSchema` (export nommé) + `episodic`/`chapterTotal` sur destinationSchema.
- `andalousie/destination.json` : `episodic: true`, `chapterTotal: 5`. La route ne génère QUE les bases ayant une fiche.

## Séville — état (vérifié)
- **Épisode rendu** `/andalousie/seville/` (carte iOS OK, vérifiée simulateur iPhone 17 Pro Max).
- **Sourcé** : pois **18/19**, dishes **19/21**, images **25/25 scellées** (23 match, 2 inverifiables honnêtes).
- Trous HONNÊTES (jaunes, pas des inventions) : `triana-pureza-apt` (Booking+agrégateur bloquent le scraping),
  `sev-carrillada` (toutes ses URLs mortes — claim solide, invérifiable), `sev-espinacas-garbanzos` (sourcé via
  El Rinconcillo dans l'épisode, pas dupliqué sur le dish).

## Décisions verrouillées cette session
- **L'éditorial est généré par la machine** depuis la recherche sourcée (Claude écrit, dans la voix de Martin, esprit
  Bourdain), double-filtre Bourdain + persona Martin/Sophie. Les créateurs (Wiens/Sonny/Leila) = **barème d'honnêteté,
  pas whitelist** — débusquer les voix fiables par lieu/catégorie (`createurs-sources-fiables`).
- **La Azotea** = Conde de Barajas 13 (le Gran Poder est Marabunda depuis 2022).
- **Dates voyage** = tentatives/placeholders OK pour l'instant ; Martin les fixe à la **réservation cet automne**.

## Ce qui reste (dette + prochains pas)
- **ADR-5 — le container** : `/andalousie/` rend encore le **long-scroll v2**. À transformer en page-survol (hook
  narratif + grille factuelle + tuiles-épisodes), gated par `episodic` dans `[dest]/index.astro` (crete/turquie restent v2).
- **ADR-3/4 — `perBase?`** additif budget/pratique (seulement si la donnée diffère vraiment).
- **Chapitre 2 (Ronda)** : prouver que la machine scale from-scratch (recherche POIs → fiche → rendu). Ronda n'a aucun POI.
- **Dette** : attribution UI (`ImageCredit`) PAS câblée dans `components/episode/*` (images CC-BY de l'épisode sans crédit —
  à régler avant deploy). Les **2 protos** (`proto/chania`, `proto/seville`) coexistent avec la route — à supprimer une fois
  la route éprouvée. WARN Astro non bloquant au build (« Cannot read properties of undefined (reading 'def') » sur le JSON
  Schema des collections — build complète quand même).

## Démarrage suggéré (à froid, demain)
1. Lire **`docs/CONTRAT-MACHINE-A-SAUCISSE.md`** + ce doc + mémoire `editorial-genere-par-la-machine`.
2. `cd ~/Developer/chartrandapps-site && git checkout feat/andalousie-seville-dogfood && npm run audit` (plancher vert attendu).
3. `npm run preview -- --host` → regarder `/andalousie/seville/` (épisode fini) vs `/andalousie/` (container v2 à remplacer).
   Vérif iOS : booter le simulateur (`xcrun simctl boot "iPhone 17 Pro Max"` + `openurl` + `io … screenshot`).
4. Trancher le prochain morceau : **ADR-5 (container)** ou **chapitre 2 (Ronda)**. Pour toute recherche : **Workflow
   d'agents Sonnet** (recherche → vérif adversariale), jamais Opus pour le fan-out. Rouler `npm run audit` à la fin.
