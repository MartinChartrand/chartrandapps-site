# HANDOFF — Andalousie EN PROD + machine prouvée from-scratch (session 2026-06-14)

**Autoportant. LE doc de reprise à froid.** Remplace `HANDOFF-v3-seville-fini.md` (dépassé).
**À lire EN PREMIER :** ce doc + `docs/CONTRAT-MACHINE-A-SAUCISSE.md` (les 4 lois + la gate `npm run audit`).
Spec archi : `modele-voyage-container-decisions.md` (7 ADRs). Storyboard : `storyboard-bourdain-andalousie.md`.
Mémoires clés : `andalousie-dogfood-seville`, `contrat-machine-a-saucisse`, `editorial-genere-par-la-machine`,
`modele-sonnet-pour-fanout`, `fan-out-auto-accept-browsing`, `createurs-sources-fiables`, `bareme-temoin-images`.

## STATUT — tout est EN PROD, branche `main` propre
- Branche **`main`**, working tree **PROPRE**, synchro `origin/main`. **TOUT EST DÉPLOYÉ** (GitHub Pages via `.github/workflows/deploy.yml`, `on: push: main`).
- LIVE et vérifié sur **chartrandapps.ca** : `/` (landing voyages), `/andalousie/` (container survol), `/andalousie/seville/`, `/andalousie/ronda/`, `/crete/`, `/turquie/`, `/vetready/`.
- **139→145 tests verts, `npm run audit` exit 0.** ~10 commits cette session (`aa10d5c` → `bd18457`).

## ⚠️ RÈGLE OPÉRATIONNELLE #1 — `main` AUTO-DÉPLOIE
Chaque push sur `main` → build + deploy Pages en prod. **Bâtir tout nouveau chapitre/feature sur une BRANCHE**, vérifier, puis merge→push (= deploy). Pour un commit sans deploy (doc), mettre `[skip ci]` dans le message.

## CE QUI A ÉTÉ FAIT CETTE SESSION
1. **ADR-5 (container survol) shippé** (`de24dff`) — `/[dest]/` rend hook + grille factuelle + tuiles d'épisodes quand `episodic:true`. Composant `ContainerSurvol.astro`, schéma `container{}`. Durci par workflow adversarial Sonnet.
2. **Chapitre 2 Ronda — bâti FROM-SCRATCH par la machine** (`91b2af9` data + `613ee81` rendu). Parti de ZÉRO POI. **La preuve que la machine scale.**
3. **`ImageCredit` câblé** (`d13e1ea`) — `ImageCredits.astro`, attribution TASL (auteur→Commons · licence→deed) au bas de l'épisode + survol + Séville. Débloque le deploy (légal CC).
4. **Landing racine** (`bd18457`) — `src/pages/index.astro` (thème `home`), voyages en vedette + apps gardées. `public/index.html` retiré.
5. **2 garde-fous HARD-CODÉS** (hooks `~/.claude/settings.json`, hors repo) : modèle sonnet obligatoire en fan-out (`enforce-subagent-model.py`, BLOCK) + rappel Loi 1 sur échec WebFetch/pinchtab (`loi1-wall-reminder.py`, nudge).
6. **2 déploiements prod** vérifiés.

## LA MACHINE À SAUCISSE — le pipeline d'un chapitre from-scratch (Ronda = le template à cloner)
Tout fan-out = **Workflow d'agents Sonnet** (`model: 'sonnet'` partout, sinon le hook BLOQUE). Browsing auto-accepté (WebFetch/WebSearch allowlistés).
1. **Recherche** (fan-out Sonnet) : 6 catégories (dormir/manger/voir-faire/carnet/friction/logistique) → vérif adversariale (fact vs mythe) → dossier `.research/<base>-dossier.md` (gitignored).
2. **Data** : POIs dans `pois.json` (`base:"<base>"`, coords **géocodées Photon mais À VÉRIFIER** — Photon a matché Séville pour « Plaza de Toros de Ronda » !), carnet dans `dishes.json` (`base:"<base>"` — le scoping par base vit dans `src/lib/episode.ts`, sinon fuite entre chapitres), `bases/0N-<base>.md` (les infoBlocks pilotent l'ordre du carnet).
3. **Images CC** (fan-out Sonnet) : sourcer sur **Wikimedia Commons** → **vérif licence adversariale** (CC0/PD/BY/BY-SA seulement) → download + resize `sips -Z 2000` → **test du témoin fait À LA MAIN (Read chaque image, alt = vrais pixels)** → manifest `images.json` avec `credit{source:"wikimedia", photoId, photographer, license}`, sha256, `visionCheckedSemantic:match`. **`claims:"atmosphere"` TOUJOURS** (`claims:"place"` est RÉSERVÉ aux photos perso de Martin — sinon le validateur perce le plancher).
4. **Fiche** `episodes/<base>.json` : coldOpen (beats carte) + scenes (4, test Bourdain) + montage + carnet (groups par `kinds`) + outro. Référence par `poiRef`/slot, jamais d'URL/coord dupliquée. Sources sur chaque claim.
5. **Tuile live** : ajouter l'image + le hook à la tuile dans `destination.json container.tiles` (la route dérive « live » de l'existence de `episodes/<base>.json`).
6. **Vérif** : `npm run audit` (plancher) + **`npm run validate:full`** (liens réseau — A POGNÉ 3 liens morts Ronda que la CI laissait passer) + simulateur iOS (carte scrolly = quirk WebKit, fix race-condition `invalidateSize` dans EpisodeLayout) + Read les images.
7. **Deploy** : merge branche→main→push, `gh run watch`, curl la prod.

## PROCHAIN MORCEAU — Granada (chapitre 3), recherche FAITE
- **Dossier prêt : `src/content/destinations/andalousie/.research/granada-dossier.md`** (46 items, 16 vérifiés, 0 réfuté).
- **Tension en or** : 1492, chute du dernier royaume nasride — l'Alhambra conservée par les vainqueurs, la Capilla Real où Ferdinand & Isabelle se sont fait enterrer pile où ils ont fini la Reconquista. « Le dernier soupir du Maure » = légende du XVIᵉ (le fait : Boabdil rend les clés le 2 janvier 1492). La tapa GRATUITE = l'identité bouffe de Granada.
- **Gems pratiques** : zone ZAC (char interdit dans l'Albaicín sans plaque enregistrée par l'hôtel), ZBE depuis oct. 2025 (vignette DGT), Alhambra à réserver des MOIS d'avance (créneau Nasrid horodaté).
- **À faire** : suivre le pipeline ci-dessus, sur une branche `feat/granada`. 6 nuits (budget.json). Puis Axarquía/Casares (chapitres 4-5).

## Démarrage suggéré (à froid)
1. Lire ce doc + `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoire `andalousie-dogfood-seville`.
2. `git checkout main && git pull && npm run audit` (plancher vert attendu).
3. `git checkout -b feat/granada` ; lire `.research/granada-dossier.md` ; cloner le pipeline Ronda.
4. Fan-out = Sonnet (le hook l'enforce). Vérifier au pixel (Read images + iOS). `validate:full` avant merge. Merge→deploy.
