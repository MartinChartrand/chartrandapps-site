# HANDOFF — Chemin B « mode épisode » (session 2026-06-13, suite)

**Autoportant. BÉTON.** Remplace `HANDOFF-v3-generalisation.md` (sa mission — dogfood véracité — est
ACCOMPLIE). Contexte complémentaire dans le même dossier : `storyboard-bourdain-andalousie.md` (le board
+ l'overlay Séville + la grammaire Bourdain sourcée), `v3-generalisation-decisions.md` (7 ADRs).
Mémoires Claude clés : `definition-produit-guide-et-outil`, `v3-north-star-episode-images`,
`andalousie-dogfood-seville`, `principe-debloquer-avant-consulter`, `pinchtab-recovery`.

## Statut

- **Dogfood véracité (Chemin A) = RÉUSSI et LIVRÉ.** Chapitre Séville+Jabugo bâti sur destination NEUVE
  (Andalousie 2027, couple, terrain vierge). `validate:fast` exit 0, build vert, **138 tests**.
- **Committé sur la branche `feat/andalousie-seville-dogfood`** (poussée sur origin) :
  - `content(andalousie)` — chapitre Séville (3 récits sourcés, 21 dishes, 20 POIs, 10 images scellées, landmask)
  - `feat(images)` — attribution UI (ImageCredit + câblage + T13/T14)
  - `docs` — storyboard Bourdain + ce handoff
- **PAS mergé sur main** (donc pas déployé). Avant un merge/deploy : voir « dette » plus bas (attribution
  UI manque sur PhotoGrid/episode ; dates voyage placeholder ; budget.json à bâtir).

## Ce qui a été bâti cette session

- **Chapitre Andalousie/Séville** (`src/content/destinations/andalousie/`) : 3 récits Bourdain
  sourcés-vérifiés (El Rinconcillo = convergence Cenando con Pablo 149K + Cosasdecome + bysherezade ;
  Jamones Eiriz = autorités publiques Canal Sur + Agrosfera TVE2 ; Cinco Jotas = singleSourceTrusted +
  flag méga). Dates sources résolues via `curl uploadDate`, jamais inventées. Thème albero/azulejo.
- **10 images scellées match / 0 mismatch.** 2 Unsplash atmosphère (hero, cover) + 8 Wikimedia (CC0/PD/CC-BY).
  **APPRENTISSAGE : Wikimedia Commons > Unsplash pour le niche** (documente le réel ; jamón bellota,
  salmorejo, El Rinconcillo, dehesa, Giralda, espinacas...). Le filet vision a MORDU 4× (serrano≠bellota
  via pancarte prix, Alcázar=éventail, pescaíto=devanture, cover sur-claim fleuve).
  PIÈGE : `fetch-images.mjs` n'a pas de User-Agent → Wikimedia bloque 403/429 → télécharger en curl avec
  UA `chartrandapps-voyage/1.0 (email)` puis écrire sha256/file à la main. Clé Unsplash : `App-Factory`
  (App ID 902055, 50 req/h) — celle de ~/.zshrc était CORROMPUE (`0` au lieu de `O`).
- **Attribution UI** : `src/components/ImageCredit.astro` (auteur + licence liée au deed CC + lien source
  Commons ; tague « Unsplash » au lieu de « unsplash-standard » ; variante overlay hero/cover). Câblé
  FoodieBlock/GemBlock/AccomGrid + Hero/ChapterCover (via `resolveCredit` dans `[dest]/index.astro`).
  Tests T13/T14. **PAS câblé : PhotoGrid (grille CSS, refactor figure dû) + episode/* (Chemin B).**
- **Recherche dramaturgie Bourdain (sourcée crew ZPZ)** + **storyboard** (`storyboard-bourdain-andalousie.md`).

## La grammaire Bourdain (l'épine dorsale de Chemin B)

Arc en **7 phases** : 0 cold open (~22s, désorientant — climax non-linéaire / CONTRADICTION / omission
sensorielle) → 1 arrivée/thèse → 2 le LOCAL (le QUOI, par une personne) → 3 cœur culturel (le POURQUOI,
le Why à l'os) → 4 **INCONFORT (slot OBLIGATOIRE — sépare l'épisode du dépliant)** → 5 contemplatif →
6 clôture sans morale. **Grammaire des segments** : repas-local / marché / plat-MOTIF / historique-inconfort
/ wildcard / contemplatif / rituel. **5 mécanismes de substance** : ① anti-héros vulnérable ② friction/contraste
③ voix off littéraire VS terrain brut ④ le repas = prétexte (cheval de Troie) ⑤ clôture sans morale.

## Définition produit (Martin + Sophie — NE PAS l'oublier)

Le site = **un guide qui met l'eau à la bouche ET un vrai outil de départ.** DEUX registres de 1re classe :
**Épisode** (hook : cold open, friction, voix) + **Carnet** (budget qui s'accumule POIs+restos+hôtels, le
$$$ monte ; logistique ; hébergements). **Le site allume la mèche puis s'efface** — la moitié du fun =
leur découverte sur place (jaser avec les locaux, recherche du soir d'avant). Ne PAS tout pré-mâcher.
L'âme (gens, contemplatif) se VIT au voyage, pas à l'écran. **Le budget/logistique n'est PAS un appendice.**

Le révélé du storyboard : **squelette (recherche desk) vs âme (voyage)**. Le pré-voyage produit le
squelette véridique + la compo + le budget ; le post-voyage = les photos perso de Martin (seul
`claims:place` permis) + ce qu'ils choisissent de reverser (léger). Deux passes.

## PROCHAINE SESSION — Chemin B : le prototype Espagne (EN COURS, on continue)

**On a démarré le proto épisode pour Séville** (pattern proto-Chania d'abord, prouver avant de généraliser).

1. **`src/pages/proto/seville.astro`** — composer l'épisode Séville avec `EpisodeLayout` +
   `components/episode/*` (ScrollyMapSection, SceneSection, CarnetSection), lisant la donnée `andalousie`.
   Composition selon le storyboard : cold open = LA CONTRADICTION (ville joyeuse bâtie sur le château de
   l'Inquisition) ; promouvoir 4-5 POIs wow en scènes (Eiriz, El Rinconcillo, Mercado, Triana) ; **beat
   de friction Phase 4** (le jamón comme test religieux sous l'Inquisition — À SOURCER avant ship) ;
   carnet de bouche en CarnetSection. Voix = québécoise de Martin, PAS un calque de Bourdain.
2. **Golden master** (patron étape 3) pour prouver zéro régression quand on généralisera proto→`[dest]`.
3. **Généraliser** `EpisodeLayout` proto→`src/pages/[dest]/index.astro` (le chunk de rendu reporté).
4. **Budget.json = pilier** : un vrai tableau qui ACCUMULE (hôtels×nuits + restos + entrées Alcázar/Gruta/
   dégustations + char one-way + vols open-jaw), total qui roule, par-base, scénarios (Casares nuitée vs
   dîner ; Jabugo journée vs nuitée). C'est l'outil « ça coûte combien notre affaire ».
5. **Friction = champ éditorial OBLIGATOIRE** par chapitre dans la compo (gardé comme le reste).
6. Attribution UI sur PhotoGrid + episode/* (refactor figure).

## Dette / reste

- Dates voyage Andalousie = placeholders (24 mai→20 juin) — ancrer sur San Antonio Frigiliana (~13-14 juin).
- Cinco Jotas sans photo (rien sur Commons). budget.json + pratique.json andalousie pas bâtis.
- 169 images legacy crete « à sceller » (jaune, hors focus). Plan complet 5-bases Andalousie (Casares=arrêt-dîner).

## Démarrage suggéré

1. Lire ce doc + `storyboard-bourdain-andalousie.md` (surtout §A.0 re-cadrage produit + §C overlay).
2. `cd ~/Developer/chartrandapps-site && git checkout feat/andalousie-seville-dogfood && npm test && npm run validate:fast`.
3. Continuer le proto : `src/pages/proto/seville.astro` (cold open contradiction → scènes → friction → carnet).
   Réf gabarit : `src/pages/proto/chania.astro` + `src/layouts/EpisodeLayout.astro`.
