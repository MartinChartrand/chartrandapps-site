// Applique le géocodage du réalignement Vietnam aux POIs. Idempotent.
// Usage: node scripts/apply-geo-vietnam.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const POIS = 'src/content/destinations/vietnam/pois.json';
const pois = JSON.parse(readFileSync(POIS, 'utf-8'));
const geo = JSON.parse(readFileSync('/tmp/vn-realign.json', 'utf-8')).result.geo;

const poiById = new Map(pois.map((p) => [p.id, p]));
const allGeo = geo.flatMap((g) => g.coords);

// Matche un id géocodé (parfois raccourci par l'agent) à un id de POI réel.
function matchPoi(geoId) {
  if (poiById.has(geoId)) return poiById.get(geoId);
  // contains / prefix dans les deux sens
  const cand = pois.filter((p) => p.id.includes(geoId) || geoId.includes(p.id));
  if (cand.length === 1) return cand[0];
  return null;
}

const TODAY = '2026-06-19';
let applied = 0;
const unmatched = [];
const report = [];

for (const c of allGeo) {
  if (!c.found) { report.push(`SKIP (not found) ${c.id}`); continue; }
  const p = matchPoi(c.id);
  if (!p) { unmatched.push(c.id); continue; }
  const before = { onMap: p.onMap, hasCoords: !!p.coords, maps: p.links?.maps || null };
  p.coords = { lat: c.lat, lng: c.lng, source: `web-manual-realign (${c.source})`.slice(0, 80), verifiedOn: TODAY };
  p.onMap = true;
  if (!p.links) p.links = { official: null, booking: null, tripadvisor: null, maps: null };
  if (!p.links.maps && c.mapsUrl) p.links.maps = c.mapsUrl;
  applied++;
  report.push(`OK  ${p.id.padEnd(28)} ← ${c.id.padEnd(22)} [${c.confidence}] ${c.lat},${c.lng}  onMap:${before.onMap}→true  maps:${before.maps ? 'kept' : (c.mapsUrl ? 'added' : 'none')}`);
}

console.log(report.join('\n'));
console.log(`\nApplied: ${applied} / ${allGeo.length}  | Unmatched: ${unmatched.length} ${unmatched.join(', ')}`);
if (WRITE) {
  writeFileSync(POIS, JSON.stringify(pois, null, 2) + '\n');
  console.log('✍️  pois.json écrit');
} else {
  console.log('(dry-run — relancer avec --write pour appliquer)');
}
