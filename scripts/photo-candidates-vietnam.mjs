// Pour chaque trou d'image (needsSourcing), trouve les photos perso géotaggées proches
// du POI cible, classées par proximité + score esthétique. Sortie: /tmp/vn-photo-candidates.json
import { readFileSync, writeFileSync } from 'node:fs';

const D = 'src/content/destinations/vietnam/';
const load = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const pois = load('pois.json'), dishes = load('dishes.json'), gems = load('gems.json');
const bases = ['saigon', 'quynhon', 'hoian', 'hanoi'];
const eps = Object.fromEntries(bases.map((b) => [b, load(`episodes/${b}.json`)]));
const lib = JSON.parse(readFileSync('/tmp/vn-lib.json', 'utf-8'));
const realign = JSON.parse(readFileSync('/tmp/vn-realign.json', 'utf-8')).result;

const poiById = new Map(pois.map((p) => [p.id, p]));
const dishById = new Map(dishes.map((d) => [d.id, d]));
const gemById = new Map(gems.map((g) => [g.id, g]));

// centre-ville fallback par base
const CITY = { saigon: [10.776, 106.700], quynhon: [13.77, 109.22], hoian: [16.03, 108.18], hanoi: [21.03, 105.85] };

// Coords connues des landmarks (gems sans poiRef) — célèbres, fiables.
const LANDMARK = {
  'gem:thap-banh-it-cham': [13.8758, 109.1075],       // Tours Cham Bánh Ít
  'gem:ghenh-rang-galets': [13.7536, 109.2206],        // Ghềnh Ráng / Queen Beach (galets)
  'gem:eo-gio': [13.7853, 109.3030], 'gem:loop-phuong-mai': [13.7980, 109.2870], // péninsule Phương Mai
  'gem:nhon-hai-hon-kho': [13.8170, 109.3130],         // Nhơn Hải / Hòn Khô
  'gem:xuong-ly-festival-cau-ngu': [13.8090, 109.3180],// Xương Lý (Nhơn Lý)
  'gem:cho-khu-2-marche-poissons': [13.7720, 109.2360],// Chợ Khu 2 (marché poissons QN)
  'gem:cam-kim-boucle-velo': [15.8680, 108.3200], 'scene:scene-cam-kim': [15.8680, 108.3200], // île Cẩm Kim
  'gem:duy-hai-marche-poissons-aube': [15.8830, 108.3530], // marché Duy Hải
  'gem:bai-tang-hidden-beach': [15.9540, 108.3480],    // Bãi Tắm / An Bàng nord
  'gem:bai-rang-son-tra': [16.1080, 108.2730],         // Bãi Rạng (Son Trà)
  'gem:nam-o-reef': [16.0930, 108.1280], 'scene:scene-goi-ca-nam-o': [16.0930, 108.1280], 'dish:goi-ca-nam-o-plat': [16.0930, 108.1280], // Nam Ô récif/village
  'gem:lang-da-sy-forgerons': [20.9610, 105.7770],     // village Đa Sỹ (Hà Đông)
  'gem:ngoc-ha-epave-b52': [21.0370, 105.8120],        // lac Hữu Tiệp (épave B-52)
  'scene:scene-canal-nhieu-loc': [10.7907, 106.6821], 'poi:canal-nhieu-loc': [10.7907, 106.6821], 'gem:gem-canal-nhieu-loc': [10.7907, 106.6821],
};

