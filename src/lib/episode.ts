// Helpers partagés du « mode épisode » (ADR-7) — extraits de proto/chania.astro +
// proto/seville.astro, qui dupliquaient intégralement cette infra (~120 l. ×2).
// RÈGLE : ce module ne contient AUCUN contenu éditorial (scenes, beats, footers,
// titres de carnet, overrides de vignettes restent dans la page). Que de la
// mécanique : chargement des collections, résolution d'images, transformations.
// Golden-master : la sortie HTML des protos doit rester byte-identique après extraction.
import { getCollection, type CollectionEntry } from 'astro:content';
import { ui, type UiLang } from './ui-strings';

export type Poi = CollectionEntry<'pois'>['data'];

// Pills de liens d'un POI — toute reco = lien cliquable (critère CI).
export type Pill = { label: string; url: string };

// Source de provenance (ADR-2) — affichée sous le récit déplié dans le carnet.
export type Source = { creator: string; url: string; date?: string };

export type CarnetRow = {
  id?: string; dataPoi?: string; thumbSrc?: string; thumbAlt?: string; thumbFood?: boolean;
  name: string; price?: string; blurb?: string; pills: Pill[]; forcePillRow?: boolean;
  story?: string; sources?: Source[]; // récit sourcé (ADR-5) — dépliable « le récit », vide => pas de toggle
};

// Forme brute d'un beat de carte (cold open / montage) AVANT résolution d'images.
// fly XOR bounds selon le beat → les deux optionnels (cf. (b as any) de l'origine).
export type RawBeat = {
  fly?: string; bounds?: string; targets: string[];
  thumb?: string; thumbAlt?: string; kicker: string; body: string; pills: Pill[];
};

// Glob build-time des assets — chemin absolu depuis la racine projet, donc résout
// identiquement peu importe le module appelant (était dupliqué dans chaque proto).
const pageAssets = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

export type EpisodeOptions = {
  // Override de vignettes pixel-vérifiées (ex: crète a un manifest décalé ; andalousie non).
  carnetThumbs?: Record<string, { slot: string; alt: string }>;
  // Langue du chrome — les labels de pills générés ici (« Site officiel ») en dépendent.
  // Défaut 'fr' : les 7 sites existants ne bougent pas.
  lang?: UiLang;
};

