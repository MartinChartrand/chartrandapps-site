# HANDOFF — Modèle Voyage-Container + Épisodes (session 2026-06-13, fin)

**Autoportant. BÉTON.** Remplace `HANDOFF-v3-chemin-B.md` (dépassé). LE document de reprise.
Spec d'architecture VERROUILLÉE : `modele-voyage-container-decisions.md` (7 ADRs, même dossier).
Autres : `storyboard-bourdain-andalousie.md`, `v3-generalisation-decisions.md`.
Mémoires Claude clés : `modele-voyage-container-episodes`, `definition-produit-guide-et-outil`,
`v3-north-star-episode-images`, `principe-cloner-pas-reinventer`, `principe-debloquer-avant-consulter`,
`andalousie-dogfood-seville`, `bareme-temoin-images`, `pinchtab-recovery`.

## Statut

- **Branche `feat/andalousie-seville-dogfood`** poussée sur origin (~12 commits). **PAS mergée sur main,
  PAS déployée.** crete + turquie restent en PROD sur le rendu v2. **139 tests verts, validate:fast exit 0.**
- **Architecture v3 VERROUILLÉE cette session** (via /persona-debate, validée 100 % par Martin) :
  **Voyage = page-CONTAINER (`/dest/`) + un ÉPISODE scrollytelling par étape (`/dest/base/`).** On tue le
  long-scroll v2 ET l'idée d'un méga-épisode. 7 ADRs → `modele-voyage-container-decisions.md`. C'EST LE PLAN.
- Le chapitre **Séville** est le dogfood complet : véridique, illustré (19/19 POIs), budgété, rendu en
  proto épisode. C'est le gabarit à généraliser.

## Ce qui a été bâti/décidé cette session (énorme)

1. **Chapitre Séville véridique** (`src/content/destinations/andalousie/`) : 3 récits Bourdain sourcés-
   vérifiés (El Rinconcillo, Eiriz, Cinco Jotas — voir `andalousie-dogfood-seville`), 21 dishes, 20 POIs.
2. **19/19 POIs illustrés** (était 3) — 25 images vision-scellées. Unsplash (atmosphère) + Wikimedia
   (documentaire, via **agent de recherche** quand je me suis enfargé). Le filet a mordu ~6× (serrano≠
   bellota, Alcázar éventail/patios→jardins, Mercado générique, Gruta light-painting, Alameda sans
   colonnes, golondrinas sans azulejos) → re-sourcés. 2 inverifiables honnêtes (Calle Pureza, Gruta).
3. **Attribution UI** (`src/components/ImageCredit.astro`) câblée dans FoodieBlock/GemBlock/AccomGrid/
   Hero/ChapterCover. **PAS dans `components/episode/*`** (= DETTE, à câbler avant deploy : images CC-BY
   de l'épisode sans crédit). Tests T13/T14. T15 garde l'enregistrement des thèmes.
4. **Budget + pratique** (`budget.json` ~15 100 $ CAD plein-voyage + `pratique.json`) — le pilier outil-
   de-départ. Rend sur la page v2. Clone exact de crete.
5. **Proto épisode Séville** (`src/pages/proto/seville.astro`) = clone fidèle de `proto/chania.astro`.
   Cold open recomposé pour BALAYER (Triana→centre→gros vol Jabugo, lu le code EpisodeLayout :
   IntersectionObserver→data-fly/data-bounds→flyTo/flyToBounds).
6. **Storyboard Bourdain** (`storyboard-bourdain-andalousie.md`) + recherche dramaturgie sourcée.
7. **Modèle d'architecture verrouillé** (7 ADRs).

## LE PLAN — ordre d'exécution (dicté par les ADRs)

> Réf complète : `modele-voyage-container-decisions.md`. Mémoire : `modele-voyage-container-episodes`.

1. **ADR-7 — DRY les helpers épisode (PRÉREQUIS).** `chania.astro` + `seville.astro` dupliquent
   intégralement `resolveSlot`/`poiPills`/`poiThumb`/`rank`/`toBeat`/`byKind`/la construction carnet
   (~450 l. ×2). Extraire dans un module partagé (`scripts/lib/episode-helpers.ts` ou un composant)
   AVANT de généraliser. Non-négo Architecte (sinon chaque fix ×N).
2. **ADR-2 — Flag `episodic` + route `/dest/[base]/`.** Ajouter `episodic: true` à `destination.json`
   (additif au schéma). Créer `src/pages/[dest]/[base]/index.astro` = l'épisode généralisé (getStaticPaths
   sur la collection `bases`, dest-scopée ; le KML par base existe déjà). **JAMAIS muter `[dest]/index.astro`
   globalement** — crete/turquie en prod. Garder v2 intact, activer le nouveau rendu par le flag.
