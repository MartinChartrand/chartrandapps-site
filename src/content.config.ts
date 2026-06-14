// Collections + schémas zod — ARCHITECTURE.md §3 (FR-2).
// En Astro 6 ce fichier vit à la racine de src/ (src/content/config.ts n'existe plus).
// Les FORMES zod vivent dans scripts/lib/schemas.mjs (zod pur, réutilisé par les node:test) —
// ici on ne fait que les brancher sur des collections + loaders.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  destinationSchema,
  baseSchema,
  poiSchema,
  dishSchema,
  gemSchema,
  budgetSchema,
  pratiqueSchema,
  imageSchema,
  episodeSchema,
} from '../scripts/lib/schemas.mjs';

const DEST_BASE = './src/content/destinations/';

// Loader custom dependency-free (deps gelées à astro/leaflet/zod — pas de lib de glob).
// pois/dishes/gems/images sont des FICHIERS-TABLEAU (1 fichier = N entrées) : glob() ne suffit pas
// (glob = 1 entrée/fichier). On lit chaque <dest>/<filename>, on scope l'id par destination
// (`${dest}/${item.id}`) → zéro collision inter-dest (`tamam` ×2 entre Crète et Turquie est OK).
// Répertoire absent (état actuel, avant migration) → collection vide, build vert.
function destScopedArray(filename: string) {
  return {
    name: `dest-array:${filename}`,
    load: async ({ store, parseData, config }: any) => {
      store.clear();
      const root = fileURLToPath(new URL(DEST_BASE, config.root));
      let dirs;
      try {
        dirs = await readdir(root, { withFileTypes: true });
      } catch {
        return; // pas encore de contenu
      }
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        let raw;
        try {
          raw = await readFile(join(root, d.name, filename), 'utf-8');
        } catch {
          continue; // cette destination n'a pas ce fichier
        }
        const arr = JSON.parse(raw);
        const seen = new Set<string>();
        for (const item of arr) {
          if (seen.has(item.id)) throw new Error(`[${d.name}/${filename}] id dupliqué intra-destination: ${item.id}`);
          seen.add(item.id);
          const id = `${d.name}/${item.id}`;
          const data = await parseData({ id, data: item });
          store.set({ id, data });
        }
      }
    },
  };
}

const destinations = defineCollection({
  loader: glob({ pattern: '*/destination.json', base: DEST_BASE }),
  schema: destinationSchema,
});

const bases = defineCollection({
  loader: glob({ pattern: '*/bases/*.md', base: DEST_BASE }),
  schema: baseSchema,
});

// §v3 ADR-2 — un épisode scrollytelling par base : <dest>/episodes/<base>.json.
// id glob = "<dest>/episodes/<base>" (ex. "andalousie/episodes/seville"). Données pures
// (pas de corps markdown) → JSON, format naturel de la machine à saucisse. Répertoire
// absent => collection vide, build vert (additif, comme l'état pré-migration des arrays).
const episodes = defineCollection({
  loader: glob({ pattern: '*/episodes/*.json', base: DEST_BASE }),
  schema: episodeSchema,
});

const budget = defineCollection({
  loader: glob({ pattern: '*/budget.json', base: DEST_BASE }),
  schema: budgetSchema,
});

const pratique = defineCollection({
  loader: glob({ pattern: '*/pratique.json', base: DEST_BASE }),
  schema: pratiqueSchema,
});

const pois = defineCollection({ loader: destScopedArray('pois.json'), schema: poiSchema });
const dishes = defineCollection({ loader: destScopedArray('dishes.json'), schema: dishSchema });
const gems = defineCollection({ loader: destScopedArray('gems.json'), schema: gemSchema });
const images = defineCollection({ loader: destScopedArray('images.json'), schema: imageSchema });

export const collections = { destinations, bases, episodes, pois, dishes, gems, budget, pratique, images };
