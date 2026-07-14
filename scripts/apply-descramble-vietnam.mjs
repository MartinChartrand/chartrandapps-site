// De-scramble in-pool : applique les ré-assignations d'images (match/approx) + alts honnêtes.
// Saute les nofit (comblés par le photo-mining). Usage: node scripts/apply-descramble-vietnam.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const D = 'src/content/destinations/vietnam/';
const TODAY = '2026-06-19';
const load = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const bases = ['saigon', 'quynhon', 'hoian', 'hanoi'];
const images = load('images.json');
const pois = load('pois.json'), dishes = load('dishes.json'), gems = load('gems.json');
const eps = Object.fromEntries(bases.map((b) => [b, load(`episodes/${b}.json`)]));
const imgBySlot = new Map(images.map((i) => [i.slot, i]));
const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
const poiById = byId(pois), dishById = byId(dishes), gemById = byId(gems);

const apply = JSON.parse(readFileSync('/tmp/vn-apply.json', 'utf-8')).assignments;
const log = [];
let imgChanges = 0, altChanges = 0, skipped = 0;

// Met à jour le manifest (alt + re-seal vision) d'un slot.
function reseal(slot, alt, conf) {
  const im = imgBySlot.get(slot);
  if (!im) return;
  im.alt = alt;
  im.visionChecked = `rechecked-${TODAY}`;
  im.visionCheckedSemantic = { sha256: im.sha256, alt, verdict: conf === 'match' ? 'match' : 'unverifiable', checkedAt: TODAY };
}

for (const a of apply) {
  const { base, consumer, kind, currentImageId, recommendedImageId, correctedAlt, confidence } = a;
  // éligibilité : match/approx + slot recommandé réel existant. nofit => skip (photo-mining).
  if (confidence === 'nofit' || !recommendedImageId || !imgBySlot.has(recommendedImageId)) { skipped++; continue; }
  const ep = eps[base];
  const isReassign = recommendedImageId !== currentImageId;
  let touched = false;

  if (kind === 'coldOpen' || kind === 'montage') {
    const m = consumer.match(/\[(\d+)\]/);
    const arr = kind === 'coldOpen' ? ep.coldOpen : ep.montage;
    const beat = arr[m ? +m[1] : 0];
    if (beat) { beat.thumb = recommendedImageId; beat.thumbAlt = correctedAlt; touched = true; }
  } else if (kind === 'scene') {
    const id = consumer.split(':')[1];
    const sc = ep.scenes.find((s) => s.id === id);
    if (sc) { sc.image = recommendedImageId; sc.alt = correctedAlt; touched = true; }
  } else if (kind === 'poi') {
    const p = poiById.get(consumer.split(':')[1]);
    if (p) { p.image = recommendedImageId; touched = true; }
  } else if (kind === 'dish') {
    const d = dishById.get(consumer.split(':')[1]);
    if (d) { d.image = recommendedImageId; touched = true; }
  } else if (kind === 'gem') {
    const g = gemById.get(consumer.split(':')[1]);
    if (g) { g.image = recommendedImageId; touched = true; }
  }
  if (!touched) { skipped++; continue; }
  reseal(recommendedImageId, correctedAlt, confidence);
  if (isReassign) imgChanges++; else altChanges++;
  log.push(`${isReassign ? '🔄' : '✏️ '} ${base}/${consumer.padEnd(32)} ${isReassign ? currentImageId + '→' + recommendedImageId : '(alt) ' + recommendedImageId} [${confidence}]`);
}

console.log(log.join('\n'));
console.log(`\n🔄 ${imgChanges} swaps image | ✏️  ${altChanges} alt-only | sauté(nofit/inconnu): ${skipped}`);
if (WRITE) {
  writeFileSync(D + 'images.json', JSON.stringify(images, null, 2) + '\n');
  writeFileSync(D + 'pois.json', JSON.stringify(pois, null, 2) + '\n');
  writeFileSync(D + 'dishes.json', JSON.stringify(dishes, null, 2) + '\n');
  writeFileSync(D + 'gems.json', JSON.stringify(gems, null, 2) + '\n');
  for (const b of bases) writeFileSync(D + `episodes/${b}.json`, JSON.stringify(eps[b], null, 2) + '\n');
  console.log('✍️  images/pois/dishes/gems/episodes écrits');
} else console.log('(dry-run)');
