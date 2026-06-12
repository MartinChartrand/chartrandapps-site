# scripts/migrate/ — Scripts one-shot de migration v1→v2

> **ATTENTION : Scripts one-shot, gelés, jamais maintenus. Commités pour traçabilité uniquement.**
>
> Ces scripts ont servi à migrer le contenu HTML v1 (Crète, Turquie) vers l'arborescence §3 du modèle de contenu v2 (ARCHITECTURE.md). Ils ne sont pas destinés à être utilisés pour de nouvelles destinations — le skill `/voyage-new` v2 gère ça directement.

## Contexte

- HTML v1 : ~2750 lignes par destination (fichier unique, tout-en-un)
- Arborescence v2 : `src/content/destinations/<dest>/` (pois.json, bases/*.md, budget.json, etc.)
- Fixtures HTML : `fixtures/crete/index.html`, `fixtures/turquie/index.html`

## Usage

### 1. extract.mjs — Extraction HTML v1 → arborescence §3

```bash
node scripts/migrate/extract.mjs <html-file> <outdir>
```

**Exemple (Crète) :**
```bash
node scripts/migrate/extract.mjs scripts/migrate/fixtures/crete/index.html /tmp/crete-out
```

**Sortie dans `<outdir>` :**
- `destination.json` — métadonnées destination
- `bases/01-<slug>.md` ... `bases/04-<slug>.md` — narratif par base (frontmatter + Markdown)
- `pois.json` — POIs depuis l'objet MAPS + croisement prose (refs `[[poi:id]]`)
- `budget.json` — lignes budget + stat-cards + scénarios
- `pratique.json` — infos pratiques
- `images.json` — manifest images (URLs Unsplash, à compléter par fetch-images.mjs)
- `dishes.json`, `gems.json` — vides (contenu éditorial à remplir manuellement)

**Exit codes :** `0` = OK, `2` = parse fail (message sur stderr)

### 2. fetch-images.mjs — Téléchargement des hotlinks Unsplash

```bash
node scripts/migrate/fetch-images.mjs <dest-slug> [--dry-run] [--images-json <path>]
```

**Exemple (Crète) :**
```bash
# Dry run d'abord pour voir ce qui sera téléchargé
node scripts/migrate/fetch-images.mjs crete --dry-run --images-json /tmp/crete-out/images.json

# Téléchargement réel
node scripts/migrate/fetch-images.mjs crete --images-json /tmp/crete-out/images.json
```

**Comportement :**
- Télécharge les URLs Unsplash depuis `images.json`
- Sauvegarde dans `src/assets/destinations/<dest>/`
- Calcule et enregistre le sha256 dans `images.json`
- Rapporte les images mortes (404/timeout) **sans bloquer** (exit 0)
- Les images déjà téléchargées (sha256 présent + fichier existant) sont ignorées

**Exit codes :** `0` = OK, `2` = erreur critique (images.json introuvable ou malformé)

## Workflow de migration complet

```bash
# 1. Extraction
node scripts/migrate/extract.mjs scripts/migrate/fixtures/crete/index.html /tmp/crete-out

# 2. Révision manuelle des bases/*.md (ton, corrections, dishes.json, gems.json)

# 3. Copie vers src/content/destinations/
cp -r /tmp/crete-out/. src/content/destinations/crete/

# 4. Téléchargement des images
node scripts/migrate/fetch-images.mjs crete

# 5. Validation
npm run validate:fast
```

## Fixtures

Les fichiers `fixtures/crete/index.html` et `fixtures/turquie/index.html` sont les HTML v1 complets, commités comme source de vérité de la migration. Ils ne seront jamais modifiés.
