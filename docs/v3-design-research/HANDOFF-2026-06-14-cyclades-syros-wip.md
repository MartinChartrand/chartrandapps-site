# HANDOFF — Cyclades : 3 CHAPITRES DÉPLOYÉS EN PROD ✅ (Syros · Sifnos · Folegandros) · Amorgos recherche préservée (build à reprendre) · reste Santorin (MAJ 2026-06-15)

> **MAJ 2026-06-15 (3) — 3/5 CHAPITRES EN PROD, ARRÊT CLEAN à ~68-70% du quota de Martin.** Le voyage Cyclades est aux **3/5**, tous live sur chartrandapps.ca. Pipeline éprouvé identique à chaque fois : recherche fan-out **Sonnet** → images CC **witnessées (Read) + scellées (vision:images)** → rebuild (pois/dishes/episode/base.md/tuile) → `npm run audit` VERT → rendu iOS → verdict feel de Martin → merge `feat/cyclades-<île>`→`main` (auto-deploy).
> - **Syros** (ch.1, capitale/réfugiés) — merge `96e82fd` — /cyclades/syros/
> - **Sifnos** (ch.2, l'île gastro : revithada/mastelo/Chrysopigi) — merge `a2eea94` — /cyclades/sifnos/
> - **Folegandros** (ch.3, l'île-prison : matsata/Katergo/Kastro) — merge `a2035fe` — /cyclades/folegandros/
> Aussi déployé : la **landing page** liste Cyclades en tête (champ `cardImage` = `syros-delfini`), hook container = `syros-kini`. **Narration ANONYME** (jamais nommer Sophie/Martin → « on/nous » ; mémoire `registre-public-voix`). Style images = mémoire `style-imagerie-voyage` (vie+couleur qui pop, N&B humain, **Chemin B = île-vraie** pour lieux/gens, bouffe générique OK). 29 images scellées (vision 29 MATCH/0 mismatch). 0 lien mort cyclades.
> **PROCHAIN : AMORGOS (ch.4)** — recherche fan-out FAITE et **PRÉSERVÉE** dans `src/content/destinations/cyclades/.research/amorgos-dossier.md` (header + flags) + `amorgos-research-raw.json` (98 ko, tout sourcé). **Build PAS commencé** (arrêt clean avant le plafond quota). Puis **Santorin (ch.5)**. Reprendre Amorgos par son dossier (branche `feat/cyclades-amorgos` depuis `main`). Détails « ÉTAT » plus bas (Syros).

**Autoportant. LE doc de reprise à froid pour le voyage Cyclades.**
À lire AVEC : `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoire **`contenu-sensoriel-bouffe-plages`** (LA consigne) + `HANDOFF-2026-06-14-prod-deploye.md` (la machine Andalousie en prod, toujours valide).
Mémoires clés : `contenu-sensoriel-bouffe-plages`, `gestion-limites-session`, `andalousie-dogfood-seville`, `modele-sonnet-pour-fanout`, `bareme-temoin-images`, `principe-cloner-pas-reinventer`.

## ⚠️ STATUT — 3 chapitres DÉPLOYÉS (Syros, Sifnos, Folegandros) ; reste Amorgos (recherche prête) + Santorin
- **Syros + Sifnos + Folegandros mergés→`main`, LIVE** sur https://chartrandapps.ca/cyclades/. L'Andalousie reste en prod aussi. **Chaque nouvelle île = NOUVELLE branche `feat/cyclades-<île>` depuis `main`** (`main` auto-deploie à chaque push). Amorgos = ch.4 (en 2 bases, recherche préservée dans `.research/amorgos-*`), Santorin = ch.5 (le final).
- **`npm run audit` VERT (exit 0)** : tests + build + validate:fast (géo/images/claims/provenance/orphans). `validate:full` = 12 liens morts mais **100% pré-existants** (andalousie/crete/turquie), **0 cyclades**.
- Rendu iOS vérifié (iPhone 17 Pro Max, Safari réel) : container hook + carte Leaflet (quirk WebKit OK) + scènes. Serveur preview arrêté.

## 🎯 CONSIGNE #1 — le style de voyage de Martin & Sophie (raison du WIP)
Le 1er épisode (Syros) était trop **cours d'histoire** (opéra, musée industriel, réfugiés) et pas assez **eau à la bouche**. Le **squelette/spine est VALIDÉ par Martin** (« le cercle autour de Délos », hook approuvé). Mais le CONTENU doit FOCUSSER sur leur style (mémoire `contenu-sensoriel-bouffe-plages`) :
- **LA BOUFFE d'abord** — tavernas de locaux, fruits de mer, agneau, salade grecque, tomates/légumes frais, raki/souma, incontournables culinaires
- **Slow travel + relaxation** — ça flâne, ça donne envie ; pas une course, pas une leçon
- **Eau à couper le souffle** — criques, plages, eau cristalline (Sophie)
- **MOINS d'histoire** — backdrop, jamais le lead
- **Logement confortable, propre, douillet** — PAS le grand luxe, PAS le rustique : chaleureux et bien tenu

**Portée — TOUS les voyages :** cet angle est gravé dans le `CLAUDE.md` du projet + le skill `voyage-new`, donc il s'applique à CHAQUE voyage futur (pas juste les Cyclades). **On devra probablement revoir l'Andalousie en prod sous ce même angle** (même style de voyage) — à planifier après les Cyclades.

## CE QUI EST BÂTI (Syros — squelette OK, contenu à rebalancer)
Tout dans `src/content/destinations/cyclades/` :
- **Fondation voyage** : `destination.json` (container + hook Délos approuvé + 5 tuiles), `budget.json` (~15 200 $/2/30j), `pratique.json` (ferries/Meltemi/logistique). Palette `src/styles/themes/cyclades.css` (+ import ajouté dans `src/layouts/Destination.astro`). Favicon ⛴️.
- **Épisode Syros** : `bases/01-syros.md`, `pois.json` (11), `dishes.json` (4), `episodes/syros.json` (fiche scrollytelling), `images.json` (9 CC witnessées à la main). Assets : `src/assets/destinations/cyclades/*.jpg`.
- **Recherche PRÉSERVÉE** (gitignorée, persiste localement) : `.research/cyclades-spine.md` (spine complet + angles par île + **flags jaunes** Tselementes/icône/éruption/Atlantide) + `.research/syros-dossier.md`.
- Dates voyage **provisoires** (juin 2027, à reconfirmer horaires ferry 2027). Coords Aristide interpolée (moyenne), Ithaki géocodée au centre-ville (flag). Louza **sans image** (rien d'honnête sur Commons, Loi 3).

## ÉTAT 2026-06-15 — REBALANCE SYROS FAIT (commit `3fbc158`)
Le rebuild sensoriel demandé est livré. Ce qui a changé :
- **Scènes (5)** : `loukoumi` (la porte, gardé) → **`kini-taverna`** (poulpe grillé, poisson du jour, coucher de soleil, image poulpe) → **`delfini-bain`** (crique turquoise abritée du Meltemi, image tall) → **`agneau`** (Plakostroto, gigot marjolaine/feu de bois, image paidakia) → **`ano-syros`** (backdrop léger, court). L'ANCIENNE scène opéra + l'ancienne scène fromage/charcuterie = SUPPRIMÉES comme vedettes ; opéra + musée industriel descendus dans le carnet « à voir, si ça te tente ».
- **POIs : +15** (criques Delfini/Kini/Megas Gialos/Grammata · tavernas Kini Allou Yialou/Dyo Tzitzikia · agneau Plakostroto/Calmo Mare · poisson Seariani · terroir Prekas · café Ellinikon · distillerie Makryonitis · logement douillet Lila/Nestorian/Syrou Lotos). Coords Nominatim ; interpolations flaggées honnêtement dans `coords.source`.
- **Dishes : +6** (poulpe, agneau/chevreau, horiatiki au San Michali, fagri/barbouni, tsipouro, câpres d'Apano Meria). **Correction souma→tsipouro** (la souma n'existe pas à Syros = Dodécanèse) baked partout.
- **Images : +5** CC witnessées à la main (Read) ET scellées `vision:images` (14 MATCH/0 mismatch) : `syros-delfini` (crique, tall), `syros-poulpe`, `syros-kini` (port crépuscule), `syros-agneau` (paidakia), `syros-horiatiki`.
- **`base.md` + tuile container** rebalancés food/water-led (la card hook de l'épisode ne dit plus « le Manchester de la Grèce, un opéra » — elle dit « ouvrir le voyage par le ventre et par la mer »).
- **Vérif** : `npm run audit` VERT · `validate:links` 0 mort cyclades (12 morts = 100% pré-existants andalousie/crète/turquie) · rendu iOS Safari réel (iPhone 17 Pro Max) confirmé. NOTE : cyclades n'a PAS de landmask → géo `--network` ne valide que crète (limitation pré-existante ; coords = Nominatim réel + interpolations flaggées).

## PROCHAIN MORCEAU — DANS L'ORDRE
1. **SYROS DÉPLOYÉ EN PROD ✅** (merge→main `96e82fd`, 2026-06-15, live + vérifié curl). La machine Cyclades est prouvée from-scratch, comme l'Andalousie. **Bâtir les 4 autres îles sur une NOUVELLE branche** (main auto-deploie).
2. **Appliquer la même lentille aux 4 autres îles** (Sifnos = gastro, Folegandros/Amorgos/Santorin = criques+tavernas). Spine = squelette, bouffe+eau+confort = vedettes. Même pipeline : fan-out recherche Sonnet → images CC witnessées → rebuild → audit → iOS.
3. **Détails à confirmer sur place / placeholders restants** : dates voyage juin 2027 provisoires (horaires ferry 2027 non publiés) ; coords interpolées (Allou Yialou, Dyo Tzitzikia, Plakostroto, Makryonitis, Lila, Nestorian, Syrou Lotos) ; n° exact Prekas (4 Chiou) ; horaires d'ouverture saisonniers.
4. Quand TOUTES les îles passent le verdict feel → merge `feat/cyclades` → `main` = **deploy prod** + `gh run watch` + curl. **Après les Cyclades : revoir l'Andalousie en prod sous le même angle** (même style de voyage).

## RAPPELS MACHINE
- Tout fan-out = **Sonnet** (`model:'sonnet'`, un hook BLOQUE sinon). Browsing auto-accepté en session (VALIDER avec Martin avant chaque fan-out).
- **`main` auto-déploie** (push) → bâtir sur la branche. `npm run audit` + `validate:full` + rendu iOS au simulateur AVANT merge.
- **Vert ≠ fini** : le verdict feel appartient à Martin. **Surveiller la jauge de session de Martin** (quota 4h, c'est LUI qui donne le %) → arrêt clean avant le plafond (mémoire `gestion-limites-session`).
