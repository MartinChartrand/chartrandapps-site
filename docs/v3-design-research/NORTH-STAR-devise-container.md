# NORTH STAR — Container devise & taux de change

**Statut** : 🌟 NORTH STAR — design capturé, **PAS encore bâti**. À construire dans une **session dédiée** (décision Martin 2026-06-16).
**Origine** : après le sweep CAD manuel ×3 sites (Portugal `8132f77`, Cyclades+Andalousie `d0a034c`) — la douleur manuelle a prouvé le besoin.
**Objectif Martin (verbatim)** : « un mécanisme dans le background qui check les exchange rates et met tous les prix à jour … qu'on puisse avoir une idée claire du coût potentiel d'un voyage dans le pays. Ça doit être agnostique du code de chacun des sites. »

---

## 1. Le vrai problème (cause, pas symptôme)

Aujourd'hui **on stocke de l'argent FORMATÉ** : `price.range = "~55–75 €/nuit (~CAD 90–120)"`. Le CAD est cuit dans une string. C'est la faute de base en finance/i18n : on stocke jamais le montant déjà converti.

Conséquences observées :
- **Dette manuelle** : chaque changement de taux = re-sweeper toutes les strings de tous les voyages (vécu 2× cette session).
- **Incohérence** : taux gelés différents selon quand le site a été bâti (1,50 vs 1,62).
- **Zéro source de vérité** sur le taux.
- **CAD = un dérivé d'un taux à l'instant T**, pas une donnée. Le geler dans le texte est l'erreur.

## 2. Principe directeur

**Stocker le fait immuable `{montant, devise}`. Convertir/formater AU BORD (au rendu), avec un taux courant centralisé.**

Analogie maîtresse : c'est de l'**i18n**. On code pas les traductions en dur ; on a un catalogue de messages + un formateur runtime. Ici : `rates.json` = catalogue FX, `<Price>` = formateur.

Règle d'agnosticité (les « sites » = de la DONNÉE, le code Astro est déjà partagé) : **la donnée d'un voyage ne porte QUE `{montant, devise}` — zéro CAD, zéro taux.** Toute la logique devise vit dans la couche partagée.

## 3. Architecture du container — 4 pièces

### Pièce 1 — `rates.json` (source unique de vérité)
```jsonc
{
  "base": "CAD",                         // devise foyer (Martin) ; configurable plus tard
  "fetchedAt": "2026-06-16T08:00:00Z",
  "source": "ECB | exchangerate.host | …",
  "rates": { "EUR": 1.62, "THB": 0.036, "GBP": 1.85 }   // 1 unité devise = N CAD
}
```
Emplacement candidat : `src/content/` (collection) ou data root. Tous les voyages le lisent.

### Pièce 2 — Schéma de prix structuré (`scripts/lib/schemas.mjs`, déjà partagé)
Remplacer la string `range` par du structuré. **`currency` existe déjà sur les POIs → mi-chemin fait.**
```jsonc
price: {
  amount: { low: 55, high: 75 },   // ou { value: 28 } pour un prix unique
  currency: "EUR",
  per: "nuit",                     // unité : nuit|pers|plat|kg|… (enum)
  note: "plus cher en haute saison" // qualificatif libre optionnel
  // PLUS de CAD ici. PLUS de range string.
}
```
`asOf` reste (date de vérif du prix LOCAL, distinct de fetchedAt du taux).

### Pièce 3 — `lib/money.ts` + composant `<Price>` (LE seul point de formatage)
- `money.ts` : `convert(amount, from, to, rates)` + arrondi propre (≥30 → au 5, sinon au 1) + format `(~CAD X–Y)`.
- `<Price price={...} />` : lit le structuré + `rates.json` → rend `55–75 € (~CAD 90–120)`. Un seul endroit convertit ⇒ agnostique par construction. Remplace le CAD inline dans `CarnetSection`/`FoodieBlock`/chips/budget.

### Pièce 4 — L'updater (LE « background »)
GitHub Action **cron** : fetch API FX → écrit `rates.json` → commit → Pages rebuild → tous les prix à jour.
- Fréquence : **hebdomadaire** suffit (planification de voyage, pas du trading).
- Le site est **statique** → « background » = cron→rebuild (voir §4).

## 4. Décision clé : build-time vs client-side

Le site est statique (GitHub Pages, pas de serveur). « Mettre à jour en background » = un de deux modèles :

