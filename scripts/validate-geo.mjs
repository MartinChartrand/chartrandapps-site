#!/usr/bin/env node
// validate-geo.mjs — FR-6 : point-in-polygon local contre le landmask GeoJSON.
// Ray-casting maison — zéro dépendance npm ajoutée.
// Usage : node scripts/validate-geo.mjs [--network] [--json] [dest]
// Exit : 0 = aucun probleme | 1 = ≥1 probleme | 2 = erreur d'exécution

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict, makeReport, hasProblems } from './lib/report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Ray-casting point-in-polygon (MAISON — zéro dep)
// GeoJSON coordinates : [lng, lat]
// ---------------------------------------------------------------------------

/**
 * Ray-casting : le point (lng, lat) est-il dans le ring (anneau) ?
 * Un ring est un array de [lng, lat]. Le dernier point = premier (fermé).
 * @param {number} lng
 * @param {number} lat
 * @param {number[][]} ring — tableau de [lng, lat]
 * @returns {boolean}
 */
export function pointInRing(lng, lat, ring) {
  let inside = false;
  const n = ring.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
    j = i;
  }
  return inside;
}

/**
 * Le point est-il dans ce Polygon GeoJSON (rings[0] = outer, rings[1+] = trous) ?
 * @param {number} lng
 * @param {number} lat
 * @param {number[][][]} rings — coordonnées d'un Polygon GeoJSON
 * @returns {boolean}
 */
export function pointInPolygonRings(lng, lat, rings) {
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false; // dans un trou
  }
  return true;
}

/**
 * Dispatch sur la géométrie GeoJSON (Polygon | MultiPolygon).
 * @param {number} lng
 * @param {number} lat
 * @param {{ type: string, coordinates: any }} geometry
 * @returns {boolean}
 */
export function pointInGeometry(lng, lat, geometry) {
  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(lng, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((rings) => pointInPolygonRings(lng, lat, rings));
  }
  return false;
}

/**
 * Le point est-il dans le landmask GeoJSON ?
 * Accepte FeatureCollection, Feature, Polygon, MultiPolygon.
 * @param {number} lng
 * @param {number} lat
 * @param {object} geojson — objet GeoJSON parsé
 * @returns {boolean}
 */
export function pointInLandmask(lng, lat, geojson) {
  if (geojson.type === 'FeatureCollection') {
    return geojson.features.some((f) => pointInGeometry(lng, lat, f.geometry));
  }
  if (geojson.type === 'Feature') {
    return pointInGeometry(lng, lat, geojson.geometry);
  }
  // Géométrie directe
  return pointInGeometry(lng, lat, geojson);
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

/**
 * Charge le landmask GeoJSON depuis scripts/data/land/<dest>.geojson.
 * Lève une Error avec code 'LANDMASK_MISSING' si absent.
 * @param {string} dest
 * @returns {object} GeoJSON parsé
 */
export function loadLandmask(dest) {
  const path = join(ROOT, 'scripts', 'data', 'land', `${dest}.geojson`);
  if (!existsSync(path)) {
    const err = new Error(`Landmask absent : ${path}`);
    err.code = 'LANDMASK_MISSING';
    throw err;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    const err = new Error(`Landmask JSON malformé : ${path} — ${e.message}`);
    err.code = 'LANDMASK_PARSE_ERROR';
    throw err;
  }
}

/**
 * Charge pois.json d'une destination depuis src/content/destinations/<dest>/pois.json.
 * Retourne [] si absent (pas bloquant).
 * @param {string} dest
 * @returns {Array}
 */
export function loadPois(dest) {
  const path = join(ROOT, 'src', 'content', 'destinations', dest, 'pois.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Nominatim helpers (mode --network uniquement — jamais en CI)
// ---------------------------------------------------------------------------

const NOMINATIM_UA = 'chartrandapps-site/validate-geo (martin.chartrand@gmail.com)';
const DISTANCE_THRESHOLDS = { resto: 100, plage: 500, sight: 500 };
const DEFAULT_THRESHOLD = 300;

/** Distance haversine en mètres entre deux points [lat, lng]. */
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Pause d'au moins `ms` millisecondes. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Vérifie un POI via Nominatim reverse geocode.
 * @param {object} poi
 * @returns {Promise<{state: string, detail: string}>}
 */
async function nominatimCheck(poi) {
  const { lat, lng } = poi.coords;
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_UA },
    });
    if (!res.ok) {
      return { state: 'inverifiable', detail: `Nominatim ${res.status}` };
    }
    const data = await res.json();
    const addr = data.address ?? {};
    // Si Nominatim retourne une adresse avec des champs terrestres → probablement sur terre
    const hasTerrestrialAddr =
      addr.road || addr.village || addr.town || addr.city || addr.county;
    if (!hasTerrestrialAddr) {
      return { state: 'inverifiable', detail: 'Nominatim: aucune adresse terrestre trouvée' };
    }
    // Vérifier la distance entre coords POI et résultat Nominatim
    const nomLat = parseFloat(data.lat);
    const nomLng = parseFloat(data.lon);
    const dist = haversineM(lat, lng, nomLat, nomLng);
    const threshold = DISTANCE_THRESHOLDS[poi.kind] ?? DEFAULT_THRESHOLD;
    if (dist < threshold) {
      return { state: 'ok', detail: `Nominatim: adresse terrestre à ${Math.round(dist)}m (seuil ${threshold}m)` };
    }
    return {
      state: 'inverifiable',
      detail: `Nominatim: résultat trop éloigné (${Math.round(dist)}m, seuil ${threshold}m)`,
    };
  } catch (e) {
    return { state: 'inverifiable', detail: `Nominatim erreur réseau: ${e.message}` };
  }
}

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Valide les POIs d'une destination contre le landmask.
 * @param {object} opts
 * @param {string} opts.dest
 * @param {Array}  opts.pois
 * @param {object} opts.landmask — GeoJSON parsé
 * @param {boolean} opts.network — activer Nominatim pour les problemes
 * @returns {Promise<import('./lib/report.mjs').Report>}
 */
