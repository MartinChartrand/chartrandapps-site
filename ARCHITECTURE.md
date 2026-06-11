# Architecture v2.1 — Pipeline de sites d'itinéraires voyage

**Statut** : RÉVISÉ post stress-test (5 agents adversariaux) + débat 4 personas · 2026-06-11
**Remplace** : approche clone-and-mutate du skill `/voyage-new` v1.0 · draft v2 du même jour
**Artefacts** : stress-test (5 rapports, session 2026-06-11) · débat `crete/debate_2026-06-11T21-55-30Z.md`

**Décisions verrouillées** :

| # | Décision | Choix | Source |
|---|---|---|---|
| 1 | Stratégie images | **Atmosphérique seulement** — aucune image stock ne prétend montrer le lieu exact ; téléchargement + auto-hébergement (licence Unsplash standard, jamais de hotlink) | Martin |
| 2 | Contenu | **Fichiers structurés dans le repo** (content collections Astro, pas de CMS) | Martin |
| 3 | Re-validation dormance | **Jalon T-3 mois** (session manuelle + rappel externe forcé) + **heartbeat GitHub Actions mensuel** ; le cron complet sur le mini est abandonné | Débat 4-0 |
| 4 | Scope migration | **Crète ET Turquie, même session, extracteurs scriptés obligatoires** | Débat + Martin |
| 5 | Stack | **Astro 6.x épinglé, Node 22 LTS, npm épinglé** (mise) | Martin + fact-check |

**Principe directeur** : tout ce qui est mécanique devient un script déterministe versionné ; le jugement (contenu, ton, direction artistique) reste dans le skill et les checkpoints humains. Corollaire appris au stress-test : **chaque validateur rend un verdict à trois états — `vérifié-OK / vérifié-PROBLÈME / invérifiable` — et seul `PROBLÈME` produit du rouge.** Un validateur qui crie au loup en permanence (faux rouge) ou qui passe au vert silencieusement (faux vert) a une valeur négative : on apprend à l'ignorer. Cas vécus : TripAdvisor répond 403 à tout, Booking répond 202 même aux URLs inventées, Nominatim snap les points en mer au rivage le plus proche.

---

## 1. Vue d'ensemble du flux

```
  PHASE CRÉATION (session Claude Code, 1-2×/année)
  ┌─────────────────────────────────────────────────────────┐
  │ Cadrage (checkpoint 1) → agents de recherche → données   │
  │ JSON conformes au schéma → narratif Markdown → curation  │
  │ images (vision-check local) → preview (checkpoint 2) →   │
  │ validateurs → push main (checkpoint 3)                   │
  └─────────────────────────────────────────────────────────┘
                            │ push main
                            ▼
  BUILD & DEPLOY            GitHub Actions : validate:fast → astro build
                            → deploy Pages (chartrandapps.ca, CDN)
                            ▼
  PHASE DORMANTE
  ┌─────────────────────────────────────────────────────────┐
  │ Heartbeat Actions mensuel : commit horodaté → garde le   │
  │ repo actif (règle 60 jours workflows + dépublication      │
  │ Pages ~1 an) et redéclenche un build. Ne valide RIEN —   │
  │ c'est assumé, son seul rôle est de garder les lumières.   │
  └─────────────────────────────────────────────────────────┘
                            ▼
  JALON T-3 MOIS (rappel externe forcé, pas juste Obsidian)
  ┌─────────────────────────────────────────────────────────┐
  │ Session manuelle : revalidate-businesses (agentique) +    │
  │ validateurs complets + corrections + rapport commité.     │
  │ Au moment des réservations = quand la fraîcheur a de la   │
  │ valeur, et hors de la fenêtre des fermetures saisonnières │
  └─────────────────────────────────────────────────────────┘
```

**Pourquoi pas de cron sur le mini** (débat 4-0) : tous ses modes de mort sont silencieux — keychain verrouillé au reboot, auth claude/gh expirée, auto-update du CLI qui change le format de sortie headless — et le canal d'alerte (issue GitHub depuis le mini) partage les points de défaillance de ce qu'il surveille. « L'absence d'un rapport n'est jamais remarquée. » Payer 12 runs/année pour du bruit hivernal (Loutro ferme l'hiver) n'est pas de la diligence.

