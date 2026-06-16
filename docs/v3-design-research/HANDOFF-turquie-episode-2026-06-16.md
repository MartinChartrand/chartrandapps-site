# HANDOFF — Turquie : les 4 épisodes écrits + sourcés (session 2026-06-16)

**Écrit en fin de session. Autoportant.** Devient le handoff COURANT (remplace `HANDOFF-crete-episode-2026-06-15.md`).
Contexte profond : `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoires `contenu-sensoriel-bouffe-plages`,
`format-episode-standard`, `sourcing-images-unsplash-grounded`, `prix-cad-partout`, `registre-public-voix`.

## Statut — LE GROS CHUNK EST FAIT (contenu), PAS DÉPLOYÉ

Conversion Turquie v2 → épisode, **phase contenu**. Décision de session (Martin) : **#1 contenu d'abord,
images après ; zéro raccourci ; arrêter après le gros chunk.** Quota frais.

- **4 épisodes écrits + sourcés** : `src/content/destinations/turquie/episodes/{istanbul,cappadoce,kas,fethiye}.json`.
  Chacun : cold open (2 beats) + 5 scènes storybook + montage + carnet + outro. Voix de Martin, angle
  bouffe+eau d'abord (histoire = backdrop), registre public (aucun nom de voyageur, zéro joual), **prix-cad
  partout** (taux figé Turquie 1 € ≈ 1,50 $ CAD, format `(~CAD X–Y)`).
- **Branche `turquie-episode`** (PAS `main` — `main` auto-déploie). `episodic` reste **false** → la page v2
  `/turquie/` est intacte, parité v2 préservée. Les routes épisode `/turquie/{istanbul,cappadoce,kas,fethiye}/`
  se génèrent quand même (route flag-indépendante) → review-ables sur build de branche.
- **`npm run audit` VERT** : build 38 pages, validate-provenance 178 OK / 0 problème, lint-orphans 0,
  image-claims 0 problème (87 jaune = vieux slots v2 + à venir, non bloquant). Les 4 pages buildent (~75 Ko).
- **Rien d'images** cette session (déféré, voir plus bas). Les scènes référencent **32 nouveaux slots
  sémantiques imageless** → rendu sans image en intérim (honnête : pas d'image, jamais une mauvaise).

## Méthode (prouvée cette session)

1. **Fan-out recherche/vérif** (4 agents Sonnet, web) sur les ancres v2 NON sourcées (provenance 0). A
   produit des sources PRIMAIRES (Katie Parla, Culinary Backstreets, Michelin, sites officiels) **et corrigé
   des dizaines d'erreurs v2** (voir § Dette). Rapport complet sauvé : `turquie/.research/research-verify-2026-06-16.json`
   (gitignoré — local, mais c'est LA liste de travail de la finition).
2. **Authoring en boucle principale (Opus)** — l'éditorial = le joyau (`editorial-genere-par-la-machine`),
   pas fan-outé. Facts corrigés cuits dans la prose ; lieux fermés JAMAIS en scène (substituts en prose +
   liens littéraux).
3. **Vérif adversariale** (4 agents Sonnet) contre une checklist de vérité-terrain → 2 bloquants d'épisode
   trouvés et CORRIGÉS (scène ferry Istanbul : « prix d'un café » restreint à la navette ; scène Dibek
   Cappadoce : caveat d'ouverture remonté dans l'intro). 1 faux positif rejeté (`{count}` EST interpolé par
   le renderer, `[base]/index.astro:152`).

## Ce que la recherche a démoli dans le v2 (≠ juste les images — la DONNÉE ment)

Le v2 avait **0 source** sur 72 POIs / 17 dishes / 16 gems. La recherche a confirmé OU corrigé. Erreurs majeures :
- **Istanbul** : Furreyya Galata Balıkçısı **FERMÉ** (→ barques balık ekmek d'Eminönü) · Vefa boza = **oct–avril
  seulement**, en septembre c'est le **şıra** · ferry « prix d'un tramway » = la NAVETTE (~15 TL), pas la longue
  croisière (640 TL) · Asmalı Cavit « zéro touriste » daté.
- **Cappadoce** : Dibek **« temporairement fermé »** au site (juin 2026, statut ambigu — appeler) · Muti
  **déménagé à Ortahisar** · Kocabağ à **Uçhisar** pas Ürgüp, terroir **tuf** pas schiste · Ziggy **~12 mezze**
  pas 21 · **Old Greek House = Michelin Bib Gourmand 2026** (la Cappadoce est entrée au Michelin déc. 2025),
  bâtie **~1879** pas 1892 · `hanmaga-konag-cave-hotel` = **hôtel halluciné** (→ Dedeli Konak) · Rose Valley
  trailhead = Meskendir/Göreme, combiné 4–6h.
- **Kaş** : İkbal **FERMÉ DÉFINITIF**, jamais une meyhane (→ Beyhude/Salkım) · Köyüm Gözleme = **mauvais lieu/fermé**
  (→ Pello Kalkan, Bezirgan) · Bi Lokma = **Andifli** pas Küçük Çakıl, pas sur la jetée · Mercan **déménagé** du
  port, spécialité **Lagos buğulama** · Kekova snorkel/plongée sur ruines **INTERDIT** (zone protégée) · Kaputaş
  **187 marches**, ouvre **8h**, ~60 TL · Limanağzı taxi-eau **350 TL** A/R pas 8€, clubs Bilal'in Yeri/Nuri's pas
  İnci/Bahçe/Korsan · Dragoman : prix non vérifiés.
- **Fethiye** : Reis Paspatur **non vérifiable** (→ Meğri, 1989) · Levissi Garden = maintenant **Lebessos**
  (claims potager/grenadiers/agneau **non confirmés**) · fish market noms **Mavi/Cem/Rafet non confirmés** (retirés
  de la prose) · Cin Bal **1975**, « zéro British » faux + additions-surprises · Butterfly temp d'eau 24-25°C
  **non sourcée** · Kayaköy = lumière **fin d'après-midi** pas l'aube · Kabak : Faralya EST le village d'accès,
  **~20 km de Fethiye** · Villa Rhapsody = **pension** pas villa.

→ Tout ça est **corrigé dans la prose des épisodes** (la chair éditoriale, sourcée). Le détail item-par-item
avec verdicts + sources + claims-image est dans `.research/research-verify-2026-06-16.json`.

## SESSION DE FINITION — liste de travail (dans l'ordre)

**Tâche 1 — Durcissement de la donnée POI (le vrai reste du chantier).** Le carnet (mode terrain) tire les POIs
par `kind` SANS filtrer `status.open` → il affiche encore la **donnée v2 brute, dont 4 lieux fermés/introuvables**
(`furreyya-galata-balkcs`, `ikbal-meyhane`, `köyüm-gozleme-evi-bezirgan`, `reis-restaurant-paspatur`) et des
noms/blurbs erronés (`fethiye-fish-market-mavicemrafet` rend « Mavi/Cem/Rafet », `bi-lokma-kucuk-cakl` rend
« Küçük Çakıl »). À faire : repointer les fermés vers les substituts vérifiés (**géocodage neuf requis** : Eminönü
barques, Beyhude/Salkım, Pello Kalkan, Meğri, Dedeli Konak), corriger noms+blurbs, **ajouter les sources** (de
`.research/`) sur les 72 POIs + 17 dishes (Ziggy 12 mezze, boza saisonnière, etc.), poser `approvedBy:human`.
*Pourquoi déféré ici : géocodage neuf + entremêlé avec la page v2 qui meurt au flip `episodic` → on durcit une
fois, à la retraite du v2.*

**Tâche 2 — Images (32 slots, méthode `sourcing-images-unsplash-grounded`).** Sourcer frais + vision-seal,
purger les vieux slots v2 orphelins (comme Crète 89→29). Mesurer d'abord `node scripts/validate-image-claims.mjs turquie`.
Les claims-image (= alts cibles) sont déjà écrits dans chaque épisode (champ `alt`/`thumbAlt`) ET dans `.research/`.
Liste des 32 slots : `ist-*` (8), `capp-*` (8), `kas-*` (8), `feth-*` (8) — voir les épisodes.

**Tâche 3 — Container survol + flip.** Dans `destination.json` : ajouter `episodic:true`, `chapterTotal:4`, et le
bloc `container` (hook + 4 tuiles) — cloner le bloc Crète. ⚠️ `container.test.mjs` exige `hookImage` + images de
tuiles = slots **SCELLÉS** → faire APRÈS les images (Tâche 2). Le hook porte ≥1 source (Loi 2).

**Tâche 4 — Retraite v2 + parité.** Au flip `episodic:true`, `/turquie/` passe en survol (la prose v2 long-scroll
n'est plus rendue). Retirer `turquie` de `DESTINATIONS` dans `scripts/test/content-parity.test.mjs` (sinon 3 tests
parité v2 rouges — cf. note Crète). Turquie déjà dans `ORDER` ligne 25 de `index.astro` → carte landing OK (règle
`deploy-ajouter-landing`).

**Tâche 5 — Deploy.** Merge FF `turquie-episode → main`, Pages auto. `npm run audit` = gate. Passe iPhone Safari
de Martin (le rendu scrollytelling n'a pas été vu à l'écran cette session — voir Dette).

## Dette honnête (auto-audit)

1. **Murs** : aucun. Fan-out browsing a roulé sans blocage.
2. **Placeholders** : les 32 slots d'images = imageless (intérim assumé, Tâche 2). Le carnet rend la donnée POI v2
   brute (4 lieux fermés + noms/blurbs erronés, Tâche 1).
3. **Sources** : les épisodes (scènes/beats/footers) sont sourcés. Les **POIs/dishes/gems restent à 0 source**
   (Tâche 1) — c'est la dette de provenance v2, le rapport `.research/` est la munition.
4. **Pixel** : N/A cette session (pas d'images). Les `alt` écrits sont des CLAIMS-cibles à satisfaire en Tâche 2.
5. **Vert-mais-creux** : le carnet « mode terrain » est structurellement là mais sa donnée n'est pas durcie. Les
   scènes (le contenu review-able) sont propres.
6. **Ce que je cache** : rien. Le carnet montre encore des lieux fermés tant que la Tâche 1 n'est pas faite — c'est
   dit ici noir sur blanc, et la frontière de scope (épisodes maintenant / données+images après) était la
   consigne de Martin.

## Reprise à froid

1. Lire ce doc + `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + `turquie/.research/research-verify-2026-06-16.json`.
2. `git checkout turquie-episode && npm run audit` (doit être VERT).
3. Attaquer la **Tâche 1** (POI hardening) puis **2** (images) — voir liste ci-dessus.