// Résout les coords cibles d'un consumer de needsSourcing.
function targetCoords(base, consumer) {
  if (LANDMARK[consumer]) return { coords: LANDMARK[consumer], via: `landmark:${consumer.split(':')[1]}` };
  const [kind, id] = consumer.includes(':') ? consumer.split(':') : [consumer.replace(/\[.*/, ''), null];
  let poiRef = null;
  if (kind === 'poi') poiRef = id;
  else if (kind === 'scene') {
    const sc = eps[base].scenes.find((s) => s.id === id);
    poiRef = sc?.poiRef;
  } else if (kind === 'dish') poiRef = dishById.get(id)?.poiRef;
  else if (kind === 'gem') poiRef = gemById.get(id)?.poiRef;
  const p = poiRef ? poiById.get(poiRef) : null;
  if (p?.coords) return { coords: [p.coords.lat, p.coords.lng], via: `poi:${poiRef}` };
  return { coords: CITY[base], via: 'city-center', wide: true };
}

const hav = (a, b) => {
  const R = 6371000, toR = (x) => x * Math.PI / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const inCity = { saigon: [10.6, 11.0, 106.5, 106.9], quynhon: [13.5, 13.95, 109.0, 109.4], hoian: [15.75, 16.25, 107.95, 108.55], hanoi: [20.85, 21.2, 105.65, 106.05] };
const cityPhotos = (base) => { const b = inCity[base]; return lib.filter((p) => p.latitude >= b[0] && p.latitude <= b[1] && p.longitude >= b[2] && p.longitude <= b[3]); };

// dédup needsSourcing par (base, target via)
const needs = realign.images.flatMap((b) => b.needsSourcing.map((n) => ({ base: b.base, ...n })));

const out = [];
for (const n of needs) {
  const t = targetCoords(n.base, n.consumer);
  const withDist = cityPhotos(n.base).map((p) => ({ p, dist: hav(t.coords, [p.latitude, p.longitude]) }));
  // rayon adaptatif : élargit jusqu'à ≥6 candidats, cap 3km (city-center = tout)
  let radius = t.wide ? 100000 : 400, pool = [];
  for (; radius <= (t.wide ? 100000 : 3000); radius *= 2) {
    pool = withDist.filter((x) => x.dist <= radius);
    if (pool.length >= 6 || t.wide) break;
  }
  pool.sort((a, b) => (a.dist - b.dist));
  // prend les 30 plus proches, garde les 8 meilleurs par score esthétique
  const near = pool.slice(0, 30).sort((a, b) => (b.p.score?.overall || 0) - (a.p.score?.overall || 0)).slice(0, 8);
  out.push({
    base: n.base, consumer: n.consumer, what: n.what, via: t.via, wide: !!t.wide, radiusM: t.wide ? null : radius,
    nNearby: pool.length,
    candidates: near.map((x) => ({ uuid: x.p.uuid, dist: Math.round(x.dist), score: +(x.p.score?.overall || 0).toFixed(2), deriv: x.p.path_derivatives?.slice(-1)[0] || x.p.path_derivatives?.[0], date: (x.p.date || '').slice(0, 10) })),
  });
}

writeFileSync('/tmp/vn-photo-candidates.json', JSON.stringify(out, null, 2));
console.log(`${out.length} trous traités`);
for (const o of out) console.log(`${o.wide ? '🏙 ' : '📍'} ${o.base}/${o.consumer.padEnd(34)} via ${o.via.padEnd(24)} | ${o.nNearby} proches | top${o.candidates.length}`);

// ——— Cibles vision : PRÉCISES groupées par lieu (12 plus proches) ; LARGES par consumer (12 meilleurs score) ———
const mk = (p, dist) => ({ uuid: p.uuid, dist: Math.round(dist), score: +(p.score?.overall || 0).toFixed(2), deriv: p.path_derivatives?.slice(-1)[0] || p.path_derivatives?.[0], date: (p.date || '').slice(0, 10) });
const groups = new Map();
for (const n of needs) {
  const t = targetCoords(n.base, n.consumer);
  // clé : précis = par coords (partage entre consumers du même lieu) ; large = par consumer (pas de partage)
  const key = t.wide ? `wide|${n.consumer}` : `${n.base}|${t.coords[0].toFixed(3)},${t.coords[1].toFixed(3)}`;
  if (!groups.has(key)) {
    let candidates;
    if (t.wide) {
      candidates = cityPhotos(n.base).filter((p) => !p.persons || !p.persons.length)
        .sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0)).slice(0, 12).map((p) => mk(p, hav(t.coords, [p.latitude, p.longitude])));
    } else {
      const withDist = cityPhotos(n.base).map((p) => ({ p, dist: hav(t.coords, [p.latitude, p.longitude]) })).sort((a, b) => a.dist - b.dist);
      let radius = 400, pool = [];
      for (; radius <= 3000; radius *= 2) { pool = withDist.filter((x) => x.dist <= radius); if (pool.length >= 12) break; }
      candidates = pool.slice(0, 12).map((x) => mk(x.p, x.dist));
    }
    groups.set(key, { base: n.base, via: t.via, wide: !!t.wide, consumers: [], whats: new Set(), candidates });
  }
  const g = groups.get(key); g.consumers.push(n.consumer); g.whats.add(n.what);
}
const targets = [...groups.values()].map((g) => ({ ...g, whats: [...g.whats] })).filter((g) => g.candidates.length > 0);
writeFileSync('/tmp/vn-vision-targets.json', JSON.stringify(targets, null, 2));
const skipped = [...groups.values()].filter((g) => g.candidates.length === 0);
console.log(`\n→ ${targets.length} cibles vision (${targets.filter((t) => !t.wide).length} précises + ${targets.filter((t) => t.wide).length} larges) | ${skipped.length} sans photo (bench): ${skipped.map((g) => g.consumers[0]).join(', ')}`);
