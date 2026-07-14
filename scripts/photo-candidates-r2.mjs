// Round-2 : pour les scènes encore brisées, candidats = 18 photos les PLUS PROCHES
// (pas de filtre score esthétique — on veut le contenu réel, pas les plus belles).
import { readFileSync, writeFileSync } from 'node:fs';
const lib = JSON.parse(readFileSync('/tmp/vn-lib.json', 'utf-8'));
const hav = (a, b) => { const R = 6371000, t = (x) => x * Math.PI / 180; const dLat = t(b[0] - a[0]), dLng = t(b[1] - a[1]); const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
const bbox = { saigon: [10.6, 11.0, 106.5, 106.9], quynhon: [13.5, 13.95, 109.0, 109.4], hoian: [15.75, 16.25, 107.95, 108.55], hanoi: [20.85, 21.2, 105.65, 106.05] };
const city = (b) => { const x = bbox[b]; return lib.filter((p) => p.latitude >= x[0] && p.latitude <= x[1] && p.longitude >= x[2] && p.longitude <= x[3] && (!p.persons || !p.persons.length)); };

const T = [
  { base: 'hoian', coord: [15.8680, 108.3200], consumers: ['scene:scene-cam-kim', 'gem:cam-kim-boucle-velo'], need: 'Ile de Cam Kim : rizieres, chemins de terre, ateliers de menuiserie Kim Bong, pecheurs et barques sur les canaux, paysage rural — PAS un plat de restaurant' },
  { base: 'hanoi', coord: [21.0287, 105.8500], consumers: ['scene:scene-vieux-quartier'], need: 'Arches ferroviaires de Phung Hung avec fresques murales OU rue animee du vieux quartier de Hanoi' },
  { base: 'hoian', coord: [15.8830, 108.3530], consumers: ['gem:duy-hai-marche-poissons-aube'], need: 'Marche aux poissons a l aube : barques-paniers, poissons sur quai, lumiere du matin, pres de Hoi An / An Bang' },
  { base: 'hoian', coord: [16.1080, 108.2730], consumers: ['gem:bai-rang-son-tra'], need: 'Plage ou cote rocheuse de la peninsule Son Tra : rochers, eau bleu-vert, sable, Da Nang' },
  { base: 'quynhon', coord: [13.7536, 109.2206], consumers: ['gem:ghenh-rang-galets'], need: 'Plage Ghenh Rang / Queen Beach a Quy Nhon : galets ronds, mer, falaises' },
  { base: 'saigon', coord: [10.7907, 106.6821], consumers: ['scene:scene-canal-nhieu-loc', 'poi:canal-nhieu-loc', 'gem:gem-canal-nhieu-loc'], need: 'Canal ou voie d eau urbaine a Saigon avec promenade riveraine — PAS un grand lac de Hanoi' },
];
const mk = (p, d) => ({ uuid: p.uuid, deriv: (p.path_derivatives || []).slice(-1)[0], score: +(p.score?.overall || 0).toFixed(2), dist: Math.round(d), date: (p.date || '').slice(0, 10) });
const out = T.map((t, i) => {
  const wd = city(t.base).map((p) => ({ p, d: hav(t.coord, [p.latitude, p.longitude]) })).sort((a, b) => a.d - b.d);
  let r = 600, pool = [];
  for (; r <= 8000; r *= 2) { pool = wd.filter((x) => x.d <= r); if (pool.length >= 18) break; }
  return { id: i, base: t.base, via: 'r2', consumers: t.consumers, whats: [t.need], candidates: pool.slice(0, 18).map((x) => mk(x.p, x.d)) };
});
writeFileSync('/tmp/vn-vision-targets.json', JSON.stringify(out, null, 2));
out.forEach((o) => console.log(`${o.base} | ${o.candidates.length}c | nearest ${o.candidates[0]?.dist}-${o.candidates.slice(-1)[0]?.dist}m | ${o.consumers[0]}`));
