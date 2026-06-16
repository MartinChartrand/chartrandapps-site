# HANDOFF — Portugal 2027 (nouveau voyage, format épisode)

## ⏩ MISE À JOUR 2026-06-16 (matin/jour) — SITE COMPLET 5/5 + Phase 1b vérifiée

**État réel maintenant** (branche `portugal-episode`, build vert, validate:fast exit 0) :
- ✅ **Les 5 épisodes sont bâtis et committés** (Porto `496c61a`, les 4 autres `76abcd8`) — container + 5 scrollytelling complets, voix Martin/Bourdain.
- ✅ **36 images auto-hébergées, vision-check 36/36 MATCH** (`1b6316f`) — Unsplash + Wikimedia CC (vrais plats portugais + Comporta). Hook turquoise (William V) validé Checkpoint 2 par Martin. Palette azulejo approuvée.
- ✅ **landmask + validate-geo 41/41 OK** (`289e4d8`).
- ✅ **Phase 1b provenance FAITE et vérifiée adversarialement** (2 workflows, ~5M tokens) → résultats dans **`docs/v3-design-research/portugal-provenance-1b.json`** :
  - **`ready` (31)** : story + ≥2 sources convergentes (ou singleSourceTrusted) VÉRIFIÉES, récit fidèle → à appliquer tel quel.
  - **`fixable` (46)** : sources valides, mais le récit brouillon hallucinait → **réécrire le `story`** ancré sur `divergentDetail` (faits confirmés) en retirant ce que `fixNote` pointe. NE PAS re-sourcer (sources déjà vérifiées).
  - **`rejected` (14)** : agrégateur/URL morte/pas de 2e source → **story reste VIDE** (honnête).

**⚠️ Rien n'est appliqué au JSON encore.** Aucune `story` posée → build reste vert (garde provenance = no-op). Dès qu'on pose une `story`, il FAUT `approvedBy:"human"` + ≥2 sources sinon build ROUGE.

**PLAN DE REPRISE Phase 1b → prod :**
1. Appliquer les 31 `ready` (story + sources) dans pois/dishes/gems.json. Réécrire les 46 `fixable` (utiliser `fixNote`+`divergentDetail`), les appliquer. Laisser les 14 `rejected` sans story.
2. **Soumettre la liste à Martin pour approbation** (par base). Sur son GO → poser `approvedBy:"human"` sur les approuvées.
3. `npm run validate:fast` exit 0 (la garde provenance valide tout `story`).
4. **Checkpoint 3** (décision Martin) → merge `portugal-episode` → `main` → CI → live `chartrandapps.ca/portugal/`. ⚠️ Vérif iPhone Safari avant (pinchtab=Chromium).
5. Sync Obsidian + jalon T-3 mois.

Single-source restant noté : Sueste/Ferragudo = REJETÉ par la vérif (Portugal Resident 403). Ferragudo le village a sa propre provenance ailleurs.

**Le reste de ce document = état du 2026-06-15 (fondation), conservé pour référence.**

---

**Date** : 2026-06-15 (session soir)
**Statut** : 🟡 EN CONSTRUCTION — fondation posée, build vert visé, **PAS encore renderable** (épisodes + images à venir)
**Branche** : `portugal-episode` (isolée de `crete-episode` ; ne PAS pusher sur `main` avant Checkpoint 3)
**Reprise** : demain matin, au Checkpoint 2 (preview du hero)

---

## Ce que c'est

Nouveau voyage **from-scratch #4** (après Cyclades, Crète, Philippines, Andalousie). Construit **directement en format ÉPISODE** (container + un scrollytelling par base), jamais v2.

- **Destination** : Portugal continental, 100% terrestre, arc **Nord → Sud**
- **Voyageurs** : couple (on/nous, jamais nommés — registre public)
- **Dates** : mi-mai → mi-juin 2027, **~30 nuits** (arrivée Porto OPO 15 mai, départ 14 juin)
- **Mode** : exploratoire (le conflit de dates avec la Crète mi-mai-juin 2027 est assumé — pas coulé dans le béton)
- **Angle obligatoire** : bouffe des locaux + eau cristalline en foreground, histoire en backdrop

## Spine verrouillé (validé Martin, Phase 0)

