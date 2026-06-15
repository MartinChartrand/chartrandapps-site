# HANDOFF — Site voyage Philippines/Visayas 2027

**Branche :** `voyage/philippines-visayas-2027` · **Commit courant :** `3c37ce1` · **Date :** 2026-06-15

## ⚑ ÉTAT COURANT (2026-06-15, fin de session)
**Site BÂTI EN FORMAT ÉPISODE (v3), committé sur la branche, PAS encore en prod.**
- ✅ Conversion v2 long-scroll → **épisode** (clone Cyclades) : `episodic=true` + `container` (hook « le ferry, le feu et l'acide » + 5 tuiles) + **5 `episodes/<base>.json`** (cold open carte + scènes Bourdain + montage + carnet + outro). Bangkok authoré main ; Panay/Negros/Siquijor/Bohol fan-outés (Sonnet), sources injectées des données.
- ✅ **30 images** CDN-vérifiées + **30/30 match vision**. 7 plats nichés sans image (Loi 3). Mémoire `sourcing-images-unsplash-grounded` (validateur CDN gratuit + grille `file://` pinchtab).
- ✅ Provenance nettoyée, géo 77/77 (landmask étendu Pampanga), orphelins OK, build 24 pages.
- 🟥 **RESTE = CHECKPOINT 3** : Martin review le preview (`npm run preview` → localhost:4321/philippines/) → si OK : poser `approvedBy:human` ×92 (script à écrire ou sed) → `validate:fast` vert → **merge main = auto-deploy** live `chartrandapps.ca/philippines/`. PAS de push tant que Martin pas approuvé.
- 📋 Caveats à trancher : lechon (plat-finale) sans image (Unsplash en a aucun vrai → option Wikimedia CC) ; scène 2 Panay titre « batchoy » mais image kinilaw ; 2 stand-ins ambiance (panay-tangke=El Nido, bohol-panglao=île PH générique).
- 🔜 **SUIVI (task #8) : désactiver le format v2** — tout nouveau voyage en épisode (garde-fou + `/voyage-new` épisode-only). NE PAS ripper le rendu v2 : Crète+Turquie sont v2 en prod (grandfather ou convertir).

Scripts re-roulables : `scripts/migrate/_transform-philippines.py`, `_author-episode-bangkok.py`, `_assemble-episodes.py <workflow-output>`, `_author-container.py`.

---
**Arrêt initial :** quota Martin à 70% → stop clean avant le seuil 78-80% (règle `gestion-limites-session`).

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
1. **⚠️ MUR CONNU — les IDs Unsplash de la recherche sont HALLUCINÉS.** Validation faite (2026-06-15) : **6/39 candidats vivants seulement.** Negros = 100% inventés (`1542367200000-a1b2c3d4-...`). Bangkok/Bohol/Panay (short IDs 11 car) = invalidables par curl (Unsplash bloque les bots, 307/challenge). Seuls **6 photo-IDs de Siquijor** répondent 200 (`photo-1506905925346-21bda4d32df4`, `photo-1559494007-9f5847c49d94`, `photo-1555126634-323283e090fa`, `photo-1596838132731-3301c3fd4317`, `photo-1542838132-92c53300491e`, `photo-1507525428034-b723cf961d3e`). **NE PAS fetcher les IDs de `.research` à l'aveugle** (404 ou stock menteur — Loi 3). → Curer les vraies images **au navigateur (pinchtab sur unsplash.com)**, slot par slot. Bloc A a généré 64 slots placeholder (hero + 5 `<base>-cover` + 1 `d-<id>`/dish + 1 `g-<id>`/gem, `photoId:"" sha:""`) — **réduire à un set curaté ~20-26** (cf. crete : covers + foodie/atmosphere partagés, pas 1/POI), remapper `dish.image`/`gem.image` vers les slots partagés (modifier `scripts/migrate/_transform-philippines.py` puis re-rouler). Pour chaque slot : chercher sur Unsplash (pinchtab), récupérer le vrai photoId, mettre `_url`=`https://images.unsplash.com/photo-<id>?w=1600&q=80` dans `images.json`, puis `fetch-images.mjs`.
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