export async function validateGeo({ dest, pois, landmask, network = false }) {
  const ranAt = new Date().toISOString();
  const verdicts = [];

  const onMapPois = pois.filter((p) => p.onMap);

  if (onMapPois.length === 0) {
    verdicts.push(verdict(dest, 'ok', 'aucun POI onMap:true'));
    return makeReport({ dest, script: 'validate-geo', ranAt, verdicts });
  }

  for (const poi of onMapPois) {
    if (!poi.coords) {
      verdicts.push(verdict(poi.id, 'inverifiable', 'coords absentes'));
      continue;
    }
    const { lat, lng } = poi.coords;
    const onLand = pointInLandmask(lng, lat, landmask);

    if (onLand) {
      verdicts.push(verdict(poi.id, 'ok', 'sur terre (landmask)'));
    } else if (network) {
      await sleep(1000); // 1 req/s Nominatim policy
      const { state, detail } = await nominatimCheck(poi);
      verdicts.push(verdict(poi.id, state, detail));
    } else {
      verdicts.push(verdict(poi.id, 'probleme', 'hors du landmask (possible en mer) — coords à vérifier'));
    }
  }

  return makeReport({ dest, script: 'validate-geo', ranAt, verdicts });
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const network = args.includes('--network');
  const jsonOutput = args.includes('--json');
  const dest = args.find((a) => !a.startsWith('--')) ?? 'crete';

  let landmask;
  try {
    landmask = loadLandmask(dest);
  } catch (e) {
    process.stderr.write(`ERREUR: ${e.message}\n`);
    process.exit(2);
  }

  const pois = loadPois(dest);

  let report;
  try {
    report = await validateGeo({ dest, pois, landmask, network });
  } catch (e) {
    process.stderr.write(`ERREUR: ${e.message}\n`);
    process.exit(2);
  }

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const problems = report.verdicts.filter((v) => v.state === 'probleme');
    const ok = report.verdicts.filter((v) => v.state === 'ok');
    const inv = report.verdicts.filter((v) => v.state === 'inverifiable');
    process.stdout.write(`validate-geo [${dest}] — ${new Date(report.ranAt).toLocaleString()}\n`);
    process.stdout.write(`  OK           : ${ok.length}\n`);
    process.stdout.write(`  PROBLEME     : ${problems.length}\n`);
    process.stdout.write(`  INVERIFIABLE : ${inv.length}\n`);
    for (const v of problems) {
      process.stdout.write(`  [PROBLEME] ${v.id}: ${v.detail}\n`);
    }
    for (const v of inv) {
      process.stdout.write(`  [?] ${v.id}: ${v.detail}\n`);
    }
  }

  process.exit(hasProblems(report) ? 1 : 0);
}

// Lance main() seulement si exécuté directement (pas importé par les tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    process.stderr.write(`ERREUR FATALE: ${e.message}\n`);
    process.exit(2);
  });
}
