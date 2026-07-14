// Audit déterministe Vietnam — graphe de références complet. Jetable.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/destinations/vietnam';
const ASSETS = 'src/assets/destinations/vietnam';
const J = (p) => JSON.parse(readFileSync(join(DIR, p), 'utf-8'));

const dest = J('destination.json');
const pois = J('pois.json');
const dishes = J('dishes.json');
const gems = J('gems.json');
const images = J('images.json');
const bases = ['saigon', 'quynhon', 'hoian', 'hanoi'];
const episodes = Object.fromEntries(bases.map((b) => [b, J(`episodes/${b}.json`)]));

const imgById = new Map(images.map((i) => [i.id, i]));
const poiById = new Map(pois.map((p) => [p.id, p]));
const usage = new Map(); // imageId -> [{where}]
const refImg = (id, where) => {
  if (!usage.has(id)) usage.set(id, []);
  usage.get(id).push(where);
};

const out = { dangerImg: [], danglingPoi: [], crossBaseImg: [], reuse: [], orphanImg: [],
  missingFile: [], onMapGaps: [], deadPills: [], linklessCarnet: [], noCad: [],
  visionPending: [], focusBoundsBad: [], altDivergence: [], summary: {} };

// --- collect image references ---
refImg(dest.hero.image, 'destination.hero');
if (dest.cardImage) refImg(dest.cardImage, 'destination.cardImage');
if (dest.container) {
  refImg(dest.container.hookImage, 'container.hookImage');
  dest.container.tiles.forEach((t) => refImg(t.image, `container.tile:${t.base}`));
}
for (const b of bases) {
  const ep = episodes[b];
  ep.coldOpen.forEach((c, i) => { if (c.thumb) refImg(c.thumb, `${b}/coldOpen[${i}].thumb`); });
  ep.scenes.forEach((s, i) => refImg(s.image, `${b}/scene[${i}]:${s.id || i}`));
  ep.montage.forEach((m, i) => { if (m.thumb) refImg(m.thumb, `${b}/montage[${i}].thumb`); });
}
pois.forEach((p) => { if (p.image) refImg(p.image, `poi:${p.id}`); });
dishes.forEach((d) => { if (d.image) refImg(d.image, `dish:${d.id}`); });
gems.forEach((g) => { if (g.image) refImg(g.image, `gem:${g.id}`); });

// --- 1. dangling image refs + file existence + cross-base ---
for (const [id, wheres] of usage) {
  const img = imgById.get(id);
  if (!img) { out.dangerImg.push({ id, wheres }); continue; }
  if (!existsSync(join(ASSETS, img.file))) out.missingFile.push({ id, file: img.file });
  // cross-base: a scene of base X using an image whose images.json base is Y (Y!=X, Y!=null)
  for (const w of wheres) {
    const m = w.match(/^(\w+)\/(scene|coldOpen|montage)/);
    if (m && img.base && img.base !== m[1]) out.crossBaseImg.push({ id, imgBase: img.base, usedIn: w });
  }
}

// --- 2. reuse (same image in >1 scene/coldOpen/montage slot) ---
for (const [id, wheres] of usage) {
  const sceneUses = wheres.filter((w) => /\/(scene|coldOpen|montage)/.test(w));
  if (sceneUses.length > 1) out.reuse.push({ id, count: sceneUses.length, wheres: sceneUses });
}

// --- 3. orphan images (never referenced) ---
for (const img of images) if (!usage.has(img.id)) out.orphanImg.push({ id: img.id, file: img.file, base: img.base });

// --- 4. vision status ---
for (const img of images) {
  const v = img.visionChecked;
  const sem = img.visionCheckedSemantic?.verdict;
  if (v !== 'match' || sem !== 'match') out.visionPending.push({ id: img.id, visionChecked: v, semantic: sem });
}

// --- 5. poiRef integrity (scenes/coldOpen/montage/pills/dishes/gems) ---
const checkPoi = (ref, where) => { if (ref && !poiById.has(ref)) out.danglingPoi.push({ ref, where }); };
for (const b of bases) {
  const ep = episodes[b];
  ep.coldOpen.forEach((c, i) => {
    checkPoi(c.poiRef, `${b}/coldOpen[${i}].poiRef`);
    if (c.focusPoi) checkPoi(c.focusPoi, `${b}/coldOpen[${i}].focusPoi`);
    (c.boundsPois || []).forEach((p) => checkPoi(p, `${b}/coldOpen[${i}].boundsPois`));
    (c.pills || []).forEach((pl) => pl.poiRef && checkPoi(pl.poiRef, `${b}/coldOpen[${i}].pill`));
  });
  ep.scenes.forEach((s, i) => {
    checkPoi(s.poiRef, `${b}/scene[${i}]:${s.id}.poiRef`);
    (s.pills || []).forEach((pl) => pl.poiRef && checkPoi(pl.poiRef, `${b}/scene:${s.id}.pill`));
  });
  ep.montage.forEach((m, i) => {
    checkPoi(m.poiRef, `${b}/montage[${i}].poiRef`);
    (m.boundsPois || []).forEach((p) => checkPoi(p, `${b}/montage[${i}].boundsPois`));
    (m.targets || []).forEach((p) => checkPoi(p, `${b}/montage[${i}].targets`));
    (m.pills || []).forEach((pl) => pl.poiRef && checkPoi(pl.poiRef, `${b}/montage[${i}].pill`));
  });
}
dishes.forEach((d) => checkPoi(d.poiRef, `dish:${d.id}.poiRef`));
gems.forEach((g) => checkPoi(g.poiRef, `gem:${g.id}.poiRef`));