3. **ADR-5 — Le container `/dest/`.** = v2-trimmé : Hero + Timeline + Budget + Pratique. PAS une listicle
   (Léa). C'est : (1) HOOK narratif (la tension du voyage, voix de Martin, façon Bourdain saison-opener),
   (2) grille factuelle condensée (dates/nuits/aéroports/fourchette $), (3) TUILES d'épisodes = le vrai
   hook de chaque épisode (photo qui donne faim + titre). Highlights = les tuiles sourcées, à la main.
4. **ADR-3/4 — `perBase?` additif** au `budgetSchema`/`pratiqueSchema` (budget détail au CARNET de
   l'épisode, PAS dans les beats ; logistique splitée par scope : voyage→container, base→carnet).
   Seulement si la donnée diffère vraiment.

## Pièges appris (pour pas recommencer)

- **Tout thème `styles/themes/*.css` DOIT être @import-é dans `Destination.astro`** sinon `[data-theme]`
  sans variables → scrims transparents (« boiteux »). Gardé par test T15.
- **`fetch-images.mjs` n'a pas de User-Agent** → Wikimedia bloque 403/429. Télécharger en curl avec UA
  descriptif puis écrire sha256/file à la main. Clé Unsplash : la vraie est dans le PDF App-Factory
  (App ID 902055) — celle de ~/.zshrc a un `0` au lieu d'un `O`.
- **Le filet vision mord sur l'imprécision** (claims:place interdit hors perso ; alt = claim honnête).
  Re-sourcer, pas inventer. Inverifiable = jaune OK (bâtiment/rue non ID-able).
- **Cloner la référence, changer SEULEMENT l'info** (`principe-cloner-pas-reinventer`). Mes 2 bugs
  (thème, carnet simplifié) venaient d'avoir improvisé au lieu de cloner chania exact.
- **Budget détail = au carnet, jamais dans le narratif** (Sophie : « tu tues la scène »).

## Dette / reste

- Attribution UI sur `components/episode/*` (gap) + PhotoGrid. Dates voyage Andalousie = placeholders
  (24 mai→20 juin, ancrer San Antonio Frigiliana ~13-14 juin). Helpers épisode dupliqués (ADR-7).
- Le proto sourcing friction jamón/Inquisition à sourcer avant [dest]. Les 4 autres bases (Ronda,
  Granada, Axarquía) restent à bâtir une fois le rendu container+épisode prouvé.

## Démarrage suggéré (prochaine session)

0. **Lire `docs/CONTRAT-MACHINE-A-SAUCISSE.md` EN PREMIER** (le contrat d'opération : 4 lois, gate `npm run audit`). Né du diagnostic des raccourcis pris cette session — c'est la barre, pas une suggestion.
1. Lire ce doc + `modele-voyage-container-decisions.md` (les 7 ADRs) + mémoire `modele-voyage-container-episodes`.
2. `cd ~/Developer/chartrandapps-site && git checkout feat/andalousie-seville-dogfood && npm test && npm run validate:fast` (139 verts, fast vert attendus).
3. Attaquer **ADR-7** : extraire les helpers de `proto/chania.astro` + `proto/seville.astro` dans un module
   partagé (golden master pour zéro régression — patron étape 3). Puis ADR-2 (route `[dest]/[base]/`).
4. Preview : `npm run preview` → comparer `/proto/seville/` (épisode) et `/andalousie/` (v2 actuel).
