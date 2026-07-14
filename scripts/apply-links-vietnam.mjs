// Rend tout cliquable : maps manquants sur POIs + liens des items de carnet orphelins.
// Usage: node scripts/apply-links-vietnam.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const D = 'src/content/destinations/vietnam/';
const load = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const pois = load('pois.json'), dishes = load('dishes.json'), gems = load('gems.json');
const poiById = new Map(pois.map((p) => [p.id, p]));

const CITY = { saigon: 'Ho Chi Minh City', quynhon: 'Quy Nhon', hoian: 'Hoi An Da Nang', hanoi: 'Hanoi' };
const mapsSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const log = [];

// 1) POIs sans links.maps → recherche nommée (nom + ville). Génère un lien cliquable honnête.
for (const p of pois) {
  if (!p.links) p.links = { official: null, booking: null, tripadvisor: null, maps: null };
  if (!p.links.maps) {
    p.links.maps = mapsSearch(`${p.name} ${CITY[p.base] || 'Vietnam'}`);
    log.push(`POI maps  ${p.base}/${p.id} ← "${p.name}"`);
  }
}

// 2) Items de carnet orphelins → lien vers la vraie place (POI) ou recherche nommée.
const setLinks = (coll, id, links) => {
  const it = coll.find((x) => x.id === id);
  if (!it) { log.push(`!! introuvable ${id}`); return; }
  if (it.links && it.links.length) { log.push(`-- ${id} a déjà des liens, skip`); return; }
  it.links = links;
  log.push(`carnet    ${id} ← ${links.map((l) => l.label).join(' / ')}`);
};
const poiMaps = (id) => poiById.get(id)?.links?.maps;

setLinks(dishes, 'oc-len-xao-dua', [{ label: 'Où en manger — rue Vĩnh Khánh · Maps', url: poiMaps('oc-vinh-khanh') }]);
setLinks(dishes, 'com-tam-suon-nuong', [{ label: 'Où en manger — Cơm Tấm Ba Ghiền · Maps', url: poiMaps('com-tam-ba-ghien') }]);
setLinks(dishes, 'banh-mi-dac-biet', [{ label: 'Où en manger — Bánh Mì Huynh Hoa · Maps', url: poiMaps('banh-mi-huynh-hoa') }]);
setLinks(dishes, 'ca-phe-sua-da', [{ label: 'Un classique de rue — cà phê vợt · Maps', url: mapsSearch('Cà phê vợt Phan Đình Phùng Ho Chi Minh City') }]);
setLinks(dishes, 'bun-dau-mam-tom-hanoi', [{ label: 'Où en manger — vieille ville de Hanoi · Maps', url: mapsSearch('bún đậu mắm tôm phố cổ Hà Nội') }]);
setLinks(gems, 'gem-cho-tan-dinh-rose', [{ label: 'Église rose & marché Tân Định · Maps', url: mapsSearch('Nhà thờ Tân Định Ho Chi Minh City') }]);

console.log(log.join('\n'));
console.log(`\n${log.length} changements`);
if (WRITE) {
  writeFileSync(D + 'pois.json', JSON.stringify(pois, null, 2) + '\n');
  writeFileSync(D + 'dishes.json', JSON.stringify(dishes, null, 2) + '\n');
  writeFileSync(D + 'gems.json', JSON.stringify(gems, null, 2) + '\n');
  console.log('✍️  pois/dishes/gems écrits');
} else console.log('(dry-run)');
