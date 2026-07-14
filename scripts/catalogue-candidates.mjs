// Liste TOUTES les photos géotaggées de Saigon + Quy Nhơn (deriv local) pour catalogue vision
// exhaustif, + les items de carnet sans image à combler. Sortie: /tmp/vn-catalogue.json
import { readFileSync, writeFileSync } from 'node:fs';
const lib = JSON.parse(readFileSync('/tmp/vn-lib.json', 'utf-8'));
const D = 'src/content/destinations/vietnam/';
const L = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const dishes = L('dishes.json'), gems = L('gems.json');

const bbox = { saigon: [10.6, 11.0, 106.5, 106.9], quynhon: [13.5, 13.95, 109.0, 109.4] };
const inb = (p, b) => p.latitude >= b[0] && p.latitude <= b[1] && p.longitude >= b[2] && p.longitude <= b[3];

const photos = {};
for (const [city, b] of Object.entries(bbox)) {
  photos[city] = lib.filter((p) => inb(p, b) && (!p.persons || !p.persons.length) && p.path_derivatives?.length)
    .map((p) => ({ uuid: p.uuid, deriv: p.path_derivatives.slice(-1)[0], score: +(p.score?.overall || 0).toFixed(2) }));
}

const needs = {};
for (const city of ['saigon', 'quynhon']) {
  needs[city] = [
    ...dishes.filter((d) => d.base === city && !d.image).map((d) => ({ kind: 'dish', id: d.id, want: d.title })),
    ...gems.filter((g) => g.base === city && !g.image).map((g) => ({ kind: 'gem', id: g.id, want: g.title })),
  ];
}

// chunks de 8 photos par ville pour le catalogue
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const tasks = [];
for (const city of ['saigon', 'quynhon']) {
  chunk(photos[city], 8).forEach((grp, i) => tasks.push({ city, chunk: i, photos: grp }));
}
writeFileSync('/tmp/vn-catalogue.json', JSON.stringify({ tasks, needs, counts: { saigon: photos.saigon.length, quynhon: photos.quynhon.length, tasks: tasks.length } }, null, 2));
console.log(`saigon ${photos.saigon.length} ph, quynhon ${photos.quynhon.length} ph → ${tasks.length} tâches catalogue`);
console.log('needs saigon:', needs.saigon.length, '| needs quynhon:', needs.quynhon.length);