// --- 6. focusPoi/boundsPois must have coords (else map silently breaks) ---
for (const b of bases) {
  const ep = episodes[b];
  const check = (ref, where) => {
    const p = poiById.get(ref);
    if (p && !p.coords) out.focusBoundsBad.push({ ref, where, reason: 'no coords' });
  };
  ep.coldOpen.forEach((c, i) => { if (c.focusPoi) check(c.focusPoi, `${b}/coldOpen[${i}].focusPoi`); (c.boundsPois||[]).forEach((r)=>check(r,`${b}/coldOpen[${i}].bounds`)); });
  ep.montage.forEach((m, i) => { (m.boundsPois||[]).forEach((r)=>check(r,`${b}/montage[${i}].bounds`)); });
}

// --- 7. onMap gaps ---
for (const p of pois) {
  if (!p.onMap || !p.coords) out.onMapGaps.push({ id: p.id, base: p.base, onMap: p.onMap, hasCoords: !!p.coords, kind: p.kind });
}

// --- 8. dead pills (poiRef + link but poi.links[link] null) ---
for (const b of bases) {
  const ep = episodes[b];
  const allBeats = [...ep.coldOpen, ...ep.montage, ...ep.scenes];
  allBeats.forEach((beat, i) => (beat.pills || []).forEach((pl) => {
    if (pl.poiRef) {
      const p = poiById.get(pl.poiRef);
      const link = pl.link || 'maps';
      if (p && (!p.links || !p.links[link])) out.deadPills.push({ base: b, poiRef: pl.poiRef, link, label: pl.label });
    }
  }));
}

// --- 9. linkless carnet items (dish/gem with no links AND no resolvable poiRef link) ---
const carnetLinkless = (items, kind) => items.forEach((it) => {
  const hasOwn = it.links && it.links.length > 0;
  const poi = it.poiRef ? poiById.get(it.poiRef) : null;
  const hasPoiLink = poi && poi.links && Object.values(poi.links).some((v) => v);
  if (!hasOwn && !hasPoiLink) out.linklessCarnet.push({ kind, id: it.id, base: it.base, poiRef: it.poiRef || null });
});
carnetLinkless(dishes, 'dish');
carnetLinkless(gems, 'gem');

// --- 10. CAD presence in POI prices ---
for (const p of pois) {
  if (p.price && p.price.range && !/\$\s?CA|\$CA|CAD/.test(p.price.range)) out.noCad.push({ id: p.id, range: p.price.range });
}

// --- 11. alt divergence (scene.alt vs images.json alt — token overlap) ---
const tok = (s) => new Set((s || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((w) => w.length > 3));
const jaccard = (a, b) => { const A = tok(a), B = tok(b); const inter = [...A].filter((x) => B.has(x)).length; const uni = new Set([...A, ...B]).size; return uni ? inter / uni : 1; };
for (const b of bases) {
  episodes[b].scenes.forEach((s, i) => {
    const img = imgById.get(s.image);
    if (img && jaccard(s.alt, img.alt) < 0.25)
      out.altDivergence.push({ scene: `${b}/${s.id}`, image: s.image, sim: +jaccard(s.alt, img.alt).toFixed(2), sceneAlt: s.alt, imgAlt: img.alt });
  });
}

out.summary = {
  images: images.length, pois: pois.length, dishes: dishes.length, gems: gems.length,
  imagesReferenced: usage.size, orphanImages: out.orphanImg.length,
  danglingImg: out.dangerImg.length, missingFile: out.missingFile.length,
  crossBaseImg: out.crossBaseImg.length, reuse: out.reuse.length,
  danglingPoi: out.danglingPoi.length, focusBoundsBad: out.focusBoundsBad.length,
  onMapGaps: out.onMapGaps.length, deadPills: out.deadPills.length,
  linklessCarnet: out.linklessCarnet.length, noCad: out.noCad.length,
  visionPending: out.visionPending.length, altDivergence: out.altDivergence.length,
};
console.log(JSON.stringify(out, null, 2));
