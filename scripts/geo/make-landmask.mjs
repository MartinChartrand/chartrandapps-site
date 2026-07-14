#!/usr/bin/env node
// make-landmask.mjs — FR-6 : génère scripts/data/land/<dest>.geojson
// Usage : node scripts/geo/make-landmask.mjs <dest>
//
// NOTE : Pour la Crète, le landmask est déjà commité dans scripts/data/land/crete.geojson.
// Ce script est prévu pour les futures destinations qui auraient besoin d'un landmask OSM
// complet. Il nécessite ogr2ogr (GDAL) pour clipper les land-polygons OSM.
//
// Sources OSM land-polygons :
//   https://osmdata.openstreetmap.de/data/land-polygons.html
//   Fichier : land-polygons-split-4326.zip (~800 MB décompressé)
//
// Workflow manuel (hors tests automatisés) :
//   1. Télécharger land-polygons-split-4326.zip
//   2. Décompresser → land-polygons-split-4326/land_polygons.shp
//   3. ogr2ogr -f GeoJSON -clipsrc <xmin> <ymin> <xmax> <ymax> \
//        scripts/data/land/<dest>.geojson \
//        land-polygons-split-4326/land_polygons.shp
//   4. Simplifier avec mapshaper ou ogr2ogr -simplify si trop lourd.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const BBOXES = {
  crete:      [23.5, 34.8, 26.4, 35.7],
  turquie:    [25.6, 36.0, 45.0, 42.2],
  andalousie: [-7.6, 35.9, -1.4, 38.8], // Huelva/Jabugo → Almería ; Tarifa → Sierra Morena
  portugal:   [-9.6, 36.9, -6.0, 42.2], // Sagres/Faro → Minho ; côte atlantique → frontière espagnole
  philippines: [99.5, 8.5, 126.0, 15.5], // Bangkok (escale) + Pampanga/Angeles (sisig) + Visayas centrales (Panay→Bohol/Cebu)
  vietnam:    [105.5, 10.3, 109.7, 21.3], // Saigon (sud) → Quy Nhơn → Hội An/Đà Nẵng → Hanoi (nord), côte centrale incluse
  scotland:   [-7.8, 55.2, -2.0, 58.8], // Edinburgh → Argyll/Loch Fyne → Harris/Lewis (Hébrides ext.) → Assynt/Inverness
};

async function main() {
  const dest = process.argv[2];
  if (!dest) {
    process.stderr.write('Usage: node scripts/geo/make-landmask.mjs <dest>\n');
    process.stderr.write('  Destinations connues: ' + Object.keys(BBOXES).join(', ') + '\n');
    process.exit(2);
  }

  const outDir = join(ROOT, 'scripts', 'data', 'land');
  const outPath = join(outDir, `${dest}.geojson`);

  if (existsSync(outPath)) {
    process.stdout.write(`Landmask déjà présent : ${outPath}\n`);
    process.stdout.write('Supprimer le fichier pour régénérer.\n');
    process.exit(0);
  }

  const bbox = BBOXES[dest];
  if (!bbox) {
    process.stderr.write(`Destination inconnue: ${dest}. Ajouter la bbox dans BBOXES.\n`);
    process.exit(2);
  }

  process.stdout.write(`\n== make-landmask : ${dest} ==\n\n`);
  process.stdout.write(`Bbox : lng [${bbox[0]}, ${bbox[2]}] lat [${bbox[1]}, ${bbox[3]}]\n\n`);
  process.stdout.write('Ce script requiert ogr2ogr (GDAL) et les land-polygons OSM.\n');
  process.stdout.write('\nÉtapes :\n');
  process.stdout.write('  1. Télécharger https://osmdata.openstreetmap.de/data/land-polygons.html\n');
  process.stdout.write('     Fichier : land-polygons-split-4326.zip\n');
  process.stdout.write('  2. Décompresser dans un dossier temporaire\n');
  process.stdout.write(`  3. ogr2ogr -f GeoJSON -clipsrc ${bbox[0]} ${bbox[1]} ${bbox[2]} ${bbox[3]} \\\n`);
  process.stdout.write(`       ${outPath} \\\n`);
  process.stdout.write('       /tmp/land-polygons-split-4326/land_polygons.shp\n');
  process.stdout.write('  4. (Optionnel) Simplifier : mapshaper -simplify 0.5% -o ...\n');
  process.stdout.write('\nAlternative rapide : commiter un polygone approximatif comme pour crete.geojson\n');

  // Générer un polygone bbox approximatif si pas de shapefile disponible
  process.stdout.write('\n[fallback] Génération d\'un polygone bbox approximatif...\n');
  const coords = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]],
    [bbox[0], bbox[1]],
  ];
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {
          name: dest,
          note: 'Polygone bbox approximatif — remplacer par un landmask OSM précis si besoin.',
        },
      },
    ],
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(geojson, null, 2) + '\n');
  process.stdout.write(`Landmask bbox écrit : ${outPath}\n`);
  process.stdout.write('AVERTISSEMENT: polygone bbox seulement, pas un vrai landmask côtier.\n');
}

main().catch((e) => {
  process.stderr.write(`ERREUR: ${e.message}\n`);
  process.exit(2);
});