| # | Base (slug) | Nuits | Dates 2027 | Focus |
|---|-------------|-------|-----------|-------|
| 1 | Porto (`porto`) | 5 | 15→20 mai | Ville-fleuve, francesinha, fruits de mer Matosinhos, tascas |
| 2 | Vallée du Douro (`douro`) | 3 | 20→23 mai | Quinta, vin à la source, cabrito, cerises *(exception 5n assumée)* |
| 3 | Lisbonne (`lisbonne`) | 7 | 23→30 mai | Tascas, Ramiro, day-trips Setúbal/Sesimbra |
| 4 | Comporta + Alentejo côtier (`comporta`) | 5 | 30 mai→4 juin | Plages sauvages, porc preto, vin Alentejo |
| 5 | Algarve de l'ouest (`algarve`) | 10 | 4→14 juin | 2 ancrages : Sagres sauvage → Lagos/criques, slow finish |

⚠️ **Départ** : pas de transatlantique direct depuis Faro (FAO). Deux options notées (FAO escale OU remonter à Lisbonne LIS ~2h45). À trancher à la planif réelle.

## Décisions verrouillées (ne pas re-litiger)

- **Budget** : « plus serré » ~**14-15k CAD** → hébergement budget-mid, on SAUTE les hôtels design (Memmo Alfama, Torel, Santa Clara, Vivenda Miranda) + le Michelin DOC by Rui Paula. Bouffe de locaux intacte. Douro = quinta abordable (Quinta de la Rosa/Ventozelo ~115-200€), PAS Vallado en vedette. Taux **1 € ≈ 1,62 $ CAD**.
- **Single-source** (Sueste à Ferragudo, Taberna do Mar à Lisbonne) : **recroiser en Phase 1b** avant de trancher (2e source indép. → garder ; sinon badge ou couper). Zéro pose sans vérif.
- **Palette** : azulejo bleu + terracotta + crème chaud + note dorée (PROPOSITION — valider visuellement au Checkpoint 2).

---

## Fichiers créés (état au handoff)

**✅ Faits par la boucle principale (voix Martin / calibrage) :**
- `src/styles/themes/portugal.css` — palette (proposition)
- `src/layouts/Destination.astro` — import du thème portugal ajouté (ligne ~85)
- `src/content/destinations/portugal/destination.json` — hook container + 5 tuiles + logistique + intro saison
- `src/content/destinations/portugal/budget.json` — ~14 930 $ CAD, taux 1,62
- `src/content/destinations/portugal/pratique.json` — 9 blocs

**✅ Faits par agent de données (Sonnet) — VÉRIFIÉS + COMMITTÉS (`97042c3`) :**
- `pois.json` (42 POIs) · `dishes.json` (32) · `gems.json` (24) — **98/98 valides au schéma**, build vert, KMLs générés, provenance no-op.
- Sans champ `story` — provenance + `approvedBy:human` à brancher en 1b.
- Notes agent : `lisbonne-bifanas-afonso` = onMap:false (pas de coords confirmées) ; Lisbonne n'a qu'un hôtel mid validé (Solar dos Mouros) → chercher un budget + un gem à la reprise ; Vallado exclu (hors budget), Quinta de la Rosa (gem) + Ventozelo (mid) retenues au Douro.

**📂 Recherche brute (gitignorée, `.research/`) :** porto.md, douro.md, lisbonne.md, comporta.md, algarve.md — 5 dossiers complets (hébergements, restos, plages, foodie, gems, candidats sources créateurs, candidats Unsplash NON validés, narratif, pratique).

**❌ PAS encore faits :**
- `bases/*.md` (0/5) — frontmatter + corps (référencent les ids de POIs)
- `episodes/*.json` (0/5) — le scrollytelling (coldOpen/scenes/montage/carnet/outro) — **L'ÉDITORIAL, le produit**
- `images.json` + download + vision-check (0 image) — slots référencés : `hero`, `algarve-marinha` (hookImage), `<base>-cover` ×5, + slots POIs/dishes/gems (= leur id)
- `scripts/data/land/portugal.geojson` (landmask, requis par validate-geo en Phase 4)

---

## Plan de reprise (ordre exact)

