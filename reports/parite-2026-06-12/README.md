# Dossier parité visuelle — 2026-06-12 (phase 3)

Checkpoint pour Martin : comparaison v1 live (chartrandapps.ca) vs v2 localhost:4321
après réparation des trois problèmes refusés lors de l'inspection du 2026-06-12.

## Fichiers

| Fichier | Contenu |
|---|---|
| `cote-a-cote-crete.png` | v1 live ↔ v2, pleine page côte à côte (vignette) |
| `cote-a-cote-turquie.png` | idem Turquie |
| `v1-live-*.png` / `v2-*.png` | captures pleine page 1440px (zoomables, ~11 Mo) |

## Réparations (commit dc914a4)

1. **Photos manquantes** — extract.mjs dédupait par photoId Unsplash : chaque réutilisation
   d'une photo perdait son usage (turquie : 82 img v1 → 49 entrées manifest → 34 rendues).
   Désormais une entrée par usage (slot) avec `base` + `role`, dédup au niveau fichier.
   La regex d'attributs (class jamais matché à cause d'un `[^>]*` greedy) remplacée.
2. **Heros/covers de bases** — `bases/*.md` référençaient `<slug>-cover`, jamais créé
   dans le manifest ; ChapterCover ne recevait aucune prop image. Slots covers créés,
   câblés via `resolveSlot()` (même pattern que le fix Hero 4a7f663).
3. **Cartes Leaflet à moitié brisées** — `@import 'leaflet.css'` dans le `<style>` scopé
   d'Astro → sélecteurs suffixés `[data-astro-cid]` → les panes/tuiles créés au runtime
   ne matchaient plus → `position:absolute` jamais appliqué → tuiles empilées dans un coin.
   Import déplacé au frontmatter (bundle global) + `invalidateSize()` défensif.

## Compteurs

| Mesure | v1 (fixture) | v2 avant | v2 après |
|---|---|---|---|
| `<img>` rendues — crete | 82 | 34 | **82** |
| `<img>` rendues — turquie | 82 | 34 | **86**¹ |
| Covers de chapitre avec image | 4/dest | 0 | **4/dest** |
| Hero avec image de fond | oui | oui (fix préc.) | oui |
| Cartes complètes (tuiles + markers) | 4/dest | 0 | **4/dest** |

¹ 86 > 82 : des POIs hébergement partagent leur photo entre AccomGrid et poi-list — réutilisation v1 rendue sur deux surfaces.

## Liens cliquables (critère du skill — ajout post-inspection)

L'extraction perdait aussi les liens : link-rows des cartes d'hébergement et des info-blocks
effacés, `<a>` inline strippés, place-links de prose réduits à des ancres internes mortes.
Réparé : récolte ordre-libre des `<a>` → champs canoniques POI (booking/tripadvisor/maps/officiel)
+ extraLinks + `links` sur les blocs prose ; chaque nom de recommandation est un place-link
Google Maps ; pills complètes sur les cartes d'hébergement.

| Liens cliquables externes | v1 | v2 avant | v2 après |
|---|---|---|---|
| crete | 159 | 8 | **166** |
| turquie | 153 | 14 | **155** |

## Garde-fous ajoutés

- Test `parité liens cliquables ≥ 0.95` (compte les `<a href="http…">` du dist vs fixture v1).
- Test `parité images rendues ≥ 0.95` (compte les `<img>` du dist vs fixture v1 + hero + covers) — la parité TEXTE seule ne voyait rien de tout ça.
- Warnings au build sur tout slot référencé non résolu (fini les `.filter(Boolean)` silencieux).
- 94/94 tests, `validate:fast` vert.

## Reste à faire (checkpoint Martin requis)

- Inspection visuelle de ce dossier → GO/NO-GO.
- Si GO : push des 16 commits locaux → Actions vert → curl du live.
- Rappel calendrier T-3 mois (juin 2027) pour revalidation lourde avant le voyage.
