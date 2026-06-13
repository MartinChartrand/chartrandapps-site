# HANDOFF — Généralisation v3 (session du 2026-06-13)

**Autoportant.** Remplace `HANDOFF-post-prototype-chania.md` (sa mission — recueillir le verdict
dogfood — est ACCOMPLIE). Contexte complémentaire : `v3-generalisation-decisions.md` (les 7 ADRs,
même dossier), `EXPLORATION.md` (§ Le carnet de bouche), mémoire Claude `vision-skill-voyage-v3.md`.

## Statut

- **VERDICT DOGFOOD = GO (2026-06-13).** Martin+Sophie : critère 1 (feel Bourdain) « on a encore
  besoin de travailler le storytelling, mais on est dans la bonne direction » — direction validée,
  **polish = chantier ouvert distinct, PAS un bloqueur** ; critère 3 (perf iPhone) « good en général ».
  Martin verrouille la spec v3. La séquence GO est ENCLENCHÉE.
- **12 commits poussés ce jour** (matin: `199cfa1` fix CI Node 24, `e676c60` ADRs, `72a2c00` étape 1
  schéma, `b08e3cb` étape 2 KML, `d82c149` étape 3 composants ; après-midi: `cc101dd` étape 4 vision,
  `d019cf9` étape 5A provenance, `430260c` doc, `4cde1d9`+`e99ae46`+`37bf33d` carnet Chania,
  `8ee16f4` schéma date-source). CI verte, build vert, **136/136 tests**.
- **Étapes 1-5 sur 6 FAITES. #6 EN COURS** (premier vrai contenu v3 livré, voir section dédiée).
- **VERDICT PRÊT-POUR-TEST (le plus important pour la prochaine session)** — Martin veut tester le
  framework sur une NOUVELLE destination. Réponse honnête, deux moitiés à niveaux différents :
  - **Moitié 1 — machine à véracité = PRÊTE.** Schéma v3 + garde provenance + filet vision + sourcing
    graphe-créateurs + pinchtab. Une nouvelle destination est le test IDÉAL (terrain vierge, pas de
    béquille legacy). **GO pour tester que le contenu sort vrai/sourcé.**
  - **Moitié 2 — rendu épisode v3 = PAS prête pour du neuf.** Le scrollytelling Bourdain vit
    UNIQUEMENT dans `src/pages/proto/chania.astro` (`EpisodeLayout`). La route réelle
    `src/pages/[dest]/index.astro` utilise encore TOUS les composants v2 (« long scroll plate »).
    Une nouvelle destination sortirait **véridique mais en look v2**, pas en épisode. Tester le FEEL
    exige d'abord de généraliser `EpisodeLayout` du proto vers `[dest]` (le chunk de rendu reporté).
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

## Étape 6 EN COURS — Carnet de bouche, premier vrai contenu v3 (cette session)

Le test grandeur nature. La boucle ADR-3 (pipeline propose des candidats → Martin approuve au gate →
on écrit) a tourné sur le chapitre **Chania**. Ce que ça a donné :

- **Le framework a refusé de mentir 5 fois** : 3 fiches live factuellement FAUSSES démasquées par le
  test de convergence humain (que ni les gardes ni un check sha-only attrapent) + 2 photos menteuses
  pognées par le filet vision. Corrigées : `loukoumades` Ntourountous→Kronos (Ntourountous = brunch),
  `marche-du-mercredi` était mal étiqueté (le Koumoundourou est Rethymno, pas Chania), `pieuvre`
  Chrisostomos/Evgonia→To Maridaki.
- **3 récits Bourdain shippés avec provenance vérifiée** (voix québécoise approuvée par Martin) :
  `chrisostomos` (POI, 2 sources indépendantes NatGeo + Gen-X Traveler), `raki-maison-tsikoudia`
  (singleSourceTrusted zarpanews), `sfakianopita-le-plat-de-la-region` (singleSourceTrusted ERT).
  `validate-provenance crete` = 3 OK / 0 probleme.
- **Pinchtab perce le mur YouTube** (`8ee16f4` débloque ça). L'agent web ne peut PAS extraire
  YouTube/TikTok/Insta (footer seulement) → les créateurs-caméra restaient non vérifiables. Mais le
  browser pinchtab (mode dashboard ; `eval` 404 mais `navigate`+`snapshot`+`screenshot` OK) lit la
  page : titre, chaîne, *Verified*, vues, description. J'ai qualifié ERT (TV publique grecque) + Paxxi
  (chaîne crétoise) pour la sfakianopita — VU Paxxi pétrir la pâte sur caméra. **C'est comme ça qu'on
  fait le track créateur-caméra : pinchtab pour visionner.** Limite : YouTube affiche des dates
  RELATIVES (« il y a X ans ») ; la date exacte se résout via un snippet Google (l'agent l'a fait pour
  ERT = 2023-06-22) ou reste introuvable (Paxxi → hors `sources[]`, jamais de date inventée).
- **Schéma date-source assoupli (`8ee16f4`)** : `SOURCE_DATE = /^\d{4}-\d{2}(-\d{2})?$/` sur
  `sourceSchema.date` seulement (précision mois OK pour les vidéos). Les dates de VOYAGE + `verifiedAt`
  gardent `ISO_DATE` strict (jour requis).
