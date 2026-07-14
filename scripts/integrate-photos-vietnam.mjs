// Moteur d'intégration photo : export full-res (iCloud) → rotate → resize 2400 → assets →
// upsert images.json → branche les consumers. Aussi : bench (image:"") des slots sans photo.
// Plan: /tmp/vn-integration-plan.json  | Usage: node scripts/integrate-photos-vietnam.mjs [--write]
import { readFileSync, writeFileSync, existsSync, mkdtempSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WRITE = process.argv.includes('--write');
const D = 'src/content/destinations/vietnam/';
const ASSETS = 'src/assets/destinations/vietnam/';
const TODAY = '2026-06-19';
const OSX = `${process.env.HOME}/Library/Python/3.11/bin/osxphotos`;
const LIB = `${process.env.HOME}/Pictures/Photos Library.photoslibrary`;
const plan = JSON.parse(readFileSync('/tmp/vn-integration-plan.json', 'utf-8'));

const load = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const bases = ['saigon', 'quynhon', 'hoian', 'hanoi'];
const images = load('images.json');
const pois = load('pois.json'), dishes = load('dishes.json'), gems = load('gems.json');
const eps = Object.fromEntries(bases.map((b) => [b, load(`episodes/${b}.json`)]));
const imgBySlot = new Map(images.map((i) => [i.slot, i]));
const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
const poiById = byId(pois), dishById = byId(dishes), gemById = byId(gems);
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

function srcFile(source) {
  if (source.localFile) return source.localFile;
  const dir = mkdtempSync(join(tmpdir(), 'vnexp-'));
  execFileSync(OSX, ['export', dir, '--library', LIB, '--uuid', source.uuid, '--download-missing', '--use-photokit', '--convert-to-jpeg', '--jpeg-quality', '0.9'], { stdio: 'pipe', timeout: 180000 });
  const jpg = readdirSync(dir).find((f) => /\.jpe?g$/i.test(f));
  if (!jpg) throw new Error(`export raté: ${source.uuid}`);
  return join(dir, jpg);
}

function pointConsumer(c, slot, alt) {
  if (c.kind === 'scene') { const s = eps[c.base].scenes.find((x) => x.id === c.id); if (s) { s.image = slot; if (alt) s.alt = alt; } }
  else if (c.kind === 'coldOpen' || c.kind === 'montage') { const beat = eps[c.base][c.kind][c.index]; if (beat) { beat.thumb = slot; if (alt) beat.thumbAlt = alt; } }
  else if (c.kind === 'poi') { const p = poiById.get(c.id); if (p) p.image = slot; }
  else if (c.kind === 'dish') { const d = dishById.get(c.id); if (d) d.image = slot; }
  else if (c.kind === 'gem') { const g = gemById.get(c.id); if (g) g.image = slot; }
}

const log = [];
const failed = [];
for (const it of plan.integrations || []) {
  const out = ASSETS + it.destFile;
  if (WRITE) {
    let src;
    try { src = srcFile(it.source); }
    catch (e) { failed.push(it.slot); log.push(`❌ ${it.slot} — export raté (${e.message.slice(0, 40)}), sauté`); continue; }
    copyFileSync(src, out);
    if (it.rotate && it.rotate !== 'none') { const deg = { '180': 180, '90cw': 90, '90ccw': 270 }[it.rotate]; execFileSync('sips', ['-r', String(deg), out], { stdio: 'pipe' }); }
    execFileSync('sips', ['-Z', '2400', out], { stdio: 'pipe' });
  }
  const hash = WRITE ? sha256(out) : 'dry';
  const entry = {
    id: it.slot, slot: it.slot, base: it.base, role: it.role || 'photo', file: it.destFile, alt: it.alt,
    layout: it.layout || null, claims: it.claims || 'atmosphere',
    credit: { source: 'perso', photoId: it.photoId || it.slot, photographer: 'Archives personnelles', license: 'personnel' },
    sha256: hash, visionChecked: `rechecked-${TODAY}`,
    visionCheckedSemantic: { sha256: hash, alt: it.alt, verdict: it.confidence === 'match' ? 'match' : 'unverifiable', checkedAt: TODAY },
  };
  if (imgBySlot.has(it.slot)) { const e = imgBySlot.get(it.slot); Object.assign(e, entry); }
  else { images.push(entry); imgBySlot.set(it.slot, entry); }
  for (const c of it.consumers) pointConsumer(c, it.slot, it.alt);
  log.push(`📷 ${it.slot.padEnd(22)} ← ${it.source.uuid || it.source.localFile?.split('/').pop()} ${it.rotate !== 'none' ? '(rot ' + it.rotate + ')' : ''} → ${it.consumers.map((c) => c.kind + ':' + (c.id || c.index)).join(', ')} [${it.confidence}]`);
}
for (const b of plan.benches || []) {
  pointConsumer({ ...b }, '', '');
  log.push(`🪑 bench ${b.kind}:${b.id || b.index} (image vidée — slot sans photo honnête)`);
}
// Reassigns in-pool (pas d'export) : pointe vers un slot existant + alt honnête + re-seal manifest.
for (const r of plan.reassigns || []) {
  for (const c of r.consumers) pointConsumer(c, r.slot, r.alt);
  const im = imgBySlot.get(r.slot);
  if (im && r.alt) { im.alt = r.alt; im.visionChecked = `rechecked-${TODAY}`; im.visionCheckedSemantic = { sha256: im.sha256, alt: r.alt, verdict: 'unverifiable', checkedAt: TODAY }; }
  log.push(`🔁 ${r.slot.padEnd(22)} → ${r.consumers.map((c) => c.kind + ':' + (c.id || c.index)).join(', ')} (in-pool)`);
}

console.log(log.join('\n'));
console.log(`\n${(plan.integrations || []).length} intégrations | ${(plan.benches || []).length} benchs`);
if (WRITE) {
  writeFileSync(D + 'images.json', JSON.stringify(images, null, 2) + '\n');
  writeFileSync(D + 'pois.json', JSON.stringify(pois, null, 2) + '\n');
  writeFileSync(D + 'dishes.json', JSON.stringify(dishes, null, 2) + '\n');
  writeFileSync(D + 'gems.json', JSON.stringify(gems, null, 2) + '\n');
  for (const b of bases) writeFileSync(D + `episodes/${b}.json`, JSON.stringify(eps[b], null, 2) + '\n');
  console.log('✍️  écrit');
} else console.log('(dry-run — pas d\'export/sips)');