1. ~~Vérifier la donnée agent~~ ✅ FAIT (committé `97042c3`, 98/98 valides). À la reprise : juste compléter Lisbonne (1 hôtel budget + 1 gem manquants).
2. **Base Porto** (`bases/01-porto.md`) + **épisode Porto** (`episodes/porto.json`) — clone du gabarit OR `crete/episodes/chania.json` et `crete/bases/01-chania.md`. Référencer les ids de POIs réels. **C'est l'épisode RÉFÉRENCE** : on le prouve avant de cloner ×4.
3. **Images Porto + hero + hookImage** : candidats Unsplash dans `.research/porto.md` + `.research/algarve.md` (Praia da Marinha). Workflow : résoudre long IDs (curl redirect) → `images.json` → `fetch-images.mjs portugal` → `vision:images portugal` (zéro mismatch exigé). Méthode groundée — voir mémoire `sourcing-images-unsplash-grounded` (404 = ID fabriqué ; 200 ≠ match sémantique ; grille HTML pinchtab pour le match visuel).
4. **CHECKPOINT 2** — `npm run build && npm run preview` → screenshot hero `/portugal/` → valider palette + structure avec Martin. ⚠️ pinchtab = Chromium, pas Safari : pour le vrai rendu iOS, passe iPhone de Martin (mémoire `verif-ios-simulateur-xcode`).
5. **Cloner les 4 autres épisodes** : Douro, Lisbonne, Comporta, Algarve (bases md + episodes json + images + vision). Le plus gros morceau d'éditorial.
6. **Phase 1b — provenance** : remplir les `story` (POIs/dishes/gems vedettes) avec ≥2 sources indépendantes convergentes (ou singleSourceTrusted), recroiser les single-source, puis **approbation explicite Martin** → poser `approvedBy:"human"`. La garde `validate-provenance` mord sur tout `story` rempli.
7. **Phase 4 — landmask + validate** : `npm run make:landmask -- portugal` (ou placeholder bbox), `node scripts/validate-geo.mjs portugal`, `npm run validate:fast` exit 0, grep 0 hotlinks Unsplash dans dist.
8. **CHECKPOINT 3** — validate:fast vert + approbation Martin → merge `portugal-episode` → `main` → CI verte → vérifier live `chartrandapps.ca/portugal/`.
9. **Sync Obsidian** : `Voyage-Portugal-2027-Duo.md` + ce handoff. Jalon T-3 mois (rappel calendrier externe).

---

## Pièges / notes

- **Garde provenance** : ne mord QUE sur pois/dishes/gems avec `story` non-vide (≥60 car. + ≥2 créateurs distincts OU singleSourceTrusted + approvedBy:human). Les `sources[]` des épisodes ne sont PAS gardées offline — mais on les remplit quand même (Maps/officiel, comme la Crète).
- **Slots images** : un slot référencé mais absent d'`images.json` = trou au rendu (pas un build rouge zod, mais visible au preview). Tout brancher avant Checkpoint 2/3.
- **Agent de données** : a reçu pour consigne tier budget-mid, image slot = id du POI, coords de la recherche (onMap:false si pas de coords), prix EUR + CAD inline. Vérifier qu'il a bien respecté (surtout onMap⇒coords, tier si sleep, enums).
- **Sources fiables découvertes** (par destination, pas hardcodé) : Porto = Taste Porto × Mark Wiens, Portoalities, Culinary Backstreets. Douro = Portoalities, Nelson Carvalheiro. Lisbonne = Mark Wiens, Olá Daniela. Comporta = Espirito da Comporta, Olá Daniela (zone sous-documentée). Algarve = Olá Daniela (aucun YouTubeur local ouest confirmé).
- **Unsplash** : Comporta très pauvre (doublures honnêtes nécessaires, alt qui ne ment pas). Algarve riche (Benagil/Marinha iconiques, 29 candidats déjà fetch sans hallucination). Porto/Douro/Lisbonne OK.

## Mémoires à charger en premier à la reprise
`contenu-sensoriel-bouffe-plages`, `format-episode-standard`, `sourcing-images-unsplash-grounded`, `style-imagerie-voyage`, `prix-cad-partout`, `zero-raccourci-verifier-100`, `principe-cloner-pas-reinventer`, `registre-public-voix`, `gestion-limites-session`.