| Critère | **Build-time (cron→rebuild)** | Client-side (JS lit rates.json) |
|---|---|---|
| Fraîcheur | à chaque rebuild (hebდo) | à chaque visite |
| Simplicité | haute (HTML pré-rendu) | moyenne (flash, JS requis) |
| SEO / no-JS | parfait | dégradé |
| Coût | 1 rebuild/sem | 0 rebuild |

**RECOMMANDATION : build-time + cron hebdomadaire.** Les taux bougent pas assez pour justifier le temps réel sur un site de planif. HTML propre + cron = le « background » de Martin. (Client-side = extension future si sélecteur de devise live souhaité.)

## 5. Échelle de maturité — NE PAS sous-scoper

Martin a nommé DEUX niveaux distincts :

- **(A) PLOMBERIE** — chaque prix s'auto-convertit (§3). Faisable, propre, fondation.
- **(B) PRODUIT (le vrai north star)** — « idée claire du coût potentiel d'un voyage » = **estimateur de budget DÉRIVÉ** : nuits × tarif/base + jours × bouffe/jour + transport + activités → total CAD vivant. Le `budget.json` actuel est écrit à la main ; le north star = il est **calculé** depuis la donnée structurée + taux courant, donc jamais périmé.

(A) habilite (B). Mais (B) exige un **modèle de coût** que la donnée actuelle n'a pas (ex. « combien de repas à quel resto »). Bâtir (A) d'abord, (B) ensuite.

## 6. Le morceau dur — prix dans la PROSE

« le bateau ~10 € », « dix euros » : un prix au milieu d'une phrase est dur à structurer. Deux options (à trancher en session de build) :
- **Tokeniser** : `<Price amount={10} cur="EUR"/>` inline / syntaxe MDX. Cohérent, mais change comment on écrit l'éditorial.
- **Local-only en prose** : CAD seulement sur les chips structurés ; la prose garde le prix local sans conversion.

## 7. Inversion — ce qui tue ça (à blinder)

- **API FX morte/changée** → garder le dernier taux valide (`rates.json` versionné) + fallback codé + alerte ; **jamais planter le build**.
- **Prix sans devise** → le schéma doit l'EXIGER (sinon impossible à convertir).
- **Staleness invisible** → afficher « taux du AAAA-MM-JJ » près du budget (honnêteté du `fetchedAt`, comme la provenance).
- **Devise non couverte** par `rates.json` → fallback : afficher local seul + flag.

## 8. Migration depuis l'état actuel

Désоссifier les strings existantes : parser `"~55–75 €/nuit (~CAD 90–120)"` → `{amount:{low:55,high:75}, currency:"EUR", per:"nuit"}` + **drop le CAD cuit**. Script one-shot = l'inverse exact des transformers de cette session (`/tmp/cad-chips*.mjs` — voir mémoire `prix-cad-partout`). Faire les 5 voyages.

## 9. Le piège du taux-par-site (déjà observé)

Actuellement chaque voyage est gelé à SON taux : **Crète/Philippines/Portugal = 1,62 ; Cyclades/Andalousie = 1,50** (bâtis plus tôt). Le container **élimine** ce piège : un seul `rates.json` → tous les voyages au même taux courant automatiquement. ⚠️ Mais les **budgets totaux** écrits à la main des vieux sites sont calculés à 1,50 → la migration vers (B) budget-dérivé les régénère ; en attendant (A), soit on régénère les totaux au taux courant, soit on les laisse `asOf` daté. Décision à la session de build.

## 10. Checklist de build (session dédiée)

1. Schéma : `price` structuré (`amount/currency/per/note`), `currency` requis. Migrer les 5 voyages (script désossifieur §8).
2. `rates.json` + collection/loader.
3. `lib/money.ts` (`convert` + arrondi + format) + `<Price>` ; brancher dans `CarnetSection`/`FoodieBlock`/budget.
4. GitHub Action cron (fetch FX → commit rates.json → rebuild) + fallback/last-good.
5. Afficher « taux du … ».
6. (Plus tard) (B) : modèle de coût + budget dérivé + total CAD vivant.
7. Trancher : prose tokenisée vs local-only (§6).

---

**Liens** : ce north-star naît de `prix-cad-partout` (la règle) + s'appuie sur l'archi `modele-voyage-container-episodes` (code partagé) + discipline `zero-raccourci-verifier-100` (afficher le `fetchedAt`, fallback honnête).
