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
- **Étapes 1-5 sur 6 FAITES.** Reste 6 (+ 2 bouts de RENDU reportés, voir bas).
- **CADRAGE (confirmé 2026-06-13)** : le but n'est PAS de réparer crete/turquie — c'est de bâtir le
  **framework répétable** qui crache des sites Bourdain-esques *véridiques by construction* pour
  n'importe quelle destination. Crete/turquie = cobayes qui prouvent que le filet mord. La dette
  d'alts décalés du legacy est RÉELLE (cf. test ci-dessous) mais c'est un chantier éditorial distinct,
  PAS le focus. Le filet (#4) doit être câblé DANS `/voyage-new` (#5) — toute nouvelle destination
  naît en passant le test de l'ami-témoin, pas un check optionnel qu'on oublie. North star : [[reference-storytelling-bourdain]].

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
- **Étape 5 — Provenance + skill /voyage-new v3 (`d019cf9` pour le code)** : périmètre tranché par
  Martin = « les dents + le processus » (épisode scrollytelling + sources-en-UI reportés à #6).
  **5A (code, committé)** : `scripts/validate-provenance.mjs` — garde OFFLINE build-ROUGE, jumelle de
  validate-image-claims. Tout poi/dish/gem avec `story` → ≥2 sources de créateurs DISTINCTS (ou
  `singleSourceTrusted`) + `approvedBy:human` + récit ≥60 car. Le vrai test d'indépendance (3 conditions
  ADR-2) reste le jugement du skill, pas le code. +10 tests (136 total), no-op vert aujourd'hui (zéro
  story), câblé dans validate:fast. **5B (skill doc, HORS repo `~/.claude/skills/voyage-new/SKILL.md`,
  v2→v3)** : Phase 1b carnet de bouche (must-eat/drink par région + graphe de créateurs DÉCOUVERT par
  destination, jamais hardcodé) + convergence/indépendance + gate de publication (refuse reco sans
  sources, approvedBy:human explicite) ; câblage `vision:images` dans le workflow images (remplace
  l'ancien vision-check manuel = le faux-vert) ; champs v3 dans les exemples ; anti-patterns v3.
- **Étape 4 — Vision-check sémantique au niveau IMAGE (test de l'ami-témoin)** : PIVOT clé suite à
  précision Martin — le filet ne vit PAS sur l'entité-avec-récit (`story`) mais sur l'IMAGE. L'`alt`
  d'une image EST son claim ("Vieux port de Chania") ; le fichier doit le montrer, sinon n'importe qui
  qui connaît la place (Sophie pour la Grèce) le voit. Barème codifié : mémoire `bareme-temoin-images.md`.
  Livré : sceau `visionCheckedSemantic{sha256,alt,verdict,checkedAt}` sur `imageSchema` ;
  `scripts/lib/image-context.mjs` (contexte d'entité + fraîcheur du sceau, pure) ;
  `scripts/validate-image-claims.mjs` (garde OFFLINE, dans `validate:fast` — sceau frais sinon rouge ;
  jamais scellée = inverifiable/jaune ; cran `--strict` pour rendre l'absence rouge par dest nettoyée) ;
  `scripts/vision-images.mjs` (écrivain RÉSEAU `npm run vision:images`, patron revalidate-businesses —
  passe TOUTES les images au crible claude vision, scelle match/mismatch/unverifiable, mismatch reste rouge).
  +24 tests (3 fichiers). **Test réseau réel concluant** (5 images crete, ~30s) : 1 match + 4 mismatch —
  claude distingue Balos de Falassarna, attrape "coucher de soleil vs midi", pogne les alts décalés
  (le bug Chania, invisible au check sha-only). 169 images legacy = "à sceller" (jaune honnête, validate:fast
  reste vert). Noms changés vs plan initial : `validate-dish-images`→`vision-images` (c'est les images,
  pas juste la bouffe), pas de `validate-stories` (le niveau entité était la mauvaise abstraction).
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

## Prochaine session — étape 6 + RENDU reporté (#1-5 FAITES)

6. **Pipeline carnet sur la Crète** (ADR-2 contenu) : maintenant que LES DEUX filets existent
   (#4 vision + #5 provenance). Première vraie passe de contenu v3 — c'est ici que les gardes mordent
   pour de bon. Suivre la Phase 1b du skill `/voyage-new` v3.
- **RENDU reporté (code de composants, HORS skill par ADR-7)** — dû mais sorti du périmètre étape 5 :
  (a) génération/édition du scrollytelling d'épisode (frontmatter scenes/mapBeats/montageBeats — gabarit
  `EpisodeLayout.astro` + `components/episode/*` existe) ; (b) affichage des `sources[]` + badge
  `singleSourceTrusted` + avertissement `stale` dans l'UI épisode (« sources visibles » de Marco/ADR-5).

**Dette legacy (PAS le focus — framework d'abord)** : alts manifest crete décalés (le test #4 du
2026-06-13 en a confirmé ≥4 sur 5 images échantillon) + 11 dishes/3 gems sans liens dans
Loutro/Sitia/Rethymno. Chantier éditorial distinct : rouler `vision:images crete` sort la liste, puis
remplacer l'image ou réécrire l'alt par mismatch. **Polish storytelling Bourdain** = chantier ouvert distinct.

## Démarrage suggéré

1. Lire ce doc + `v3-generalisation-decisions.md` (les 7 ADRs) + `EXPLORATION.md` (§ carnet de bouche)
   + mémoire `bareme-temoin-images.md` (le filet #4 vit au niveau image).
2. `cd ~/Developer/chartrandapps-site && npm test && npm run validate:fast` (136 verts attendus, fast vert).
3. Attaquer l'étape 6 (pipeline carnet sur la Crète) via le skill `/voyage-new` v3 (Phase 1b). Les deux
   filets (#4 vision, #5 provenance) mordront sur ce premier vrai contenu v3 — c'est le test grandeur
   nature du framework. Mémoires : `vision-skill-voyage-v3.md`, `bareme-temoin-images.md`.
