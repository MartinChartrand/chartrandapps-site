# HANDOFF — Site voyage Philippines/Visayas 2027

**Branche :** `voyage/philippines-visayas-2027` · **Commit scaffold :** `a7c0b5f` · **Date :** 2026-06-15
**Arrêt :** quota Martin à 70% → stop clean avant le seuil 78-80% (règle `gestion-limites-session`).

## Contexte
Voyage perso Martin & Sophie, fév-mars 2027. Brouillon (itinéraire + budget dans `~/Downloads/`) **fact-checké** (fan-out 8 axes) + **filtré au style** (bouffe+eau+slow, Cordillère coupée → all-in Visayas). Décision : en faire un site via `/voyage-new`.

## Décisions verrouillées (Phase 0)
- **5 chapitres par île/région** : Bangkok (escale, 5n) · Panay (7n) · Negros (5n) · Siquijor (3n) · Bohol→Cebu (4n).
- **Bangkok inclus** (chapitre d'ouverture). **Pampanga** = scène bouffe d'arrivée DANS le chapitre Panay (pas un chapitre).
- Slug `philippines` · dates de travail **1-27 fév 2027** · budget ~9 965 CAD/2 · sortie open-jaw par Cebu.
- Voix publique : **jamais nommer les voyageurs** (on/nous), couper le joual cru (`registre-public-voix`).

## FAIT (committé)
- `src/styles/themes/philippines.css` (turquoise Visayas) + import dans `src/layouts/Destination.astro:84`.
- `src/content/destinations/philippines/destination.json`.
- `scripts/data/land/philippines.geojson` (bbox approximatif — ⚠️ pas côtier, GDAL absent → garde géo permissive, vérifier coords POI à la main).
- `scripts/geo/make-landmask.mjs` : bbox `philippines` ajoutée.
- **Recherche des 5 bases** : `src/content/destinations/philippines/.research/<base>.json` (force-committée). Riche : ~16 POIs/base (héberg+restos+sights), 6-7 dishes, 5 gems, narratif 2200-3250 car, pratique, 7-8 imagesCandidates, panel créateurs. **Tout a un `sources[]`.**

## BLOC A — Consolidation ✅ FAIT (commit 7e9fb3b)
Script déterministe `scripts/migrate/_transform-philippines.py` (re-roulable) : `.research/*.json` → fichiers de collection. Résultat : **77 POIs** (tous onMap, 0 coords hors-zone), **33 dishes**, **25 gems**, **5 bases/*.md** (0 `[[poi:]]` orphelin — réconciliation par fuzzy match), `budget.json`, `pratique.json`. **`astro build` ✓ (19 pages).** Dates de source normalisées en YYYY-MM (le schéma l'exige). `approvedBy` PAS posé (ADR-3).

## BLOC B — Images + provenance + validation + deploy (RESTE — le gros morceau, vision = cher en quota)
1. **Modèle d'images à RETRAVAILLER** : Bloc A a généré 64 slots placeholder (hero + 5 `<base>-cover` + 1 `d-<id>`/dish + 1 `g-<id>`/gem, tous `photoId:"" sha:""`). C'est un échafaudage. Pour de vrai : passer à un set CURATÉ (cf. crete) en piochant dans les `imagesCandidates` de `.research/*.json` (8/base, vrais IDs Unsplash, claims atmosphere) — covers + quelques foodie/atmosphere partagés. Résoudre les long IDs (`curl -sI -L unsplash.com/photos/<id>/download`), remplir `images.json` (photoId).
2. `node scripts/migrate/fetch-images.mjs philippines` (download + sha256). Local, pas de tokens LLM.
3. `npm run vision:images philippines` (réseau, **Claude vision = CHER en quota**) → zéro mismatch. Test de l'ami-témoin.
4. **Provenance cleanup** : 40 POIs ont un `story`. `validate-provenance` exige, par story, ≥2 sources distinctes (ou `singleSourceTrusted`) + `approvedBy:"human"` + ≥60 car. Nettoyer les sources faibles (hébergements sourcés Booking/site officiel ≠ créateur indépendant). **`approvedBy:human` posé SEULEMENT sur approbation explicite de Martin (checkpoint 3).** D'ici là `validate:fast` est rouge (attendu).
5. **Checkpoint 2** : `npm run preview` → screenshot pinchtab du hero (palette).
6. `npm run validate:fast` exit 0 + `node scripts/validate-geo.mjs philippines`.
7. **Checkpoint 3** : approbation Martin → `git push origin main` (auto-deploy) → live `chartrandapps.ca/philippines/`.

Note : Pampanga (sisig) est dans le chapitre Panay (dishes `d-sisig-kapampangan` + narratif).

## BLOC B — Images + validation + deploy
1. `images.json` (slots + alt + claims + credit photoId) → `node scripts/migrate/fetch-images.mjs philippines` (download + sha256).
2. `npm run vision:images philippines` (réseau, Claude vision) → **zéro mismatch** exigé. Test de l'ami-témoin (Sophie connaît pas les Philippines → juger l'image vs son `alt`).
3. **Checkpoint 2** : `npm run build && npm run preview` → screenshot pinchtab du hero, valider palette.
4. `npm run validate:fast` → exit 0 (inclut provenance + vision + images + geo). `node scripts/validate-geo.mjs philippines`.
5. **Checkpoint 3** : approbation explicite Martin → `git push origin main` (auto-deploy) → vérifier live `chartrandapps.ca/philippines/`.

## Anti-pièges (rappel skill)
Pas de hotlink Unsplash · `claims:place` interdit au stock · `roles` enum `sleep|eat|see|do|drink` · pas de push sans `validate:fast` vert · `approvedBy:auto` interdit.
