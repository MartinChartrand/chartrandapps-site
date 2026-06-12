# Prototype Chania « mode épisode » — captures de vérification (2026-06-12)

Route : `/proto/chania/` (`src/pages/proto/chania.astro`) — rendu alternatif isolé,
le `/crete/` v2 en prod n'est pas touché. Contexte : `docs/v3-design-research/HANDOFF-prototype-chania.md`.

| Capture | Quoi |
|---|---|
| `01-cold-open.png` | Cold open carte-scène : Leaflet pleine viewport cadrée sur les 15 POI du chapitre, carte-titre en overlay (pattern NBC). |
| `03-scene1-pullquote.png` | Pull-quote jalon de la scène 1 (« C'est cinq euros… ») sur photo sticky pleine page (pattern storybook IDMC). |
| `04-transition-scene2.png` | Transition sticky entre scène 1 et scène 2 au scroll. |
| `05-carnet.png` | Mode Carnet (terrain) : liste dense, 1 tap depuis la barre fixe, pill Maps direct par rangée. |
| `06-beat-focus-vignette.png` | Itération 2 (feedback Martin) : beat « La base » avec vignette photo, markers cibles étiquetés sur la carte (Splantzia + Halepa Hotel), autres markers estompés, pills nommés. |
| `07-carnet-kml.png` | Itération 2 : export KML en tête du carnet (« je vis dans Google Maps ») — import unique dans Google My Maps = les 15 POI en pins offline. |

## Itération 2 (même session, feedback Martin sur le Mac)

1. **Focus carte précis** : chaque beat porte `data-targets` ; les POI ciblés reçoivent un tooltip
   permanent (nom) + halo pulsant, les autres markers tombent à 35 % d'opacité.
2. **Liens uniformes** : chaque carte de reco a ses pills (« Splantzia · Maps », « Halepa · Maps »…).
3. **Vignettes photos** dans les cartes des beats de carte (slots vérifiés aux pixels réels).
4. **Rythme resserré** : scènes à 3 beats (72svh) au lieu de 5 (90svh) — la reco arrive plus vite.
5. **Fond de scène Evgonia** : poisson + pieuvre grillés (photo-5.jpg) = « l'arrivage du matin ».
6. **Export KML** (`/proto/chania.kml`, endpoint Astro) : 15 placemarks depuis pois.json.

## Vérifications machine (les critères de kill humains restent à Martin + Sophie)

- Critère 2 (terrain) : ouverture → tap « Carnet » → tap « Maps » d'un resto = 2 taps. Vérifié pinchtab.
- Critère 4 (parité) : 33/33 liens du contenu du chapitre présents sur la page proto, 0 manquant
  (script ad hoc, POI + accomExtras + infoBlocks prose + dishes + gems). Tests CI : 94/94 verts,
  parité v2 non affectée (route séparée).
- Critère 5 (contenu intouché) : aucun fichier de contenu modifié ; textes des beats = prose/blurbs existants.
- Bug corrigé en cours de route : en scroll rapide, le `flyTo` partait vers le beat suivant pendant que la
  carte de texte affichée était encore le précédent → l'IntersectionObserver vise maintenant la carte de
  texte (`.beat-card`), pas le conteneur 90svh.

## Itération 3 (même session, feedback Martin : « browser le carnet dans l'épisode » + nav répétée)

Captures : `08-montage.png`.

1. **Le montage** (avant l'outro) : deuxième séquence carte-scène, un beat par GROUPE — la table
   qu'on a pas filmée (Chrisostomos), où on dort (3 hôtels), le vin (2 wineries), le sunset des
   locaux (Profiti Ilia). Le trailer du carnet dans l'épisode. Le calque intégral (1 beat par
   adresse = 13 écrans de flyTo) a été refusé et débattu : fatigue du scrollytelling + destruction
   de la hiérarchie deux-vitesses. Bourdain montre 4-5 scènes par épisode, pas 15.
2. **Mémoire du mode** (localStorage) : on rouvre le site dans le dernier mode utilisé — en voyage,
   le site rouvre direct en carnet. Le hash #carnet garde priorité.
3. **Mini-carte sticky au carnet** : la liste scrolle, la carte suit et étiquette le POI de la
   rangée visible (mêmes mécaniques focus/halo, 3ᵉ instance Leaflet, init paresseuse —
   Leaflet dans un display:none mesure 0×0).
4. **Champ `via` câblé dans les scènes** (provenance créateur : « Sonny en a fait un épisode ») —
   VIDE pour l'instant : la règle de convergence interdit d'affirmer une couverture sans vérifier
   le contenu vidéo. Wiens a couvert Chania (food tour 2017) = premier candidat pour le pipeline
   de sourcing v3 par transcripts.

## Itération 4 (même session) — liens manquants + photos alléchantes

Captures : `09-carnet-vignettes.png`.

1. **Liens ajoutés au CONTENU** (dishes.json/gems.json — additif, profite aussi à la prod /crete/) :
   pieuvre grillée → Chrisostomos·Maps + Evgonia·Maps ; sfakianopita → Marché couvert (Agora) ;
   port vénitien 5h30 → Maps. Plus AUCUN item Chania sans lien (34/34).
   ⚠ Reste 11 dishes + 3 gems sans liens dans Loutro/Sitia/Rethymno — passe de contenu à planifier.
2. **Permutation dish→image corrigée dans dishes.json** (pixel-vérifiée) : la prod affichait la
   mauvaise photo sur les 5 plats Chania (pieuvre illustrée par un panier de vin, etc.).
   Nouveau mapping : pieuvre→foodie-2 (pieuvre réelle), raki/vin→foodie-3 (vignes),
   sfakianopita→foodie-4 (dakos myzithra), cours→foodie-1 (mezze), loukoumades→foodie-5
   (Place 1866 — aucune photo de loukoumades au pool). Gem nea-chora→photo-1 (plage réelle).
3. **Vignettes dans le carnet du proto** : tous les POI, hôtels (incl. correction Harismari — le
   slot accom-3 du contenu pointe sur un festin de souvlakis), plats (104px, alléchantes) et gems.
4. **Exigences v3 de Martin gravées** dans `docs/v3-design-research/EXPLORATION.md`
   (§ Le carnet de bouche) : recherche must-eat/must-drink dédiée par destination (vins, bières,
   alcools, mets), narratif par plat ET par POI (modèle Bourdain), photo alléchante par plat,
   hébergements qui ressortent du lot identifiés et racontés.

## ⚠ Bug de contenu v2 découvert (hors scope proto, à corriger séparément)

Le manifest `src/content/destinations/crete/images.json` a des **alts décalés vs les pixels réels**
(vérifié visuellement) : `photo-13.jpg` = feta/olives (alt dit « loukoumades »), `photo-14.jpg` = pieuvre
grillée (alt dit « fromage et olives »), `photo-12.jpg` = des pommes (alt dit « fruits de mer »),
`photo-15.jpg` = panier de vin (alt dit « poulpe »), `photo-19.jpg` = panorama côtier (alt dit « table
dressée »). Le `visionChecked: 2026-06-11` est donc un faux vert — la page v2 `/crete/` affiche ces images
avec ces alts. Les scènes du proto référencent les slots par PIXELS réels avec des alts honnêtes en dur.
