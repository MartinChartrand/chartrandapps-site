# Généralisation v3 — Décisions

*Généré le 2026-06-13 via /persona-debate*
*Personas : Sophie (épicurienne), Marco (visiteur froid), Dre Léa (intégrité/provenance), L'Architecte (faisabilité dev solo)*
*Experts invités : aucun*
*Contexte : le prototype Chania v3 a passé le dogfood (GO 2026-06-13). On généralise le proto en pipeline réutilisable pour le skill /voyage-new.*

---

## Décision 1 : Schéma de contenu v3 — additif Zod, jamais mutatif

- **Décision :** Ajouter aux schémas Zod (`scripts/lib/schemas.mjs`), tous `.optional()` : `story` (POI + dish), `sources: [{creator, url, date}]`, `verified_at` (ISO_DATE, distinct de la date de source), `stale` (booléen), `single_source_trusted` (booléen), `type` (enum `plat|vin|bière|alcool|produit`), `region`. La règle de convergence ≥2 et tout enforcement vivent dans le **skill + un validateur CI**, JAMAIS dans le Zod de build.
- **Rationale :** Les fichiers de contenu existants (Crète, Turquie) n'ont pas ces champs ; `.optional()` garantit que les 94 tests et le build restent verts. Une `superRefine` qui exige `sources` casserait le contenu existant.
- **Garde-fou critique (Architecte) :** `stale` ne se DÉRIVE JAMAIS dans le Zod (pas de `superRefine` qui calcule `now - verified_at > 24mois`). Un schéma qui dépend de `Date.now()` rend le build non-déterministe — vert aujourd'hui, rouge dans 25 mois, casse un heartbeat sans qu'on touche à rien. `stale` est une donnée ÉCRITE par le pipeline/script de revalidation, LUE au build. `verified_at: z.string().regex(ISO_DATE)` réutilise la constante existante (ligne 15), zéro invention.
- **Persona check :** Architecte OK (trivial, ~3h). Léa OK avec réserve : le validateur CI doit échouer **fort** (build rouge), pas un warning. Sophie : exige une longueur minimale sur `story` — un narratif vide est pire que rien, le POI ne s'affiche pas. Marco : « m'en câlisse du schéma » — mais ça doit PARAÎTRE à l'écran.

## Décision 2 : Provenance & convergence — la règle d'intégrité