**Rôle du mini** (recentré) : usine de validation *à la création* et au jalon — scripts lourds, géocodage réseau throttlé, vision-checks — et serveur de preview sur le tailnet. Rien d'inattendu n'y roule sans humain dans la boucle.

---

## 2. Structure du repo

Le repo `chartrandapps-site` devient un projet **Astro 6.x**. URLs publiques préservées à l'identique.

```
chartrandapps-site/
├── astro.config.mjs                     # site: 'https://chartrandapps.ca', PAS de base
├── package.json / package-lock.json    # deps exactes : astro, leaflet, zod — rien d'autre
├── .mise.toml                           # node 22 LTS + npm épinglés
├── ARCHITECTURE.md
├── public/                              # copié verbatim → racine du site
│   ├── CNAME                            # ← déplacé de la racine du repo
│   ├── index.html                       # landing (inchangée)
│   ├── creditcopilot/ track/ vetready/ retake-control/
│   └── crete-septembre.html             # redirect legacy
├── src/
│   ├── content.config.ts                # ⚠ racine de src/ — src/content/config.ts n'existe plus en v6
│   ├── content/destinations/<dest>/     # voir §3
│   ├── assets/destinations/<dest>/      # images téléchargées (originaux)
│   ├── components/                      # §4
│   ├── layouts/Destination.astro
│   ├── pages/[dest]/index.astro         # getStaticPaths → /crete/, /turquie/
│   └── styles/  (tokens.css + themes/<dest>.css)
├── scripts/                             # §6
├── .github/workflows/
│   ├── deploy.yml                       # withastro/action@v6 + actions/deploy-pages
│   └── heartbeat.yml                    # cron mensuel : commit horodaté
└── reports/                             # rapports de jalon, COMMITÉS (historique de santé)
```