- **TROU PHOTO ouvert (gros)** : le filet vision a confirmé que le manifeste images crete est
  *scrambled* (les alts décalés) — `foodie-6` montre de l'agneau, `foodie-9` une plage. J'ai retiré les
  2 photos menteuses des items shippés (`image:""` → `getImgSrc` retourne null, `dataset.mjs` court-
  circuite sur image vide ; « placeholder honnête > stock », Sophie). **Les 3 items du carnet ont donc
  un récit vérifié mais AUCUNE photo.** La passe photo est le prochain chunk : sourcer de vraies images
  (`scripts/migrate/fetch-images.mjs` : ajouter slots avec `_url`, il télécharge + sha256) → vision-check
  → sceau. Niche crétois incertain en stock Unsplash — mérite sa propre session.
- **Items tenus DEHORS honnêtement** (le filet filtre) : `bougatsa-iordanis` + marché Laiki Minoos
  (récits écrits, besoin de photo) ; `degustation-raki-et-vin` (date Chamberlin incomplète + Neather
  hosted) ; `tamam`/`evgonia`/`paidakia-stratis` (1 source ou agrégateurs).

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

## PROCHAINE SESSION — Test sur une NOUVELLE destination (décision Martin, 2026-06-13)

Martin veut dogfooder le framework sur une **nouvelle idée de voyage** (destination à choisir avec lui
en Phase 0 du skill). Deux chemins selon ce qu'on teste — relire le VERDICT PRÊT-POUR-TEST en haut :

### Chemin A — Tester la VÉRACITÉ (prêt, recommandé en premier)
Le vrai stress test : le framework crache-t-il du contenu vrai/sourcé sur terrain vierge (sans la
béquille du legacy) ? **Scoper à UN chapitre** (pattern éprouvé proto-Chania-d'abord), pas un build
4-bases complet.
1. `/voyage-new` Phase 0 (cadrage : destination, voyageur, dates, 1 base focus) — checkpoint Martin.
2. Phase 1b carnet : lancer un agent de recherche graphe-créateurs + sources (réutiliser le prompt qui
   a marché pour Chania — voir l'agent de la session 2026-06-13). Ramener des CANDIDATS.
3. Gate Martin : il approuve → `approvedBy:human`. Les INSUFFISANT restent dehors.
4. Écrire les récits (sa voix), `vision:images` sur les vraies photos, `validate:provenance` +
   `validate:fast` verts.
**Ce que ça VA exposer (et c'est le but)** : le trou photo (sourcing niche en stock), peut-être des
gaps du skill. Bibittes = signal, pas échec.

### Chemin B — Tester le FEEL épisode (BLOQUÉ tant que le rendu n'est pas généralisé)
Pour qu'une nouvelle destination RESSEMBLE à un épisode Parts Unknown (pas au long-scroll v2), il faut
d'abord **généraliser le rendu épisode** : porter `src/pages/proto/chania.astro` (qui utilise
`EpisodeLayout` + `components/episode/*`) vers la route réelle `src/pages/[dest]/index.astro` (ou une
route `[dest]/[base]` épisode). Aujourd'hui `[dest]/index.astro` = 100% composants v2. C'est LE chunk
de rendu reporté. À faire avant (ou pendant) si Martin veut juger le feel sur du neuf.

### Chunks de rendu reportés (HORS skill par ADR-7) — à planifier
1. **Généraliser l'épisode** proto → `[dest]` (ci-dessus). Gating pour le feel.
2. **Afficher la provenance dans l'UI** : `sources[]` + badge `singleSourceTrusted` + avertissement
   `stale` (« sources visibles » de Marco/ADR-5). Les données existent, le rendu non.

### Trou photo (le plus concret du #6)
Manifeste crete scrambled (alts décalés, confirmé par le filet). Passe dédiée : sourcer de vraies
photos (Unsplash via pinchtab → `fetch-images.mjs` → `vision:images` → sceau). Concerne les 3 items
shippés (chrisostomos/raki/sfakianopita = sans photo) + bougatsa/marché. **PAS le focus legacy** mais
nécessaire pour que le carnet ait ses « photos alléchantes » (exigence #4 du carnet).

### Dette legacy (PAS le focus — framework d'abord)
Alts manifest crete + 11 dishes/3 gems sans liens (Loutro/Sitia/Rethymno). `vision:images crete`
complet sort la liste (mais le rouler scelle les mismatch → validate:fast rouge sur le legacy : à faire
seulement quand on attaque vraiment la purge). **Polish storytelling Bourdain** = chantier distinct.

## Démarrage suggéré (prochaine session)

1. Lire ce doc (surtout le VERDICT PRÊT-POUR-TEST + la section #6) + `v3-generalisation-decisions.md`
   (7 ADRs) + mémoires `bareme-temoin-images.md` (filet niveau image) + `vision-skill-voyage-v3.md`.
2. `cd ~/Developer/chartrandapps-site && npm test && npm run validate:fast` (136 verts, fast vert attendus).
3. Décider avec Martin : **Chemin A** (test véracité sur 1 chapitre d'une nouvelle destination — prêt)
   ou **généraliser le rendu épisode d'abord** (Chemin B) pour aussi juger le feel. Le skill à suivre :
   `~/.claude/skills/voyage-new/SKILL.md` (v3). Pinchtab dispo pour le track créateur-caméra.