- **Décision :** Une reco publiable exige **≥2 sources INDÉPENDANTES** OU le statut `single_source_trusted` (1 créateur d'autorité vérifiée : présence physique documentée, spécialisation cuisine locale, date récente) **affiché explicitement dans l'UI**. `verified_at` distinct de la date de source ; flag `stale` après 24 mois → avertissement UI. Les destinations peu couvertes tombent gracieusement en `single_source_trusted` plutôt que d'être bloquées.
- **Critère opérationnel d'indépendance (Léa) — trois conditions CUMULATIVES :**
  1. **Antériorité temporelle disjointe** — visites documentées à des séjours différents (le skill compare la date de VISITE, pas de publication ; même fenêtre étroite = suspicion de tournée sponsorisée / même fixer).
  2. **Absence de citation croisée VÉRIFIÉE** — le skill cherche activement si B mentionne/cite/lie A ; une seule occurrence = convergence invalidée → retour à `single_source_trusted`.
  3. **Divergence du détail concret (le critère décisif)** — le skill extrait les marqueurs de spécificité de chaque source et exige ≥1 détail concret NON partagé. Deux vécus réels divergent (l'un parle du poulpe, l'autre du vin en pichet ébréché) ; deux copies d'une listicle répètent le même vocabulaire générique (« hidden gem », « authentic », « best in town »). Sans ce critère, ≥2 prouve juste « deux onglets ouverts », pas l'indépendance.
- **Rationale :** La promesse centrale du projet = local-secrets authentiques, pas du SEO recyclé. La convergence sans test d'indépendance devient une formalité satisfaite par deux sources qui se copient.
- **Persona check :** Léa OK (« la gestion du temps est enfin dans le sang du modèle »). Architecte OK (`single_source_trusted` = booléen déclaratif ; le seuil 24 mois est une constante du script `revalidate.test.mjs` existant).

## Décision 3 : Pipeline = générateur de CANDIDATS, jamais de publication

- **Décision :** Le pipeline carnet de bouche DÉCOUVRE et propose des candidats ; aucune reco ne se publie sans validation humaine explicite (`approved_by: human`, jamais `auto`). Le skill refuse de produire une reco sans `sources[]`, même en brouillon. Un test CI offline refuse un POI avec `story` rempli mais sans `approved_by`.
- **Rationale (Léa) :** Automatiser la *recherche* est légitime ; automatiser la *sélection* sans filtre humain fabrique exactement le contenu (les mêmes 12 adresses TripAdvisor) que le projet prétend détruire — et personne s'en rend compte avant 6 mois.
- **Persona check :** Léa OK (« le garde-fou qui empêche le projet de devenir TripAdvisor reformaté en silence — ne le rends jamais optionnel »). Architecte OK (champ déclaratif + test offline déterministe).

## Décision 4 : Sourcing créateurs SANS scraping de transcripts YouTube

- **Décision :** TUER le scraping de transcripts YouTube. À la place : WebSearch (`créateur + destination + "must eat"`), extraction des mentions par Claude, `url` + `date` stockées dans `sources[]`, validation par **visionnage one-shot obligatoire et tracé** (`verified_at`).
- **Rationale (Architecte) :** Pas d'API transcripts officielle stable ; les libs npm cassent à chaque déploiement YouTube ; ToS interdit l'accès automatisé ; transcripts auto-générés = bruit non ponctué. En dormance de 6 mois, la lib est stale et tu le découvres au pire moment. WebSearch + validation manuelle = même résultat, zéro fragilité. Bénéfice net : chaque source = un lien cliquable de plus (critère CI) + un hook narratif (« Wiens en a fait un épisode »).
- **Réserve levée (Léa) :** la `url` dans `sources[]` doit pointer vers le contenu **PRIMAIRE** du créateur (sa vidéo, son post original), JAMAIS vers un agrégateur tiers qui le cite — sinon on source la version SEO-optimisée, pas le vécu. Visionnage one-shot obligatoire, pas optionnel.
- **Persona check :** Architecte OK (« tu retires la seule dépendance fragile du lot »). Léa : réserve résolue par la contrainte URL primaire.

## Décision 5 : Carnet de bouche — vision-check sémantique + honnêteté photo

- **Décision :** Les 5 exigences du carnet (recherche dédiée par région, narratif par plat, histoire par POI, photo PAR plat, hébergement vedette raconté). Nouveau champ `visionCheckedSemantic` (date) écrit par un **script réseau** `scripts/validate-dish-images.mjs` (appel Claude vision one-shot) qui valide sémantiquement « cette image montre-t-elle un plat appétissant correspondant à l'alt ? ». Sources VISIBLES dans l'UI (« Mark Wiens, 2024 » + lien).
- **Architecture obligée (Architecte) — calquée sur le précédent `validate-links` :**
  - L'appel Claude vision vit dans un script RÉSEAU, **jamais** dans `npm test` ni `validate:fast` (sinon les 94 tests explosent : réseau + API key + non-déterministe + coût/run). Catégorie `validate:full` au mieux.
  - Un test OFFLINE dans `scripts/test/` vérifie la **présence** du champ : tout dish/poi avec `story` non-vide → son slot image a `visionCheckedSemantic` présent. Pure lecture JSON, déterministe, s'ajoute aux 94 sans réseau.
  - `visionCheckedSemantic` s'INVALIDE si `sha256` OU `alt` change (même règle que `visionChecked` actuel) — sinon on recrée le faux vert.
- **Rationale :** Le `visionChecked` actuel est un FAUX VERT (bug alts Chania : feta taggée « loukoumades », sha256+alt corrects mais sémantique fausse). Premier cas de test du nouveau script = corriger le bug Chania.
- **Persona check :** Sophie (« la photo qui me fait montrer l'écran à Martin en disant ON VA LÀ ») : placeholder honnête > photo stock. Marco : sources visibles, pas cachées en métadonnées. Architecte : réserve levée par la séparation script-réseau / test-offline. Léa OK (« le test acide rendu public »).

## Décision 6 : Composants paramétrés — décliner l'épisode sans copier-coller

- **Décision :** Découper `chania.astro` (~950 lignes autoportantes) en : `EpisodeLayout.astro` (topbar, progress, `<script>`, CSS — 0 duplication) + `<ScrollyMapSection>`, `<SceneSection>`, `<CarnetSection>`. Le **frontmatter éditorial** (scenes, mapBeats, montageBeats, narrative) RESTE par page-chapitre — c'est le produit (un épisode), pas de la dette. KML = route dynamique `src/pages/[dest]/[base].kml.ts` via `getStaticPaths`.
- **Garde-fou critique (Architecte) :** le CSS de l'épisode reste **GLOBAL, non scopé** (`is:global` ou `.css` importé en frontmatter). L'IntersectionObserver observe `.beat-card`/`.beat-quote` — sélecteurs qui MEURENT si Astro les hash. Ajouter un **test de garde** qui assert que le CSS reste non scopé, sinon dans 6 mois un refactor « propre » re-scope les styles et casse silencieusement le flyTo (même classe de bug que la leçon Leaflet v2).
- **Rationale :** Le `<script>` (~200 lignes) et le CSS (~450 lignes) du proto sont DÉJÀ génériques (classes + data-attributes, zéro hardcode « chania »). Sans découpage, le 2e chapitre = copier-coller de ~1272 lignes — la dette dormance #1.
- **Pré-requis :** confirmer `output: 'static'` dans `astro.config.mjs` (getStaticPaths l'exige — quasi certain vu que le KML actuel est un endpoint statique).
- **Persona check :** Marco (« la carte qui bouge pendant que je lis, c'est ÇA qui me retient — si ça lag je crisse ça là ») : la fluidité mobile est le critère de rétention. Architecte OK (~1j découpage, puis 2-3h/chapitre).

## Décision 7 : Intégration au skill /voyage-new

- **Décision :** Le skill scaffolde les champs v3 optionnels dans les JSON générés, exécute la passe carnet de bouche, et fait la recherche web de sources. Il **ENFORCE `sources[]`** (refuse une reco sans, même en brouillon). Composants + KML = code de rendu, HORS skill. Le skill est **agnostique aux noms de créateurs** (panel découvert par destination, jamais hardcodé Wiens/Sonny).
- **Rationale (Léa) :** si le skill ne force pas le passage par les garde-fous (sources, convergence), on aura un pipeline d'écriture qui les contourne sous pression de temps. Le panel par destination règle aussi le problème des destinations peu couvertes (pas les 3 mêmes vedettes partout).
- **Persona check :** Léa OK. Architecte OK (frontière contenu/rendu correcte ; réserve mineure : panel en paramètre, pas hardcodé).

---

## Ordre de livraison (réordonné par l'Architecte)

1. **Schéma additif** (ADR-1/2/3, ~3h) — débloque tout, zéro risque. Commit isolé.
2. **KML généralisé** (ADR-4 routing, ~30min) — valeur terrain immédiate, trivial.
3. **Composants + test de garde CSS-global** (ADR-6, ~1j) — la dette dormance #1.
4. **Vision-check sémantique** (ADR-5, ~½j) — le garde-fou AVANT le contenu qu'il garde. Corrige le bug alts Chania comme premier cas de test.
5. **Skill scaffolding + passe carnet + WebSearch sources** (ADR-7, 2-4h) — le sourcing créateurs (ex-scraping) est FONDU ici, plus une étape séparée.
6. **Pipeline carnet sur la Crète** (ADR-2 contenu) — maintenant que le filet (#4) existe.

**Réordonnancement clé :** le vision-check (4) passe AVANT le pipeline carnet (6) — livrer le pipeline avant son garde-fou = recréer le faux vert Chania à l'échelle.

---

## Tensions résolues

- **Sophie (richesse) ↔ Léa (rigueur) :** résolu par ADR-3 (pipeline = candidats, validation humaine) + ADR-5 (longueur min `story`, photo honnête). On a du volume riche MAIS filtré.
- **Marco (hook) ↔ Léa (substance) :** résolu par ADR-5 (sources visibles dans l'UI = le spectacle EST la preuve) — le hook et la provenance se renforcent au lieu de s'opposer.
- **Ambition ↔ faisabilité solo :** résolu par ADR-4 (kill scraping) + ADR-6 (composants) — l'ambition narrative survit, la dette technique fond.

## Insights surprenants

- **Le kill du scraping SIMPLIFIE le projet** au lieu de l'amputer : le sourcing créateurs devient du travail éditorial (WebSearch + visionnage) fondu dans le skill, sans étape technique fragile séparée.
- **Le critère 3 de Léa (divergence du détail concret)** est le seul qui démasque l'écho-chambre — un test que ni le schéma ni un compte de sources ne peuvent faire ; ça doit vivre dans le jugement du skill.
- **`stale` calculé en Zod aurait été une bombe à retardement** identique à celle qu'on vient de désamorcer côté CI (Node 24) : un build qui pourrit tout seul dans le temps sans changement de code.

## Red flags résiduels (non bloquants, à respecter à l'implémentation)

- Le validateur CI de `sources[]` doit échouer FORT (build rouge), pas un warning (Léa).
- La `url` de source pointe vers le contenu PRIMAIRE du créateur, jamais un agrégateur (Léa).
- L'appel Claude vision reste hors `validate:fast` (Architecte).
- Test de garde que le CSS épisode reste non scopé (Architecte).
- Confirmer `output: 'static'` avant le KML dynamique (Architecte).
