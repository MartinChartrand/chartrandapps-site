# HANDOFF — Scotland 2027 (1er site anglophone) — 2026-07-14

**État final : ✅ DÉPLOYÉ EN PROD — chartrandapps.ca/scotland/ (merge FF `c87e995`, CI verte, 5/5 pages 200, scotland dans ORDER de la landing).** `validate:fast` exit 0 · 47 images vision-scellées zéro mismatch · 5 récits `approvedBy:human` (GO Martin) · rendu 100% anglais vérifié (3 rounds de chasse au FR : SceneSection « Scène X/Y », pills lib/episode « Site officiel », format budget). Reste côté Martin : passe iPhone, réservation CalMac à l'ouverture des ventes (janv. 2027), B&B transit à Uig (jalons détaillés dans DevBrain `Voyage-Scotland-2027-Amie-50e`). Le reste de ce document décrit l'état AVANT la 2e session — gardé pour trace.

## Le voyage (validé Martin, Checkpoints 1 & 2 passés)
- Amie anglophone de Martin, **50e anniversaire**, solo (défaut — profil voyageuse à confirmer), conduit sans problème, whisky curieuse, budget 11-14 k$ CAD « on se gâte ».
- **21 nuits, 20 mai – 10 juin 2027, open-jaw EDI→INV** : Edinburgh/Leith 5n (20-25) → Argyll/Tighnabruaich 5n (25-30) → **transit Uig/Skye 1n (30-31, dimanche = pas de ferry Harris)** → ferry lundi 31 mai 9h30 → Harris 5n (31 mai-5 juin) → Assynt/Lochinver 5n (5-10 juin) → INV.
- Itinéraire **V2 choisie par Martin** (vs V1 samedi / V3 via les Uists) après flag des agents : Uig→Tarbert ne roule PAS le dimanche + départ 9h30.
- **GO visuel donné** : palette « Peat & Machair », hero Luskentyre (drapeau), hook « ...it's lunch. », voix « you ».

## Fait (sur la branche)
1. **Chantier i18n EN** (commit `bf6542d`) : champ `lang` au schéma destination (défaut fr) + `src/lib/ui-strings.ts` (dictionnaire fr/en) consommé par Destination.astro, EpisodeLayout, ContainerSurvol, CarnetSection, les 2 routes `[dest]`. `<html lang>` dynamique. Bonus fix : label budget survol dérivé de `travelers.count`. Vietnam vérifié intact (grep FR).
2. **Scaffold** : thème scotland.css, destination.json (episodic, lang:en), @import Destination.astro:87, bbox make-landmask, landmask bbox fallback (`scripts/data/land/scotland.geojson`, réseau OSM down → placeholder documenté).
3. **Contenu complet** (commit `458060e`) : 61 POIs / 4 bases.md / 4 fiches épisode (scènes sourcées, via = Somebody Feed Phil S7E8 Fishmarket, Rick Stein Argyll, Hairy Bikers Kintyre) / dishes.json 28 / gems.json 19. Recherche brute : `scotland/.research/*.md` (5 dossiers agents Sonnet, gitignorés).
4. **Images** : 48 entrées manifest, 5 scellées match (hero+4 covers), 43 fetchées sha256 OK. 9 dishes à image:"" (refus honnête — pas de candidat Unsplash légitime : cranachan, kippers, smokie, hearach, harris-gin, gin bute, singleton, venison, chowder-cup).

## RESTE (ordre de reprise)
1. **`npm run vision:images scotland`** — a crashé au moment du spin-down (quota, aucun fichier touché). Relancer, corriger les mismatchs (alt ou swap), re-run jusqu'à zéro.
2. **budget.json + pratique.json** à écrire (schémas `scripts/lib/schemas.mjs`). Budget cible ~11 900 CAD détaillé au Checkpoint 1 (vol 1500 / auto+ferrys 2300 / héberg. 4800 / bouffe 2700 / activités 600). Taux gelé **£1 ≈ 1,85 CAD** (déjà cuit dans les blurbs).
3. **STORIES — approbation Martin REQUISE** : 5 story sourcés écrits SANS `approvedBy` (garde provenance = rouge exprès) : ha-dish-harris-gin (singleSourceTrusted), ha-dish-croft36-buttery, as-dish-lochinver-pie (SST), as-dish-smoked-fish, ha-gem-tweed-loom. Présenter le digest → GO → poser `approvedBy:"human"`.
4. **`npm run validate:fast`** + `node scripts/validate-geo.mjs scotland` + grep hotlinks dist = 0. Géo : landmask = bbox only → vérifier les markers à l'œil sur la carte preview (compensation notée).
5. **Preview complet** (`npm run build && npm run preview`) : container + 4 épisodes + carnet + cartes Leaflet + responsive. Screenshot → Martin. Passe iPhone Martin.
6. **Checkpoint 3** : GO Martin → merge FF main (auto-deploy) → **AJOUTER scotland à ORDER dans `src/pages/index.astro`** (règle deploy-ajouter-landing) → CI verte → vérif live → Obsidian (note projet + jalon T-3 mois : **ferrys CalMac à réserver dès l'ouverture des ventes 2027, ~3e vendredi de janvier — CRITIQUE, ça se vend out**).

## Flags à revalider (T-3 mois, dans les .research/)
- Hébergement nuit transit Uig 30-31 mai : PAS recherché (gap) ; Harris se réserve 6-12 mois (Rock House Borve = splurge 50e).
- Statuts fragiles : Summer Isles Hotel (réouverture 2026 vs 2027), Machair Kitchen (café communautaire 2026), station essence Tighnabruaich (peut-être fermée — plein à Arrochar/Strachur), Starfish menu page morte.
- Images manquantes honnêtes : Stac Pollaidh, Ardvreck, Drumbeg, Hushinish, tweed (premium/inexistant → photo perso ou licence).
- 2 scènes Argyll utilisent des images génériques honnêtes (alt exacts) ; vision-check tranchera.

## Pièges appris cette session
- Slug à enregistrer à 3+ places : @import thème, BBOXES landmask, ORDER landing (deploy).
- Unsplash : napi search donne les IDs CDN directs via `urls.raw` (plus besoin du redirect) ; short ID ≠ CDN ID ; exclure `plus.unsplash.com` (premium).
- `t` shadowé dans ContainerSurvol/[dest]/index (tiles.map((t)…)) → const `strings`.
- npm approve-scripts requis (esbuild/sharp/pinchtab) ; pinchtab binaire : `~/.pinchtab/bin/0.14.1/pinchtab-darwin-arm64` direct (wrapper 0.14.0 cassé).
- 9 WARN « JSON schema » au build = préexistants (zod/Astro), non bloquants.
