# HANDOFF — Généralisation v3 (session du 2026-06-13)

**Autoportant.** Remplace `HANDOFF-post-prototype-chania.md` (sa mission — recueillir le verdict
dogfood — est ACCOMPLIE). Contexte complémentaire : `v3-generalisation-decisions.md` (les 7 ADRs,
même dossier), `EXPLORATION.md` (§ Le carnet de bouche), mémoire Claude `vision-skill-voyage-v3.md`.

## Statut

- **VERDICT DOGFOOD = GO (2026-06-13).** Martin+Sophie : critère 1 (feel Bourdain) « on a encore
  besoin de travailler le storytelling, mais on est dans la bonne direction » — direction validée,
  **polish = chantier ouvert distinct, PAS un bloqueur** ; critère 3 (perf iPhone) « good en général ».
  Martin verrouille la spec v3. La séquence GO est ENCLENCHÉE.
- **5 commits poussés ce jour**, CI verte à chaque coup, build vert, 103/103 tests :
  `199cfa1` (fix CI Node 24), `e676c60` (décisions /persona-debate + personas.md),
  `72a2c00` (étape 1 schéma), `b08e3cb` (étape 2 KML), `d82c149` (étape 3 composants).
- **Étapes 1-3 sur 6 FAITES.** Reste 4-5-6.

## La décision : 7 ADRs verrouillés (détail dans `v3-generalisation-decisions.md`)

Débat `/persona-debate` 2 rondes, panel Sophie(épicurienne) / Marco(visiteur froid) /
Dre Léa(intégrité) / Architecte — dans `personas.md` (racine repo, réutilisable). L'essentiel :

1. **Schéma v3 additif** : champs Zod tous `.optional()`. La convergence ≥2 vit dans skill+CI,
   JAMAIS dans le Zod. **`stale` JAMAIS calculé en Zod** (`Date.now()` = build non-déterministe).
2. **Convergence ≥2 honnête seulement au critère 3 = divergence du détail concret** (2 vécus
   divergent, 2 listicles répètent le même vocab SEO) + `singleSourceTrusted` pour destinations peu couvertes.
3. **Pipeline = CANDIDATS only**, `approvedBy: human` obligatoire.
4. **Scraping transcripts YouTube TUÉ** → WebSearch + visionnage manuel ; `url` = contenu PRIMAIRE
   du créateur, jamais un agrégateur. Le kill SIMPLIFIE (sourcing fondu dans le skill).
5. **Vision-check sémantique** `visionCheckedSemantic` = script réseau hors `validate:fast`
   (patron `validate-links`), test offline sur présence du champ. Corrige le faux vert alts Chania.
6. **Composants** : `is:global` obligatoire + test de garde.
7. **Skill `/voyage-new` ENFORCE `sources[]`**, agnostique aux créateurs.

## Ce qui a été bâti cette session

- **Étape 1 — Schéma (`72a2c00`)** : `scripts/lib/schemas.mjs` — ajouts `.optional()` `story`,
  `sources:[{creator,url,date}]`, `verifiedAt`, `stale`, `singleSourceTrusted`, `approvedBy`(enum
  `human`), `region` sur POI+dish ; `type`(enum `plat|vin|bière|alcool|produit`) sur dish.
  +6 tests dans `schema.test.mjs` (additivité, rétrocompat v2 nu, enums/ISO qui mordent).
- **Étape 2 — KML (`b08e3cb`)** : route dynamique `src/pages/[dest]/[base].kml.ts` (getStaticPaths
  sur POI onMap → 1 KML/chapitre, nom tiré des collections). Génère crete/* + turquie/*. Proto
  `/proto/chania.kml` intact. +1 test T12 dans `built-html.test.mjs`.
- **Étape 3 — Composants (`d82c149`)** : `chania.astro` (~950 l.) découpé en
  `src/layouts/EpisodeLayout.astro` (shell : topbar+progression+toggle+script flyTo+CSS) +
  `src/components/episode/{ScrollyMapSection,SceneSection,CarnetSection}.astro`. `chania.astro` =
  composition éditoriale + résolution d'images seulement (~150 l. de frontmatter/chapitre).
  +2 tests de garde (`episode-css-global.test.mjs`).

## Méthode de vérification réutilisable (étape 3)

**Golden master** : HTML buildé du proto AVANT refactor → normalisé (strip `data-astro-cid`,
`<style>`, `<script>`, whitespace, commentaires) → diffé contre l'APRÈS. Résultat byte-identique
sauf l'ajout intentionnel de `data-storage-key`. Le script `/tmp/proto-golden/normalize.mjs` est
jetable mais le PATRON (golden master normalisé pour prouver un refactor zéro-régression) est à réutiliser.
**Limite assumée** : pas de smoke test navigateur live — vérif statique seulement (HTML/JS/CSS
identiques). Jeter un œil à `/proto/chania/` post-deploy pour confirmer flyTo/scroll sur iPhone.

## Pièges techniques appris cette session

- **Collection `bases` (glob loader) : `id = data.slug`**, pas le path → scoper par
  `filePath.includes('/${dest}/')`, jamais `id.startsWith`. (Le code v2 `[dest]/index.astro` le faisait déjà.)
- **CSS épisode DOIT être `is:global`** : `.beat-card`/`.beat-quote`/`.scene-map` sont rendus par
  des sous-composants ; un `<style>` scopé porterait un autre `data-astro-cid` → CSS tombe ET le
  flyTo (IntersectionObserver sur `.beat-card`) pilote des cartes non stylées. Bundlé seulement sur
  pages épisode → zéro fuite v2 (vérifié). Gardé par `episode-css-global.test.mjs`.
- **`stale` en Zod = bombe à retardement** (build qui pourrit dans le temps) — même classe que le
  Node 24 désamorcé ce jour. Toute dérivation temporelle vit dans le script de revalidation.

## Prochaine session — étapes 4-5-6 (ordre verrouillé par l'Architecte)

4. **Vision-check sémantique** (~½j) : script réseau `validate-dish-images.mjs` (Claude vision) qui
   écrit `visionCheckedSemantic` (s'invalide si sha256/alt change), test offline sur présence du
   champ pour dish/poi avec `story`. Corrige le bug alts Chania comme premier cas. **AVANT** le carnet.
5. **Skill `/voyage-new`** (2-4h) : scaffold champs v3 + passe carnet de bouche + recherche web de
   sources (le sourcing créateurs est FONDU ici, plus une étape séparée). ENFORCE `sources[]`.
6. **Pipeline carnet sur la Crète** (ADR-2 contenu) : maintenant que le filet (#4) existe.

**Dette contenu à purger au passage** : alts manifest crete décalés (faux vert) + 11 dishes/3 gems
sans liens dans Loutro/Sitia/Rethymno. **Polish storytelling Bourdain** = chantier ouvert distinct.

## Démarrage suggéré

1. Lire ce doc + `v3-generalisation-decisions.md` (les 7 ADRs) + `EXPLORATION.md` (§ carnet de bouche).
2. `cd ~/Developer/chartrandapps-site && npm test && npm run validate:fast` (103 verts attendus).
3. Attaquer l'étape 4 (vision-check). Mémoire Claude à jour : `vision-skill-voyage-v3.md`.
