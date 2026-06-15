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

## BLOC A — Consolidation (à faire en premier, ~besoin 20-30% de quota)
Transformer `.research/*.json` → fichiers de collection conformes. **Cloner le format exact de `crete/`** (`pois.json`, `bases/01-chania.md`, `dishes.json`, `images.json`). Approche recommandée : **script Python de transformation** (évite de charger 161k dans le contexte).

Mapping POI (héberg→`kind:hotel,roles:[sleep],tier`; resto→`kind:resto,roles:[eat],signature=platSignature`; sight→`kind:sight|activity|plage`→`mapType:sight|plage`, `roles:[see|do]`). Champs constants : `price{range,currency:THB/PHP,asOf:"2026-06"}`, `coords{lat,lng,source:"websearch",verifiedOn:"2026-06-15"}`, `links{maps:généré}`, `status{open:true,lastChecked:"2026-06-15",method:"websearch"}`, `onMap:true si coords`.

**Pièges à régler :**
1. **Image slots** : modèle curaté (hero + covers + foodie-N + accom-N + atmosphere), PAS 1 image/POI. Les POIs partagent des slots. Décider la liste d'images depuis imagesCandidates.
2. **`[[poi:id]]` dans les narratifs** : les agents ont mis des ids qui ne matchent pas toujours l'id réel du POI (ex. narratif Bangkok dit `[[poi:phed-mark]]`, le POI est `phed-mark-ekkamai`). Réconcilier sinon orphelins.
3. **Provenance** : `validate-provenance` mord sur tout `story` non-vide → exige ≥2 sources distinctes (ou `singleSourceTrusted`) + **`approvedBy:"human"`**. ⚠️ `approvedBy:human` UNIQUEMENT sur approbation explicite de Martin (checkpoint 3). Nettoyer les sources faibles (certains hébergements sourcés Booking/site officiel = pas un créateur indépendant → soit retirer le `story`, soit `singleSourceTrusted`, soit ajouter une vraie 2e source).
4. Pampanga (sisig) à intégrer comme section/POIs dans le chapitre Panay.

## BLOC B — Images + validation + deploy
1. `images.json` (slots + alt + claims + credit photoId) → `node scripts/migrate/fetch-images.mjs philippines` (download + sha256).
2. `npm run vision:images philippines` (réseau, Claude vision) → **zéro mismatch** exigé. Test de l'ami-témoin (Sophie connaît pas les Philippines → juger l'image vs son `alt`).
3. **Checkpoint 2** : `npm run build && npm run preview` → screenshot pinchtab du hero, valider palette.
4. `npm run validate:fast` → exit 0 (inclut provenance + vision + images + geo). `node scripts/validate-geo.mjs philippines`.
5. **Checkpoint 3** : approbation explicite Martin → `git push origin main` (auto-deploy) → vérifier live `chartrandapps.ca/philippines/`.

## Anti-pièges (rappel skill)
Pas de hotlink Unsplash · `claims:place` interdit au stock · `roles` enum `sleep|eat|see|do|drink` · pas de push sans `validate:fast` vert · `approvedBy:auto` interdit.
