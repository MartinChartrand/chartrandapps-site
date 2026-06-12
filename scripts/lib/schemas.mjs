// Schémas zod par-entrée — conformes ARCHITECTURE.md §3.1-§3.6.
// zod PUR : zéro import astro. Importé à la fois par src/content.config.ts (build) et par
// les node:test (scripts/test/). Un seul endroit où vit la forme — pas de logique dupliquée.
import { z } from 'zod';

// Enums partagés (réutilisés par les loaders, le rendu et les validateurs)
export const POI_KINDS = ['hotel', 'resto', 'plage', 'sight', 'activity', 'winery', 'transport'];
export const MAP_TYPES = ['hotel', 'resto', 'plage', 'sight']; // 4 glyphes carte — découplé de kind
export const POI_ROLES = ['sleep', 'eat', 'see', 'do', 'drink'];
export const TIERS = ['budget', 'mid', 'gem'];

const linkSchema = z.object({ label: z.string(), url: z.string() });
const tagSchema = z.object({ text: z.string(), tone: z.enum(['amber', 'green']).optional() });

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date ISO YYYY-MM-DD requise');

// §3.1 destination.json
// intro : blocs titrés (.intro-block v1 — titre + corps, ex. « Pourquoi septembre » / « Logistique de base »)
const introBlockV1 = z.object({ title: z.string().default(''), body: z.string() });

export const destinationSchema = z.object({
  slug: z.string(),
  pageTitle: z.string().default(''), // <title> v1 verbatim (« Crète — Septembre 2027 · Itinéraire de voyage »)
  heroTitle: z.object({ main: z.string(), em: z.string() }),
  heroSub: z.string(),
  subtitle: z.string(),
  season: z.string(),
  travelers: z.object({ count: z.number().int(), label: z.string() }),
  arrival: z.object({ date: ISO_DATE, airport: z.string().min(1), city: z.string().min(1) }),
  departure: z.object({
    date: ISO_DATE,
    airport: z.string().min(1),
    city: z.string().min(1),
    transfer: z.object({ body: z.string(), links: z.array(linkSchema).default([]) }).optional(),
  }),
  theme: z.object({ favicon: z.string(), palette: z.string() }),
  hero: z.object({ image: z.string(), label: z.string() }),
  overviewKicker: z.string().default(''), // .section-num v1 (« Logique du voyage »)
  overviewTitle: z.string().default(''),  // h2.section-title v1 (« Quatre bases, mouvement minimal »)
  overviewIntro: z.string(),              // p.section-intro v1
  intro: z.object({ whySeason: introBlockV1, logistics: introBlockV1 }),
  footerNote: z.string().default(''),     // footer v1 (« Itinéraire préparé avec amour · … »)
});

// §3.2 infoBlocks — composition éditoriale ORDONNÉE (pas un filtre par kind)
export const infoBlockSchema = z
  .object({
    label: z.string(),
    type: z.enum(['poi-list', 'prose', 'tags']),
    items: z.array(z.string()).optional(),
    body: z.string().optional(),
    tags: z.array(tagSchema).optional(),
    footer: z.string().optional(),
  })
  .superRefine((b, ctx) => {
    if (b.type === 'poi-list' && (!b.items || b.items.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "poi-list" requiert items', path: ['items'] });
    if (b.type === 'prose' && !b.body)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "prose" requiert body', path: ['body'] });
    if (b.type === 'tags' && (!b.tags || b.tags.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "tags" requiert tags', path: ['tags'] });
  });

// §3.2 bases/<nn>-<slug>.md — frontmatter du narratif
export const baseSchema = z.object({
  order: z.number().int(),
  slug: z.string(),
  title: z.string(),
  kicker: z.string().optional(),
  nights: z.number().int(),
  dates: z.string(),
  focus: z.string(),
  subtitle: z.string(),
  summary: z.string(),
  pullquote: z.string().optional(),
  cover: z.string(),
  access: z.object({ body: z.string(), links: z.array(linkSchema).default([]) }).optional(),
  notes: z.array(z.object({ kind: z.string(), body: z.string() })).optional(),
  tagBlock: z.object({ label: z.string(), tags: z.array(tagSchema) }).optional(),
  infoBlocks: z.array(infoBlockSchema).default([]),
  mapLabel: z.string().optional(), // .map-label v1 (« Carte — Chania et environs »)
  // Hébergements v1 hors MAPS (pas de coords, pas de POI) — cartes accom non géolocalisées.
  // Rendus par AccomGrid après les POIs sleep. N'ajoute PAS de POI (comptes figés).
  accomExtras: z
    .array(
      z.object({
        name: z.string(),
        tier: z.enum(TIERS).nullable().default(null),
        price: z.string().default(''),
        blurb: z.string(),
        image: z.string().default(''),
        links: z.array(linkSchema).default([]),
      })
    )
    .optional(),
});

// §3.3 pois.json — la donnée vérifiable (le cœur)
const priceSchema = z.object({
  range: z.string(),
  currency: z.string(),
  asOf: z.string(), // un prix sans date est un mensonge en devenir (§3.3 :184)
});
const coordsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  source: z.string(),
  verifiedOn: z.string(),
});
const statusSchema = z.object({
  open: z.boolean(),
  lastChecked: z.string(), // requis (§3.3 :194)
  method: z.string(),
});

export const poiSchema = z
  .object({
    id: z.string(),
    base: z.string(),
    kind: z.enum(POI_KINDS),
    mapType: z.enum(MAP_TYPES),
    roles: z.array(z.enum(POI_ROLES)).min(1),
    tier: z.enum(TIERS).nullable().default(null),
    name: z.string(),
    blurb: z.string(),
    signature: z.string().optional(),
    image: z.string().nullable(), // slot du manifest images, ou null si le v1 n'avait pas d'image pour ce POI
    price: priceSchema,
    coords: coordsSchema.optional(),
    links: z
      .object({
        official: z.string().nullable().optional(),
        booking: z.string().nullable().optional(),
        tripadvisor: z.string().nullable().optional(),
        maps: z.string().nullable().optional(),
      })
      .default({}),
    extraLinks: z.array(linkSchema).optional(),
    seasonal: z.boolean().default(false),
    status: statusSchema,
    onMap: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (p.onMap && !p.coords)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'coords obligatoires si onMap', path: ['coords'] });
  });

