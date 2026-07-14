// Assemble les 10 spots Leila (workflow) en POIs Hanoi conformes + insère dans pois.json.
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const D = 'src/content/destinations/vietnam/';
const pois = JSON.parse(readFileSync(D + 'pois.json', 'utf-8'));
const spots = JSON.parse(readFileSync('/tmp/vn-leila-spots.json', 'utf-8')).result.spots;

const NAMES = {
  'pho-ganh-ms-thoa': 'Phở gánh Hàng Chiếu — Ms. Thoa',
  'pho-duong-tau-train-street': 'Phở đường tàu — Train Street',
  'pho-ga-phuong': 'Phở gà Phương',
  'bun-thang-lan-lun': 'Bún Thang Lan Lùn',
  'banh-mi-cart-lady-hang-be': 'Bánh Mì — la dame au chariot (43 Hàng Bè)',
  'banh-mi-co-ba-phan-dinh-phung': 'Bánh Mì thịt nguội Hiệu Cô Ba',
  'banh-cuon-ba-xuan': 'Bánh cuốn Bà Xuân',
  'xoi-yen': 'Xôi Yến',
  'bun-dau-met-ngo-23': 'Bún Đậu Mẹt — Ngõ 23',
  'mien-luon-chan-cam': 'Miến Lươn Chân Cầm',
};
const fix = (u) => (u || '').replace(/&amp;/g, '&');
const existing = new Set(pois.map((p) => p.id));
let added = 0;
const log = [];

for (const s of spots) {
  if (!s.found || existing.has(s.id)) { log.push(`skip ${s.id}`); continue; }
  pois.push({
    id: s.id, base: 'hanoi', kind: 'resto', mapType: 'resto', roles: ['eat'], tier: null,
    name: NAMES[s.id] || s.id,
    blurb: s.blurb, signature: s.signature, image: null,
    price: { range: s.priceRange.replace(/VNĐ/g, 'VND'), currency: 'VND', asOf: '2026-06' },
    coords: { lat: s.lat, lng: s.lng, source: 'websearch (Leila/curiousaboutvietnam + corroboration) — niveau rue', verifiedOn: '2026-06-19' },
    links: { official: null, booking: null, tripadvisor: null, maps: fix(s.mapsUrl) },
    seasonal: false,
    status: { open: true, lastChecked: '2026-06-19', method: 'websearch' },
    onMap: true,
    story: s.story,
    sources: s.sources.map((x) => ({ creator: x.creator, url: fix(x.url), date: x.date })),
    verifiedAt: '2026-06-19', approvedBy: 'human', region: 'hanoi',
  });
  added++; log.push(`+ ${s.id.padEnd(30)} ${s.lat.toFixed(4)},${s.lng.toFixed(4)} [${s.confidence}]`);
}

console.log(log.join('\n'));
console.log(`\n${added} POIs Leila ajoutés (Hanoi resto → carnet « À table »)`);
if (WRITE) { writeFileSync(D + 'pois.json', JSON.stringify(pois, null, 2) + '\n'); console.log('✍️  pois.json écrit'); }
else console.log('(dry-run)');