// Charge le contexte d'un épisode (dest + base) et retourne les helpers bindés sur ses données.
export async function createEpisode(dest: string, baseSlug: string, opts: EpisodeOptions = {}) {
  const [allBases, allPois, allDishes, allGems, allImages] = await Promise.all([
    getCollection('bases'),
    getCollection('pois'),
    getCollection('dishes'),
    getCollection('gems'),
    getCollection('images'),
  ]);

  const baseEntry = allBases.find((b) => {
    const fp = (b as any).filePath as string | undefined;
    const inDest = fp ? fp.includes(`/${dest}/`) : b.id.startsWith(`${dest}/`);
    return inDest && b.data.slug === baseSlug;
  });
  if (!baseEntry) throw new Error(`Base introuvable : ${dest}/${baseSlug}`);
  const bd = baseEntry.data;

  const pois = allPois
    .filter((p) => p.id.startsWith(`${dest}/`))
    .map((p) => p.data)
    .filter((p) => p.base === baseSlug);

  // dishes/gems dest-scopés PUIS scopés par base si le champ `base` est présent (multi-bases, ADR-2).
  // Additif : un item sans `base` reste visible partout (rétrocompat v2/crete/turquie) ; avec `base`,
  // il n'apparaît que dans le carnet de son chapitre (sinon Ronda polluerait le carnet de Séville).
  const inBase = (x: { base?: string }) => !x.base || x.base === baseSlug;
  const dishes = allDishes.filter((d) => d.id.startsWith(`${dest}/`)).map((d) => d.data).filter(inBase);
  const gems = allGems.filter((g) => g.id.startsWith(`${dest}/`)).map((g) => g.data).filter(inBase);

  const imageManifest = allImages
    .filter((i) => i.id.startsWith(`${dest}/`))
    .map((i) => i.data);

  function resolveSlot(slot: string | null | undefined): string | undefined {
    if (!slot) return undefined;
    const entry = imageManifest.find((i) => i.slot === slot);
    if (!entry) {
      console.warn(`[proto] ${dest}: slot "${slot}" absent du manifest images.json`);
      return undefined;
    }
    const mod = pageAssets[`/src/assets/destinations/${dest}/${entry.file}`];
    if (!mod) {
      console.warn(`[proto] ${dest}: fichier "${entry.file}" introuvable (slot "${slot}")`);
      return undefined;
    }
    return mod.default.src;
  }

  const poi = (id: string): Poi => {
    const p = pois.find((x) => x.id === id);
    if (!p) throw new Error(`[proto] POI introuvable : ${id}`);
    return p;
  };

  const t = ui(opts.lang);
  function poiPills(p: Poi): Pill[] {
    const pills: Pill[] = [];
    if (p.links.maps) pills.push({ label: t.pillMaps, url: p.links.maps });
    if (p.links.official) pills.push({ label: t.pillOfficial, url: p.links.official });
    if (p.links.booking) pills.push({ label: 'Booking', url: p.links.booking });
    if (p.links.tripadvisor) pills.push({ label: 'TripAdvisor', url: p.links.tripadvisor });
    for (const l of p.extraLinks ?? []) pills.push({ label: l.label, url: l.url });
    return pills;
  }

  // Markers de la carte (mêmes données que MapSection v2)
  const mapMarkers = pois
    .filter((p) => p.onMap)
    .map((p) => ({ id: p.id, name: p.name, mapType: p.mapType, coords: p.coords }));

  // Vue d'ouverture : cadre tous les POI du chapitre
  const allCoords = mapMarkers.map((m) => `${m.coords.lat},${m.coords.lng}`).join(';');
  const kmlCount = pois.filter((p) => p.onMap).length;

  // L'ordre éditorial du carnet vient des poi-lists d'infoBlocks (collections = ordre alpha sinon).
  const infoOrder: string[] = (bd.infoBlocks ?? []).flatMap((b: any) =>
    b.type === 'poi-list' ? b.items : []
  );
  const rank = (id: string) => {
    const i = infoOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const byKind = (kinds: string[]) =>
    pois.filter((p) => kinds.includes(p.kind)).sort((a, b) => rank(a.id) - rank(b.id));

  const proseBlocks = (bd.infoBlocks ?? []).filter((b: any) => b.type === 'prose');

  // Vignettes du carnet : l'alt des vignettes = le nom de l'item (les alts du manifest
  // peuvent être décalés → faux vert vision-check ; on n'en hérite pas).
  const carnetThumbs = opts.carnetThumbs ?? {};
  function poiThumb(p: Poi): { src?: string; alt: string } {
    const o = carnetThumbs[p.id];
    if (o) return { src: resolveSlot(o.slot), alt: o.alt };
    if (p.image) return { src: resolveSlot(p.image), alt: p.name };
    return { src: undefined, alt: '' };
  }

  // Transformation d'un beat brut vers la shape du composant (résolution d'image ici).
  const toBeat = (b: RawBeat) => ({
    fly: b.fly,
    bounds: b.bounds,
    targets: b.targets,
    thumbSrc: resolveSlot(b.thumb),
    thumbAlt: b.thumbAlt,
    kicker: b.kicker,
    body: b.body,
    pills: b.pills,
  });

  // Mapping POI → rangée de carnet (identique dans les deux protos).
  const carnetRow = (p: Poi): CarnetRow => {
    const t = poiThumb(p);
    return {
      id: `carnet-${p.id}`,
      dataPoi: p.onMap ? p.id : undefined,
      thumbSrc: t.src,
      thumbAlt: t.alt,
      name: p.name,
      price: p.price?.range,
      blurb: p.blurb,
      story: p.story,
      sources: p.sources,
      pills: poiPills(p),
      forcePillRow: true,
    };
  };

  return {
    bd, pois, dishes, gems, imageManifest,
    resolveSlot, poi, poiPills, poiThumb, toBeat, carnetRow,
    mapMarkers, allCoords, kmlCount, infoOrder, rank, byKind, proseBlocks,
  };
}
