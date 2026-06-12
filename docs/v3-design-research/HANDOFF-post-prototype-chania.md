# HANDOFF — Post-prototype Chania v3 (session du 2026-06-12, après-midi)

**Écrit en fin de session. Autoportant : si la mémoire de l'agent persiste pas, tout est ici +
`EXPLORATION.md` (même dossier) + `reports/proto-chania-2026-06-12/README.md`.**
Remplace `HANDOFF-prototype-chania.md` (la mission qu'il décrivait est ACCOMPLIE).

## Statut

- **Le prototype est LIVE en prod** : https://chartrandapps.ca/proto/chania/ (+ `/proto/chania.kml`).
  Route isolée, `robots.txt` bloque `/proto/`, le `/crete/` v2 est intact (et AMÉLIORÉ — fixes contenu).
- **6 commits poussés** ce jour : `fe3e925` (prototype + fixes contenu), `eef3df2` (fixes iPhone
  cartes/fan-out), `309adf1` (carnet carte fixed), `d4385e6` (tooltips CSS), `bd3b030` (KML flow),
  + le handoff. CI verte à chaque coup, 94/94 tests, validate:fast vert.
- **VERDICT EN ATTENTE** : dogfood Martin + Sophie (soir du 2026-06-12) sur les critères de kill
  1 (feel Parts Unknown — LE critère qui tue ou sauve) et 3 (perf mobile réelle).
  Critères 2 (terrain ≤ 2 taps), 4 (parité 34/34 liens) et 5 (contenu intouché, additif seulement) :
  **verts, vérifiés machine.**

## Ce qui a été bâti

`src/pages/proto/chania.astro` (autoportant, ~950 lignes) + `src/pages/proto/chania.kml.ts` :

1. **Cold open carte-scène** (pattern NBC) : Leaflet pleine viewport non interactive, 4 beats
   (la base, la plage locale, l'ouest sauvage, la crique secrète) — flyTo/fitBounds par beat,
   **POI ciblés étiquetés** (tooltip nom + halo pulsant, autres markers à 35 %), vignette photo
   et pills nommés dans chaque carte de texte.
2. **3 scènes storybook** (pattern IDMC) — test Bourdain : Ntourountous (la première bouchée),
   Tamam (souper dans un hammam du XVIᵉ), Evgonia (Nektarios décide). Photo sticky pleine page,
   3 beats/scène (resserré), pull-quotes en jalons. Champ `via` câblé (provenance créateur) — VIDE,
   gated par la règle de convergence.
3. **Le montage** (« Ce que la caméra a pas eu le temps de filmer ») : 2ᵉ carte-scène avant l'outro,
   un beat par GROUPE (Chrisostomos / les 3 hôtels / les wineries / le sunset des locaux) = le
   trailer du carnet. Le calque intégral (1 beat/adresse) a été débattu et REFUSÉ (fatigue
   scrollytelling, hiérarchie détruite).
4. **Carnet terrain** : liste dense en ordre éditorial (infoBlocks), vignettes pixel-vérifiées
   partout (plats 104px), pills par rangée, **mini-carte qui suit le scroll** (étiquette du POI de
   la rangée visible), export **KML** (15 placemarks), **mémoire du mode** (localStorage).
   Mobile : carte FIXED soudée sous la topbar mesurée.

## Patterns v3 verrouillés par le feedback de Martin (6 itérations, même session)

- **Chaque reco = ancrage carte (étiquette+halo) + lien cliquable + image. Jamais du texte seul.**
- Le montage = trailer du carnet dans l'épisode ; l'épisode reste une SÉLECTION (4-5 scènes max).
- La navigation répétée VA au carnet — assumé et renforcé (mémoire de mode, mini-carte, vignettes).
- Martin vit dans Google Maps en voyage → KML par chapitre (étape ordi unique → la carte apparaît
  dans l'app Google Maps, Enregistrés→Cartes, offline). L'UI doit dire le vrai flow.
- **Le carnet de bouche (5 exigences, EXPLORATION.md § Le carnet de bouche)** : recherche
  must-eat/must-drink dédiée par destination/région (vins, bières, alcools, mets — « la recherche
  que je fais à la mitaine ») · narratif par plat (`story`) · narratif par POI (Atlas Obscura
  généralisé) · photo alléchante par plat · hébergements qui ressortent du lot identifiés/racontés.

## Pièges techniques appris (détail : reports/proto-chania-2026-06-12/README.md + mémoire Claude)

- Tooltip Leaflet `permanent` fermée se ROUVRE après un zoom → visibilité par classe CSS, jamais
  closeTooltip. · `sticky` + viewport iOS = flottement → FIXED sous la topbar. · Mesurer la hauteur
  de la topbar en JS au chargement = PIÈGE (les fontes fallback font wrapper le titre → mesure ~120px
  au lieu de 48 → carte 70px trop basse) → hauteur FIXE en CSS (46px inner + 2px rail, titre en
  ellipsis), zéro mesure. · `offsetParent` = null sur un élément fixed (tester le mode, pas le
  layout). · flyTo mobile : cible décalée +18 % vers le bas (la carte de texte occupe le bas). ·
  Observer la carte de texte, pas le conteneur 90svh (désync scroll rapide). · CSS Leaflet en
  frontmatter (jamais @import scopé — leçon v2 reconfirmée).

## Dette contenu découverte (à corriger AVANT ou PENDANT la généralisation)

1. **Manifest images crete : alts décalés sur toute la ligne** — `visionChecked: 2026-06-11` est un
   FAUX VERT (photo-12 = pommes, pas fruits de mer ; accom-3 = festin de souvlakis, pas une chambre).
   La permutation dish→image des 5 plats Chania est corrigée (`fe3e925`) ; reste la passe complète
   d'alts + le slot Harismari dans `bases/01-chania.md` (accomExtras.image: accom-3).
2. **11 dishes + 3 gems SANS liens** dans Loutro/Sitia/Rethymno (listes dans le README du rapport)
   — même trou que celui que Martin a attrapé sur Chania.
3. Aucune photo de loukoumades au pool → preuve du besoin de sourcing photo PAR PLAT (exigence 4).

## ⚠ Risque CI imminent

GitHub force Node 24 sur les actions le **16 juin 2026** (dans 4 jours). `actions/checkout@v4` et
`actions/setup-node@v4` roulent sur Node 20 (warning vu dans les runs d'aujourd'hui). Le repo est
dormance-sensible : vérifier/mettre à jour les versions épinglées dans `.github/workflows/*` à la
prochaine session, sinon le heartbeat le détectera en cassant.

## Prochaine session — selon le verdict du dogfood

**Si GO (ça lève)** :
1. `/persona-debate` sur la généralisation (réservé pour CE moment, décision verrouillée du 12 juin) :
   schéma v3 (`story` par POI/dish, `sources: [{créateur, URL, date}]`, `type: plat|vin|bière|alcool|produit`,
   `region`), pipeline must-eat, graphe de créateurs (transcripts YouTube, convergence ≥ 2 sources,
   Wiens-Chania-2017 = premier candidat), intégration au skill `/voyage-new`.
2. Décliner le mode épisode aux 4 chapitres × 2 destinations (le proto est le gabarit — en faire des
   composants paramétrés, pas du copier-coller).
3. KML par destination (généraliser l'endpoint), `via` alimenté par le pipeline.
4. Purger la dette contenu (§ ci-dessus) au passage.

**Si PIVOT/KILL** : le carnet (vignettes + mini-carte + KML + liens) tient debout TOUT SEUL comme
amélioration du v2 — récupérable sans le scrollytelling. Les fixes contenu sont déjà en prod.
Les 5 exigences du carnet de bouche restent valides peu importe la forme.

## Démarrage suggéré

1. Lire ce doc + `EXPLORATION.md` (surtout § Le carnet de bouche) + `reports/proto-chania-2026-06-12/README.md`.
2. Recueillir le verdict de Martin (critères 1 et 3) — verdict franc, un échec = pivote ou tue.
3. `cd ~/Developer/chartrandapps-site && npm run build && npm test` (94 verts attendus).
4. Selon verdict : séquence GO ou PIVOT ci-dessus. Mémoire Claude à jour :
   `vision-skill-voyage-v3.md` (décisions/exigences) + `refonte-pipeline-voyage.md` (pièges).
