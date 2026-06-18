# HANDOFF — Vietnam 2027 (solo, février-mars)

**Statut : ✅ DÉPLOYÉ EN PROD** — https://chartrandapps.ca/vietnam/ (5/5 HTTP 200, linké landing)
**Commits clés** : `e1a51f1` (itinéraire) → `93a2c8e` (fix rendu iOS). Build via `/voyage-new` v3.

## Ce que c'est
Voyage from-scratch #5, format ÉPISODE. 4 chapitres (Saigon 6n · Quy Nhơn 7n · Hội An/Đà Nẵng 10n · Hanoi 6n), 29 nuits, ~5 500 $CA. 1er voyage post-retraite de Martin. Angle : bouffe d'abord, 2e-3e cercle, slow travel ; voix « je » anonyme.

## Décisions (3 itérations sur l'angle)
- **Pas insider/4e cercle** (impossible à sourcer web + dépendait de Sumo Hai, larguée) → **2e-3e cercle** trouvable, contrat machine-à-saucisse standard.
- **Images = photos perso de Martin** pullées d'iCloud (osxphotos, pull auto) + Unsplash pour les trous. Voir `acces-phototheque-apple` (mémoire).
- Đà Lạt écarté (jamais été, 0 photo). Bangkok hors site.

## Fichiers clés
- `src/content/destinations/vietnam/` : destination.json, bases/0N-*.md, episodes/*.json, pois/dishes/gems/images.json
- `src/assets/destinations/vietnam/` : 66 images (resizées 2400px, ~74 MB)
- `src/styles/themes/vietnam.css` · `scripts/data/land/vietnam.geojson`
- Recherche : `docs/v3-design-research/vietnam-2027-recherche-sourcee.md` (108 spots sourcés) + `-menu-editorial.md`
- ⚠️ Photos perso pleine réso (354 MB) dans `docs/v3-design-research/vietnam-photos/` — NON commitées (trop lourd + perso).

## Pipeline (comment c'est fait)
1. Recherche : fan-out 16 agents Sonnet → 108 spots vérifiés (refus honnête, anti-Turquie).
2. Photos : 50 perso pull iCloud auto (osxphotos), tri par score esthétique Apple + filtre visage (cluster Martin pk=1), vision-check Opus.
3. Contenu : fan-out par base (Sonnet) → pois/dishes/gems + narration ; consolidation + provenance + vision-check + Unsplash sourcing groundé (validé curl).
4. validate:fast exit 0 → deploy.

## ⚠️ PIÈGE — 3 endroits à enregistrer un nouveau slug (sinon rendu cassé)
1. `ORDER` dans `src/pages/index.astro` (sinon orphelin de la landing)
2. `BBOXES` dans `scripts/geo/make-landmask.mjs` (sinon make:landmask échoue)
3. `@import '../styles/themes/<slug>.css'` dans `src/layouts/Destination.astro` — **SINON vars CSS undefined → `color-mix()` échoue → cards d'épisode BLANCS/invisibles** (le bug rendu iOS de Martin ; le container masque, les épisodes révèlent). Après edit : **clean build** (`rm -rf dist .astro node_modules/.vite`, Vite cache le CSS).

## Reste (vert ≠ fini)
- **Passe iPhone** : rendu vérifié sur sim (iPhone 16 Pro, Safari réel) — card titre + thème OK ; mais scroll des scènes pas scruté image par image.
- **Captions de scène Hội An** : alts d'`images.json` corrigés (les agents les avaient scramblés) ; les légendes dans `episodes/hoian.json` pas re-vérifiées une à une.
- **Cadrage carte initial Saigon** trop large (se recentre au scroll) — cosmétique.
- **Géocodage** : 23/56 POIs en `onMap:false` (Nominatim refuse les adresses à diacritiques).
- **`singleSourceTrusted`** : Hàu Chiên Trứng (Saigon) — « vérifier Google Maps avant visite » (sources 2023).
- **Jalon T-3 mois (~13 nov 2026)** : `revalidate-businesses.mjs` avant réservations.
