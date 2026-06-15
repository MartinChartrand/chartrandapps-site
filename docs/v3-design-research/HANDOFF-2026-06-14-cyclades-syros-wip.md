# HANDOFF — Cyclades ch.1 (Syros) : squelette VALIDÉ, REBALANCE bouffe/plages à faire (session 2026-06-14 soir)

**Autoportant. LE doc de reprise à froid pour le voyage Cyclades.**
À lire AVEC : `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoire **`contenu-sensoriel-bouffe-plages`** (LA consigne) + `HANDOFF-2026-06-14-prod-deploye.md` (la machine Andalousie en prod, toujours valide).
Mémoires clés : `contenu-sensoriel-bouffe-plages`, `gestion-limites-session`, `andalousie-dogfood-seville`, `modele-sonnet-pour-fanout`, `bareme-temoin-images`, `principe-cloner-pas-reinventer`.

## ⚠️ STATUT — branche `feat/cyclades`, NON déployée
- Branche **`feat/cyclades`** (PAS `main`). Tout est **committé sur la branche** (voir `git log`). **RIEN EN PROD** — `main` reste l'Andalousie.
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

## PROCHAIN MORCEAU (à la reprise, après reset 4h) — DANS L'ORDRE
1. **REBUILD Syros sensoriel.** Fan-out recherche Sonnet sur : **criques/plages** (Kini, Komito, Delfini, Vari, Galissas — eau cristalline), **tavernas de locaux** (poisson frais à Kini, agneau/salade/légumes de village), **bouffe** (horiatiki/tomates, poulpe grillé, agneau, souma/raki, fruits de mer), **logements confortables/douillets**. Puis images CC (assiettes taverna, fruits de mer, criques) → witness à la main → rebuild `pois.json`/`dishes.json`/`episodes/syros.json`.
   - **Rebalance scènes** : loukoumi (la porte, garder) → **LA TAVERNA** (poisson/agneau/salade/raki) → **UNE CRIQUE** (eau cristalline, le bain) → histoire (Ano Syros) en backdrop léger. Opéra + musée industriel → **descendent dans le carnet** (options « à voir »), arrêtent d'être les vedettes.
2. **Appliquer la même lentille aux 4 autres îles** (Sifnos = gastro, Folegandros/Amorgos/Santorin = criques+tavernas). Spine = squelette, bouffe+eau+confort = vedettes.
3. Quand Syros passe le **verdict feel de Martin** → merge `feat/cyclades` → `main` = **deploy prod** + `gh run watch` + curl.

## RAPPELS MACHINE
- Tout fan-out = **Sonnet** (`model:'sonnet'`, un hook BLOQUE sinon). Browsing auto-accepté en session (VALIDER avec Martin avant chaque fan-out).
- **`main` auto-déploie** (push) → bâtir sur la branche. `npm run audit` + `validate:full` + rendu iOS au simulateur AVANT merge.
- **Vert ≠ fini** : le verdict feel appartient à Martin. **Surveiller la jauge de session de Martin** (quota 4h, c'est LUI qui donne le %) → arrêt clean avant le plafond (mémoire `gestion-limites-session`).