// §3.4 dishes.json / gems.json — entités éditoriales (PAS des POIs)
const editorialSchema = z.object({
  id: z.string(),
  group: z.string().optional(), // titre du bloc v1 (« Incontournables foodie — Chania ») — un bloc rendu par groupe
  title: z.string(),
  body: z.string(),
  poiRef: z.string().optional(), // rattache au POI vérifiable quand l'item EST un business
  links: z.array(linkSchema).optional(),
  image: z.string(),
});
export const dishSchema = editorialSchema;
export const gemSchema = editorialSchema;

// §3.5 budget.json — totaux calculés des lignes
export const budgetSchema = z.object({
  kicker: z.string().optional(), // .section-num v1 (« Finances »)
  title: z.string().optional(),  // h2.section-title v1 (« Budget estimé »)
  intro: z.string().optional(),  // p.section-intro v1 (taux de référence, niveau de confort…)
  statCards: z
    .array(
      z
        .object({
          value: z.string().optional(),
          computed: z.enum(['total', 'perPerson', 'perDay']).optional(),
          label: z.string(),
        })
        .superRefine((c, ctx) => {
          if (!!c.value === !!c.computed)
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'statCard requiert exactement un de value|computed' });
        })
    )
    .default([]),
  lines: z.array(z.object({ label: z.string() }).passthrough()).default([]),
  scenarios: z.array(z.object({ name: z.string(), total: z.union([z.number(), z.string()]).optional(), desc: z.string() }).passthrough()).default([]),
  advice: z.string().optional(),
});

// §3.6 images.json — manifest ; sha256 = unicité GLOBALE par contenu
// Une entrée par USAGE (slot) — plusieurs slots peuvent partager le même file/sha256
// (réutilisation v1, allowlistée dans image-reuse.allow.json).
export const IMAGE_ROLES = ['hero', 'cover', 'photo', 'accom', 'resto', 'foodie', 'food'];
export const imageSchema = z.object({
  slot: z.string(),
  base: z.string().nullable().default(null), // slug du chapitre v1 qui contient cet usage (null = hero/hors-chapitre)
  role: z.enum(IMAGE_ROLES).default('photo'),
  file: z.string(),
  alt: z.string(),
  layout: z.enum(['wide', 'tall']).nullable().default(null),
  claims: z.enum(['atmosphere', 'place']), // "place" interdit au stock (lint ticket 60)
  credit: z.object({
    source: z.string(),
    photoId: z.string(),
    photographer: z.string(),
    license: z.string(),
  }),
  sha256: z.string(),
  visionChecked: z.string(), // invalidé si sha256 OU alt change
});

// pratique : §3 ne spécifie PAS de forme exacte (cf. recherche). Schéma minimal non-inventif,
// à raffiner quand un consommateur réel (PratiqueGrid §4) l'exigera.
export const pratiqueSchema = z
  .object({
    groups: z
      .array(
        z.object({
          label: z.string(),
          items: z.array(z.object({ label: z.string(), body: z.string() }).passthrough()).default([]),
        })
      )
      .default([]),
  })
  .passthrough();
