# HANDOFF — Session prototype Chania (v3, mode épisode)

**Écrit le 2026-06-12 en fin de session d'exploration. Ce doc est autoportant : si la mémoire de l'agent persiste pas, tout ce qu'il faut est ici + `EXPLORATION.md` (même dossier).**

## Mission de la prochaine session

Prototyper **UN seul chapitre — Chania (Crète)** — en « mode épisode » : cold open carte-scène, scènes storybook, carnet dense à un tap. **Rien d'autre.** Pas les 3 autres chapitres, pas la Turquie, pas le skill `/voyage-new`, pas les features dates/incontournables.

## Le concept en une phrase

Le site v3 n'est pas un guide avec du flow : c'est **un épisode de Parts Unknown consultable**. Bourdain = la référence maîtresse de Martin (il voyage littéralement en suivant « Bourdain ate here » : Lunch Lady à HCMC, bún bò Huế au marché de Huế). Détails complets, patterns déconstruits et références capturées : `EXPLORATION.md`.

## Décisions verrouillées (oui explicite de Martin, 2026-06-12)

1. **Rêve/terrain tranché** : mode épisode (scrollytelling) par défaut + mode **Carnet** (liste dense, liens, heures) accessible à UN tap.
2. **Prototype Chania approuvé**, session dédiée.
3. **Pas de stress test / débat personas avant le prototype** — le prototype EST le stress test. Le `/persona-debate` est réservé pour après, au moment de généraliser au skill v3.
4. Sourcing futur du skill : graphe de créateurs bouffe (Wiens, Sonny, Lila/curiousaboutvietnam, Mickey Scotch + découverte de locaux par destination), règle de convergence ≥ 2 sources, provenance au schéma. **PAS dans le scope du prototype** — le prototype utilise le contenu Chania existant.

## Critères de kill (définis AVANT de bâtir — un échec = pivote ou tue, pas de rapiéçage)

| # | Critère | Mesure |
|---|---|---|
| 1 | Feel Parts Unknown | Martin + Sophie scrollent Chania : ça lève ou pas. Verdict franc. |
| 2 | Mode terrain survit | iPhone : resto précis → lien Maps ouvert en ≤ 2 taps depuis l'ouverture. |
| 3 | Performance mobile | Scroll fluide, `flyTo` sans jank, Lighthouse pas effondré vs v2. |
| 4 | Parité intacte | Aucun recul liens/images sur le chapitre (tests CI : content-parity.test.mjs, seuils ≥ 0.95). |
| 5 | Contenu intouché | Champs ADDITIFS permis (ex. `beat`/`highlight`), mutations/réécritures forcées du contenu interdites. |

## Patterns design à implémenter (déconstruits dans EXPLORATION.md, section 1)

- **Carte-scène** (réf. NBC Detroit wall) : carte pleine viewport, `flyTo()` Leaflet entre beats narratifs en overlay. ~80 % de l'effet sans Mapbox/3D.
- **Storybook** (réf. IDMC Ukraine) : photo pleine page = la scène, beats de texte qui avancent par-dessus au scroll ; pull-quotes en jalons.
- **Progression visible** (réf. A Trail Tale) : jour X/Y, chapitre courant, trace parcourue — version sobre.
- **Sous-nav par intention + révélation progressive** (réf. Black Tomato) : Épisode / Carnet ; résumé d'abord, densité à la demande.
- **Test Bourdain par POI vedette** : qui est derrière ? pourquoi ça compte ? on commande quoi ? Réponse impossible → entrée de carnet, pas une scène. Les `dishes` (déjà entités éditoriales au schéma) = fil conducteur naturel des scènes.

## Contexte technique (acquis v2 — lire ARCHITECTURE.md v2.1 à la racine)

- Astro 6, content collections (`src/content.config.ts` — PAS src/content/config.ts), GitHub Pages source=Actions, domaine chartrandapps.ca.
- Contenu = données structurées Zod : POI avec `links` {official, booking, tripadvisor, maps} + `extraLinks`, `images.json` une entrée par slot (base + role), gems/dishes éditoriales, infoBlocks ordonnés.
- Cartes Leaflet : .astro vanilla + IntersectionObserver (déjà en place — même mécanique pour les beats de scroll).
- **PIÈGE MORTEL appris dans le sang** : CSS d'une lib runtime (Leaflet) JAMAIS en `@import` dans un `<style>` de composant — Astro scope les sélecteurs et les éléments runtime ne matchent plus. Import dans le frontmatter = bundle global.
- Commandes : `npm run build`, `validate:fast`, preview = `build && preview`. 94 tests doivent rester verts.
- Deep-links existants : `#map-<base>`, `#poi-<id>`.
- Captures du design v2 actuel (le « long scroll plate » à dépasser) : `reports/parite-2026-06-12/`.

## Démarrage suggéré de la session

1. Lire `EXPLORATION.md` (même dossier) + ARCHITECTURE.md.
2. Regarder les données Chania réelles (collections Crète) pour choisir 2-3 POI qui passent le test Bourdain comme scènes.
3. Brancher le prototype comme rendu alternatif du chapitre (route ou flag), sans toucher le rendu v2 en prod.
4. Évaluer contre les 5 critères de kill AVANT de polir.