Notes de structure issues du fact-check :
- Les dossiers `crete/` et `turquie/` actuels **sortent de la racine** (ils deviennent des routes générées — collision sinon).
- Le dev server Astro **ne sert pas les `.html` de `public/`** (issues #697/#14800) : la validation complète passe par `astro build && astro preview`, pas `astro dev`. Le preview tailnet utilise `preview`.
- Runner CI épinglé (`ubuntu-24.04`, jamais `-latest`).

**Anti-rot** : deps minimales épinglées ; Node ET npm épinglés (le bug npm des `optionalDependencies` natives — lockfile généré sur macOS arm64 qui omet les binaires Linux — se déclenche quand la version de npm change entre deux sessions) ; **rituel de réactivation documenté** : (1) commit no-op pour faire tourner la CI *avant* tout changement — distinguer « le monde a bougé » de « j'ai cassé » ; (2) `mise install && mise trust && npm ci` ; (3) `xcode-select` à revérifier après un upgrade macOS majeur. Le test de réactivation valide J+0, pas J+300 — c'est le heartbeat et le rituel qui couvrent le reste.

---

## 3. Modèle de contenu

Confronté aux deux HTML réels par l'agent migration (12 trous identifiés, 2 fatals) : les colonnes info et les blocs foodie/gems sont des **compositions éditoriales**, pas des filtres de POIs. Le modèle est corrigé en conséquence.

### 3.0 Collections (Content Layer API, Astro 6)

Une collection ne mélange pas JSON et Markdown. Plusieurs collections pointent sur le même répertoire :

```ts
// src/content.config.ts
destinations: defineCollection({ loader: glob({ pattern: '*/destination.json', base: SRC }) , schema: … })
bases:        defineCollection({ loader: glob({ pattern: '*/bases/*.md',       base: SRC }) , schema: … })
pois:         defineCollection({ loader: /* file() par destination ou loader custom fusionné */, schema: … })
// idem dishes, gems, budget, pratique, images (manifests)
```

Les références inter-collections utilisent `reference()` dans les frontmatters ; la syntaxe `[[poi:id]]` dans la prose est résolue par un plugin remark/regex au rendu.

### 3.1 `destination.json`

```jsonc
{
  "slug": "crete",
  "heroTitle": { "main": "Crète", "em": "septembre" },     // h1 composé (réalité v1)
  "heroSub": "Un mois dans le sud de l'île",
  "subtitle": "…", "season": "Septembre 2027",
  "travelers": { "count": 2, "label": "Voyage en duo" },
  "arrival":   { "date": "2027-09-05", "airport": "CHQ", "city": "Chania" },
  "departure": { "date": "2027-10-05", "airport": "HER", "city": "Héraklion",
                 "transfer": { "body": "Héraklion à 82 km / ~1h15…", "links": [{ "label": "Itinéraire", "url": "…" }] } },
  "theme": { "favicon": "🏝️", "palette": "crete" },        // themes/<dest>.css peut définir des tokens additionnels (--gold turc)
  "hero": { "image": "hero", "label": "Itinéraire · Voyage en duo" },
  "overviewIntro": "Un mois, c'est assez pour s'installer…",
  "intro": { "whySeason": "…", "logistics": "…" }
}
```

### 3.2 `bases/<nn>-<slug>.md` — le narratif

Les `<h4>` du curatorial vivent **dans le corps Markdown** (source de vérité unique — l'enum `sections` du draft v2 ne correspondait à aucune base réelle : « L'eau », « Les vallées », « Le point de bascule du voyage »…).

```markdown
---
order: 1
slug: chania
title: Chania
kicker: l'ouest
nights: 8
dates: "5–12 septembre"
focus: "Vieux port vénitien · Quartier Splantzia · Côte sauvage"
subtitle: "La plus belle vieille ville de Crète. Port vénitien…"   # chapter-subtitle ≠ focus ≠ pullquote
summary: "Arrivée, décompression, orientation…"                     # résumé timeline (vue d'ensemble)
pullquote: "Huit nuits à Chania, c'est long exprès…"
cover: chania-cover
access:                       # optionnel — « Comment y accéder » (Loutro, Cappadoce)
  body: "Conduire jusqu'à Chora Sfakion, 1h30… Ferry ANENDYK…"
  links: [{ label: "Horaires ANENDYK", url: "…" }, { label: "Bateau-taxi privé", url: "…" }]
notes:                        # note-box : transitions, logistique, warnings (Fethiye splittée en 3 sous-bases vit ici)
  - { kind: "logistique", body: "Bagages au minimum… Pas de distributeur à Loutro…" }
tagBlock:                     # remplace waterTemp — la nature du bloc varie (eau / météo Cappadoce / quartier Istanbul) ou absent (Rethymno)
  label: "Température de l'eau"
  tags: [{ text: "~24°C début septembre" }, { text: "Côte nord plus agitée", tone: "amber" }, { text: "Côte sud calme", tone: "green" }]
infoBlocks:                   # composition éditoriale ORDONNÉE — pas un filtre par kind
  - { label: "Où manger",            type: "poi-list", items: ["tamam", "chrisostomos", "evgonia"], footer: "Règle d'or : éviter le premier rang…" }
  - { label: "Les plages",           type: "poi-list", items: ["falassarna", "elafonisi", "balos", "seitan-limania"] }
  - { label: "La réalité de Loutro", type: "prose",    body: "Bateaux de jour = groupes de 9h à 18h30…" }
---

## La table
Trois adresses, trois registres. [[poi:tamam]] dans les anciens bains turcs…
```

### 3.3 `pois.json` — la donnée vérifiable (le cœur)

```jsonc
{
  "id": "tamam",
  "base": "chania",
  "kind": "resto",                  // sémantique : hotel|resto|plage|sight|activity|winery|transport…
  "mapType": "resto",               // rendu carte : hotel|resto|plage|sight (4 glyphes) — découplé de kind
  "roles": ["eat"],                 // un lieu peut en avoir plusieurs : Notos = ["sleep","eat"], Blue House = ["sleep","eat"]
  "tier": null,                     // budget|mid|gem — pour roles incluant "sleep"
  "name": "Tamam",
  "blurb": "Anciens bains turcs du XVIe…",
  "signature": "végétarien remarquable — réserver",
  "image": "tamam-table",           // slot dans images.json (resto-img/accom-img — ~25 slots par base en v1)
  "price": { "range": "…", "currency": "EUR", "asOf": "2026-04" },   // un prix sans date est un mensonge en devenir
  "coords": { "lat": 35.5165, "lng": 24.0163, "source": "nominatim", "verifiedOn": "2026-04-16" },
  "links": { "official": "…", "booking": null, "tripadvisor": "…", "maps": "…" },
  "extraLinks": [{ "label": "AllTrails", "url": "…" }],   // la réalité déborde l'enum : ferries, boutiques, directions
  "seasonal": true,                 // fermetures saisonnières attendues — module le verdict de revalidation
  "status": { "open": true, "lastChecked": "2026-06-11", "method": "websearch" },
  "onMap": true
}
```

Règles zod bloquantes : coords obligatoires si `onMap` ; `price.asOf` et `lastChecked` obligatoires ; ids uniques ; chaque `[[poi:]]` et chaque item d'`infoBlocks` doit résoudre ; chaque slot `image` doit exister dans le manifest. **Lint inverse (warning)** : POI jamais référencé par le narratif, un infoBlock, une carte ou un composant = donnée morte qui consommerait du budget de validation à perpétuité.

### 3.4 `dishes.json` et `gems.json` — entités éditoriales

Les foodie/gems ne sont **pas** des POIs : « Port vénitien à 5h30 du matin » n'a ni coordonnée ni statut. Schéma : `{ id, title, body(md), poiRef?: id, links?: [], image: slot }`. Quand un item EST un business (cours de cuisine), `poiRef` le rattache au POI vérifiable.

### 3.5 `budget.json`

`{ statCards: [{ value|computed: "total"|"perPerson"|"perDay", label }], lines: [...], scenarios: [{ name, total, desc }], advice: "(md)" }`. Les totaux affichés sont **calculés** des lignes (le 11 360 $ vs 11 400 $ vécu) ; les stat-cards varient par destination (Turquie affiche « vols transatlantiques », Crète « par personne »).

### 3.6 `images.json`

```jsonc
{
  "slot": "chania-cover",
  "file": "chania-cover.jpg",
  "alt": "Ruelle vénitienne au crépuscule — Crète occidentale",
  "layout": "wide",                 // wide|tall|null — hints photo-grid de la v1
  "claims": "atmosphere",           // atmosphere|place — "place" interdit au stock (lint) ; réservé aux photos perso futures
  "credit": { "source": "unsplash", "photoId": "…", "photographer": "…", "license": "unsplash-standard" },
  "sha256": "…",                    // unicité GLOBALE par contenu (les doublons v1 étaient ENTRE blocs, et un même fichier peut entrer sous 2 noms)
  "visionChecked": "2026-06-11"     // invalidé si sha256 OU alt change depuis le check
}
```

---

## 4. Système de design

**Une identité, des thèmes.** Identité magazine dans `tokens.css` + composants ; chaque destination = une palette (`themes/<dest>.css`, tokens additionnels permis) + un favicon. Dérivées via `color-mix(in oklch, …)` (Baseline 2023 — préciser l'espace de mélange).

Composants (markup v1 corrigé une fois pour toutes, y compris la dérive Rethymno/Fethiye) : `Hero`, `Nav`, `Timeline`, `ChapterCover`, `Pullquote`, `Curatorial` (rend le md, résout `[[poi:]]`), `PhotoGrid`, `Lightbox`, `MapSection`, `AccomGrid` (roles "sleep" par tier), `InfoColumns` (rend `infoBlocks` — composition ordonnée, types poi-list/prose/tags), `FoodieBlock` (dishes), `GemBlock` (gems), `BudgetSection` (totaux calculés), `PratiqueGrid`.

**Cartes — correction du fact-check** : `client:visible` exige un framework UI entier (contradiction avec « deps minimales »). `MapSection` est un composant **`.astro` vanilla** : `<script>` + IntersectionObserver + `import('leaflet')` dynamique au scroll — le pattern v1, conservé parce qu'il était correct, alimenté par les POIs `onMap` au build. Markers générés depuis pois.json (`mapType`), plus jamais d'objet `MAPS` parallèle à la prose.

**Motion, honnêtement** : view transitions cross-document = 2 lignes CSS, coût nul, mais ne touchent que landing ↔ destination (les ancres intra-page sont same-document — zéro effet ; Firefox ne supporte pas encore le cross-document). Le motion perçu vient du scroll-reveal et du soin typographique, pas des transitions. Pas de `<ClientRouter />` (SPA injustifié). `prefers-reduced-motion` partout.

---

## 5. Stratégie images (politique atmosphérique)

1. **Sourcing** : Unsplash licence standard, candidates **téléchargées** — jamais de hotlink (83 hotlinks actifs par site v1 = la cause racine du rot, confirmée au débat).
2. **Vision-check** : chaque candidate regardée (vision LLM) contre slot + alt avant intégration ; re-check si `sha256` ou alt change.
3. **Provenance** : crédit complet dans le manifest (hygiène + réversibilité ToS).
4. **Rendu** : `astro:assets` / pattern officiel `import.meta.glob` (littéral) + lookup depuis le manifest ; sharp natif macOS ; attention au crop par défaut de la v6 sur les variantes responsive.
5. **Direction artistique** : traitement uniforme signature (duotone/désaturation?) — à trancher sur preuve visuelle au checkpoint 2, pas sur papier.
6. **Wikimedia Commons** en source secondaire (monuments) : auto-hébergé + attribution CC en footer.

---

## 6. Toolchain de validation (contrats révisés post stress-test)

Verdicts à trois états partout. Entrée = fichiers de contenu ; sortie = rapport + exit code. Mapping bug vécu → validateur :

| Script | Vérifie | Bug v1 | Où | Notes de conception (stress-test) |
|---|---|---|---|---|
| build (zod) | schémas, refs, ids, slots | dérive markup, refs cassées | CI + mini | bloquant |
| `validate-geo` | **point-in-polygon local contre les water polygons OSM** (déterministe, zéro réseau) ; géocodage Nominatim *seulement* pour POIs nouveaux/modifiés, **sur le mini uniquement**, 1 req/s, UA dédié, requêtes contextualisées (`name + village + countrycodes`), seuils par kind (resto ~100 m, plage/sight ~500 m), trois états (confirmé / introuvable-OSM=warning / trouvé-ailleurs=flag) | markers en mer ×3 | eau : CI ; réseau : mini | ⚠ le reverse-geocode « ≠ eau » du draft v2 était cassé : Nominatim snap au rivage — testé live |
| `validate-links` | HTTP sur **sites officiels seulement** ; TripAdvisor/Booking sur allowlist bot-walled, délégués à la couche agentique | liens morts | mini ; CI = warning jamais bloquant | TripAdvisor 403 sur tout, Booking 202 même sur URL inventée — testés live |
| `validate-images` | manifest complet, **unicité globale par sha256**, `claims:place` interdit au stock, vision-check invalidé sur changement | doublons inter-blocs, hors-contexte ×2 | CI | le check « par bloc » du draft ratait les bugs réellement vécus |
| `revalidate-businesses` | POIs `open:true` re-vérifiés par recherche web (claude headless en **session interactive**, plus jamais en cron) ; verdict 3 niveaux (*open / closed-confirmé-avec-sources / invérifiable*) ; `seasonal:true` module ; sortie JSON validée contre schéma, rapport partiel marqué `INCOMPLETE`, jamais de dégradation silencieuse | business fermés (34 listings) | **jalon T-3 mois, mini, humain dans la boucle** | coût ~5-10 $/run — payé quand la fraîcheur a de la valeur |

Règle générale gravée : **aucun validateur dépendant du réseau n'est bloquant en CI** (la CI valide la cohérence du cache : coords présentes, `verifiedOn`/`lastChecked` non périmés — stale > 6 mois = warning).

---

## 7. Build, deploy & dormance

- **CI deploy** : `withastro/action@v6` + `actions/deploy-pages@v5` (chemin officiel). `site` défini, pas de `base`, CNAME dans `public/`. Runner épinglé.
- **`heartbeat.yml`** : cron mensuel → commit horodaté (`reports/heartbeat.txt`) → garde le repo actif (règle 60 jours + dépublication Pages) ET redéclenche un build. ~21 lignes de YAML, `permissions: contents: write`, garde anti-boucle (`[skip ci]` n'est pas utilisé — le rebuild est voulu). Assumé : il ne valide rien, c'est un pacemaker, pas un médecin.
- **Jalon T-3 mois** : session manuelle complète (revalidation agentique + validateurs + corrections), rapport commité dans `reports/AAAA-MM.md`. **Rappel externe forcé** : événement calendrier + entrée Obsidian — le débat a qualifié la note Obsidian seule de « SLA implicite sur le futur Martin » ; deux canaux.
- **Preview** : `astro build && astro preview` sur le mini, accessible sur le tailnet (le dev server ne sert pas les `.html` legacy de `public/`).

---

## 8. Skill `/voyage-new` v2 (orchestrateur mince)

Les 3 checkpoints survivent. Les sorties changent :

| Phase | v1 (prose → HTML) | v2 (données → build) |
|---|---|---|
| 0 Cadrage | identique | identique + squelette de collection |
| 1 Recherche | agents → markdown libre | agents → **JSON conforme au schéma** (le schéma EST le contrat de sortie) |
| 2 Palette/scaffold | clone 2750 lignes | `themes/<dest>.css` + `destination.json` |
| 3 Contenu | édition HTML in-place | `.md` + `pois.json` + manifests ; rendu garanti par composants |
| 4 Validation | checklists de prose | `npm run validate` (§6) |
| 5 Tests | pinchtab manuel | `build && preview` + parcours pinchtab |
| 6 Deploy | commit direct | push main → CI verte → live (checkpoint 3 avant push) |

Sync Obsidian (note projet + handoff + **création du rappel T-3 mois**) : conservé et étendu.

---

## 9. Migration Crète + Turquie (décision : les deux, même session)

Verdict du débat : la 2e migration ne prouve PAS la répétabilité (sophisme — même auteur, même template ; la vraie preuve sera la première destination *neuve* créée par le skill v2). La raison correcte de migrer Turquie : **une seule interface de maintenance** — au jalon T-3 mois 2027, `revalidate-businesses` s'attend à un `pois.json`, pas à du HTML v1 ; et Turquie v1 porte 83 hotlinks Unsplash qui rotent (« le HTML statique ne rote pas » est faux, vérifié).

1. **Extracteurs scriptés obligatoires** (condition du débat — pas de copier-coller manuel) : HTML v1 → pois.json (depuis les objets `MAPS` + croisement prose), images.json (download des 83 hotlinks + sha256), narratif (curatorial → md), budget/pratique.
2. Ordre : **Crète d'abord** (écrit ET rode les extracteurs), **Turquie immédiatement après** dans la même session (~3-4 h estimées une fois les extracteurs rodés — si c'est beaucoup plus long, le pipeline a un bug à corriger avant toute 3e destination).
3. Critère d'acceptation : parité visuelle ou mieux (screenshots avant/après au checkpoint), validateurs verts (la revalidation business trouvera du nouveau rouge — c'est le but), URLs identiques, redirect legacy conservé.
4. La v1 reste taguée (`v1-single-file`) — rollback trivial. Bascule en un seul push.

---

## 10. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Rot npm/lockfile cross-platform | deps minimales ; node ET npm épinglés (mise) ; rituel de réactivation : commit no-op → CI d'abord |
| Rot des workflows Actions (actions dépréciées, runners retirés) | versions épinglées partout ; le heartbeat fait tourner la chaîne chaque mois — une casse se voit en semaines, pas à J-90 du voyage |
| Dormance GitHub (workflows désactivés à 60 j, Pages dépublié ~1 an) | heartbeat qui commit = repo actif + rebuild mensuel |
| Jalon T-3 mois oublié | rappel calendrier externe + note Obsidian (deux canaux) |
| Nominatim rate-limit/politique | géocodage réseau sur le mini seulement, cache `verifiedOn`, jamais bloquant en CI |
| Faux rouge / faux vert des validateurs | verdicts à 3 états ; bot-walled sur allowlist ; `seasonal` ; sorties JSON schématisées |
| Migration révèle des trous de contenu | 12 trous déjà trouvés par le stress-test et intégrés au §3 ; le reste émergera aux extracteurs |
| Dérive du narratif vers le générique | ton québécois = critère de checkpoint humain, pas automatisable |

---

## 11. Questions réglées & restantes

**Réglées** : `reports/` → **commité** (historique de santé + le heartbeat y écrit) · cron mini → abandonné (débat 4-0) · scope migration → les deux (débat + Martin) · politique tags/infoBlocks/gems → schéma §3 corrigé.

**Restantes (défaut = non, on en reparle sur besoin réel)** :
1. Page index `/voyages/` listant les destinations — pas dans le scope v2.
2. Mécanisme de correction par les amis (modèle Atlas Obscura) — pas dans le scope v2 ; AUCUN accommodement spéculatif dans les composants (c'est exactement comme ça que le markup bâtard naît).
3. Traitement visuel signature (duotone/désaturation) — décision au checkpoint 2 sur preuve visuelle.
4. Post-voyage (photos perso, corrections terrain) — `claims:"place"` existe déjà dans le schéma ; le reste hors scope.
