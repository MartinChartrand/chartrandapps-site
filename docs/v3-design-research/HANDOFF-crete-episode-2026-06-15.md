# HANDOFF — Crète convertie en ÉPISODE, déployée (session 2026-06-15)

**Écrit en fin de session. Autoportant.** Remplace `HANDOFF-2026-06-14-cyclades-syros-wip.md` comme handoff courant.
Contexte profond : `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoires Claude `contenu-sensoriel-bouffe-plages`,
`crete-conversion-episode`, `sourcing-images-unsplash-grounded`, `format-episode-standard`.

## Statut — FAIT + EN PROD

La **Crète est complète 4/4 en format épisode** et **déployée** : `https://chartrandapps.ca/crete/`
(container survol + `/crete/chania`, `/crete/loutro`, `/crete/sitia`, `/crete/rethymno`).
Branche `crete-episode` = `main` (mergée FF). Commits clés : `e5d2168` (conversion 4/4),
`f7a8904` (saison + 17 blurbs), `421e595` (fix Glyka Nera). `npm run audit` VERT.

## Ce qui a été bâti cette session

- **3 épisodes** (`src/content/destinations/crete/episodes/{loutro,sitia,rethymno}.json`) — Chania était
  déjà rendu. Chacun : cold open (2 beats) + 5 scènes storybook (ancrées POI réels) + montage + carnet + outro.
- **19 images fraîches** sourcées (Unsplash groundé) + vérifiées pixel une à une, scellées `match`.
  **Purge de 60 fichiers v2 menteurs** ; `images.json` Crète : 89 → 29 slots (1:1 fichier↔slot).
- **17 blurbs POI vides remplis** (Rethymno 7 + Sitia 7 + Loutro 3) — le carnet rend `p.blurb` direct.
- **Saison corrigée septembre → mi-mai-juin 2027** partout (réécriture sémantique : dates, eau ~19→23°C,
  foules d'avant juillet, lumière solstice, produits début d'été). Dates : arrivée Chania 15 mai,
  départ Héraklion 14 juin (Chania 15-23 mai · Loutro 23-29 mai · Sitia 29 mai-7 juin · Rethymno 7-14 juin).

## Patterns / pièges verrouillés cette session

- **Sourcing image groundé** : fan-out Sonnet → WebSearch (`allowed_domains:["unsplash.com"]`) → WebFetch la
  page-photo → og:image CDN (`photo-<digits>-<hex>`) + photographe + **tag de lieu** → curl-valide (404=fabriqué)
  → download `?q=80&w=2400&fit=max` → **Opus Read chaque pixel + verdict**. Curl brut sur Unsplash = bot-bloqué.
- **Fidélité (règle Martin)** : lieu EXACT si sur Unsplash (tag confirmé), sinon doublure honnête NON-ICONIQUE,
  alt qui ne nomme JAMAIS un mauvais lieu. REJETER les doublures reconnaissables (Elafonisi, Agios Nikolaos…).
- **Mécanique du sceau** : `visionCheckedSemantic = {sha256, alt, verdict, checkedAt}`. La garde offline
  (`validate-image-claims`) est ROUGE sur tout `mismatch` ET vérifie TOUT le manifeste — un slot menteur non-rendu
  bloque quand même. Donc : purger/supprimer les slots menteurs, pas juste ne pas les rendre.
- **Carnet** = `p.blurb` / `di.body` / `ge.body` direct → vérifier les blurbs vides à chaque base.
- **content-parity.test.mjs** : retirer une destination épisodique de `DESTINATIONS` (sinon 3 tests parité v2 rouges).
- **Deploy** : push `crete-episode:main` (FF) → Pages auto. `npm run audit` = gate. **Vert ≠ fini.**

## Dette honnête (à dire à Martin)

- **Rendu jamais vu par l'agent** : pinchtab mort, sim iOS pas booté cette session. Validé images + HTML, PAS le
  scrollytelling à l'écran ni la perf Safari iPhone. → passe iPhone de Martin recommandée.
- **6 images = doublures honnêtes** (Finix, Xerokampos, Kato Zakros, Sitia-ville, Korakas, patio d'Avli, dakos) :
  lieu/plat exact absent d'Unsplash. Alts ne mentent pas. Photos perso au prochain voyage si on veut l'exact.
- Vignettes carnet par item = NULL (rangées texte+pills, comme Chania).

## Prochaine session — démarrage suggéré

1. Lire ce doc + `docs/CONTRAT-MACHINE-A-SAUCISSE.md` + mémoire `crete-conversion-episode`.
2. `cd ~/Developer/chartrandapps-site && npm run audit` (doit être VERT).
3. **PROCHAIN GROS CHANTIER : la TURQUIE** — même conversion v2 → épisode. **Prévoir la même dette d'images v2**
   (manifeste probablement aussi pourri qu'était la Crète : re-sourcer FRAIS toutes les bases, fan-out groundé +
   fidélité + purge). Vérifier d'abord `node scripts/validate-image-claims.mjs turquie` pour mesurer le rouge.
4. Optionnel : revoir l'Andalousie en prod sous l'angle oomph (bouffe+eau en vedette).
