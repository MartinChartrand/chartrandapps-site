// Schémas zod par-entrée — conformes ARCHITECTURE.md §3.1-§3.6.
// zod PUR : zéro import astro. Importé à la fois par src/content.config.ts (build) et par
// les node:test (scripts/test/). Un seul endroit où vit la forme — pas de logique dupliquée.
import { z } from 'zod';

// Enums partagés (réutilisés par les loaders, le rendu et les validateurs)
export const POI_KINDS = ['hotel', 'resto', 'plage', 'sight', 'activity', 'winery', 'transport'];
export const MAP_TYPES = ['hotel', 'resto', 'plage', 'sight']; // 4 glyphes carte — découplé de kind
export const POI_ROLES = ['sleep', 'eat', 'see', 'do', 'drink'];
export const TIERS = ['budget', 'mid', 'gem'];
// §v3 — carnet de bouche : type d'item gustatif (ADR-2, docs/v3-design-research/v3-generalisation-decisions.md)
export const DISH_TYPES = ['plat', 'vin', 'bière', 'alcool', 'produit'];

const linkSchema = z.object({ label: z.string(), url: z.string() });
const tagSchema = z.object({ text: z.string(), tone: z.enum(['amber', 'green']).optional() });

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date ISO YYYY-MM-DD requise');
// Date de SOURCE : précision mois acceptée (YYYY-MM ou YYYY-MM-DD). Les dates exactes des vidéos
// YouTube sont publiquement masquées (date relative « il y a X ans ») ; le jour exact n'est pas
// vérifiable sans la Data API. L'année/mois suffit pour ce à quoi la date sert : le test d'indépendance
// temporelle (ADR-2 — séjours disjoints) et la revalidation. Les dates de VOYAGE gardent ISO_DATE strict.
const SOURCE_DATE = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'date de source YYYY-MM ou YYYY-MM-DD requise');

// §v3 — provenance & carnet de bouche (champs ADDITIFS, tous optionnels — ADR-1/2/3).
// La règle de convergence ≥2 sources (et singleSourceTrusted) vit dans le skill + un validateur CI,
// JAMAIS ici : une superRefine qui l'exige casserait le contenu v2 existant (zéro source).
// `stale` est ÉCRIT par le pipeline/script de revalidation, JAMAIS dérivé en Zod — un schéma qui
// dépend de Date.now() rend le build non-déterministe (vert aujourd'hui, rouge dans 25 mois).
export const sourceSchema = z.object({
  creator: z.string(),
  url: z.string(),       // contenu PRIMAIRE du créateur (sa vidéo/son post), jamais un agrégateur tiers (ADR-4)
  date: SOURCE_DATE,     // publication / visite documentée — précision mois acceptée (vidéos YouTube)
});
const provenanceFields = {
  story: z.string().optional(),                // narratif riche (ADR-5) ; vide => non affiché (décision rendu)
  sources: z.array(sourceSchema).optional(),
  verifiedAt: ISO_DATE.optional(),             // dernière validation humaine, distincte de source.date
  stale: z.boolean().optional(),               // écrit par la revalidation, jamais calculé au build
  singleSourceTrusted: z.boolean().optional(), // 1 créateur d'autorité vérifiée (destinations peu couvertes)
  approvedBy: z.enum(['human']).optional(),    // ADR-3 : pas de publication auto
  region: z.string().optional(),               // sous-région pour la recherche must-eat dédiée
};

// §3.1 destination.json
// intro : blocs titrés (.intro-block v1 — titre + corps, ex. « Pourquoi septembre » / « Logistique de base »)
const introBlockV1 = z.object({ title: z.string().default(''), body: z.string() });

// §v3 ADR-5 — tuile d'épisode du container. Le titre EST le hook (pas « Épisode 1 » générique).
// `image` = slot scellé OU absent (un chapitre encore en recherche n'a pas d'image vérifiée →
// tuile texte, JAMAIS de stock menteur — Loi 3 du contrat). La route dérive « live vs à venir »
// de l'EXISTENCE d'un épisode à <dest>/episodes/<base> (source de vérité unique), pas d'un flag à la main.
const containerTileSchema = z.object({
  base: z.string(),               // slug de la base (clé de jointure vers la collection episodes)
  kicker: z.string().default(''), // petit label factuel (« Chapitre 1 · 7 nuits »)
  title: z.string(),              // titre accrocheur = le hook du chapitre
  teaser: z.string().default(''), // une ligne — appétit (live) ou fait d'itinéraire (à venir)
  image: z.string().optional(),   // slot scellé du manifest ; absent = pas d'image (à venir)
});

// §v3 ADR-5 — le bloc container complet (hook + tuiles). La grille factuelle n'est PAS ici :
// elle est dérivée à la route des champs existants (arrival/departure/season/budget) — zéro duplication.
const containerSchema = z.object({
  hookKicker: z.string().default(''), // sur-titre (« Un mois · cinq bases »)
  hookTitle: z.string(),              // le hook du voyage entier (voix de Martin)
  hookBody: z.string(),               // la tension/le fil conducteur, grammaire Bourdain
  hookImage: z.string(),              // slot scellé — fond du hook (plein cadre)
  sources: z.array(sourceSchema).default([]), // red flag Léa : le hook porte ses sources
  tilesIntro: z.string().default(''), // ligne d'intro au-dessus de la grille de tuiles
  tiles: z.array(containerTileSchema).default([]),
});

export const destinationSchema = z.object({
  slug: z.string(),
  // Langue du CHROME de rendu (boutons, aria, labels générés) — le contenu suit ses données.
  // Additif : défaut 'fr', les 7 sites existants ne changent pas. Née avec scotland (1er site EN).
  lang: z.enum(['fr', 'en']).default('fr'),
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
  // §style-imagerie-voyage — image de la CARTE sur la landing (1re impression qui doit POP :
  // une crique, une assiette, la vie — jamais un still muséal). Optionnel : si absent, la home
  // retombe sur hero.image. Découplé du hook/concept (ex. Cyclades : carte = crique turquoise,
  // mais hero/concept = les lions de Délos).
  cardImage: z.string().optional(),
  overviewKicker: z.string().default(''), // .section-num v1 (« Logique du voyage »)
  overviewTitle: z.string().default(''),  // h2.section-title v1 (« Quatre bases, mouvement minimal »)
  overviewIntro: z.string(),              // p.section-intro v1
  intro: z.object({ whySeason: introBlockV1, logistics: introBlockV1 }),
  footerNote: z.string().default(''),     // footer v1 (« Itinéraire préparé avec amour · … »)
  // §v3 ADR-2 — flag ADDITIF (default false) : cette destination utilise le modèle « épisode »
  // (container + un scrollytelling par base). Gouverne le rendu container (ADR-5, à venir).
  // crete/turquie en prod restent false → rendu v2 long-scroll intact. JAMAIS de scission globale.
  episodic: z.boolean().default(false),
  // Nombre de chapitres affiché dans la topbar épisode (« Ch. 1/5 »). Optionnel : si absent,
  // la route prend le nombre de bases existantes. Permet d'annoncer un voyage à 5 étapes quand
  // une seule base est encore bâtie (Andalousie : 1 base, mais 5 chapitres planifiés).
  chapterTotal: z.number().int().optional(),
  // §v3 ADR-5 — le CONTAINER (survol) : ce que /[dest]/ rend quand episodic=true.
  // Décision 5 (modele-voyage-container-decisions.md) : NI vue factuelle plate NI top-5 highlights,
  // mais (1) un HOOK narratif (la tension du voyage entier, voix de Martin, grammaire Bourdain),
  // (2) une grille factuelle ultra-condensée (dérivée des champs existants : dates/nuits/aéroports/budget),
  // (3) des TUILES d'épisodes (le hook réel de chaque chapitre, pas « Épisode 1/5 » générique).
  // Composé À LA MAIN ici, JAMAIS auto-extrait (la magie pète sinon — Architecte). Red flag de Léa :
  // un élément du container sans source vérifiable n'existe pas → `sources` requis sur le hook.
  // Optionnel : crete/turquie (episodic=false) n'ont pas ce bloc → rendu v2 long-scroll intact.
  container: containerSchema.optional(),
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
    links: z.array(linkSchema).default([]), // liens v1 du bloc (link-rows + <a> inline) — critère : toute reco a un lien cliquable
  })
  .superRefine((b, ctx) => {
    if (b.type === 'poi-list' && (!b.items || b.items.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "poi-list" requiert items', path: ['items'] });
    if (b.type === 'prose' && !b.body)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "prose" requiert body', path: ['body'] });
    if (b.type === 'tags' && (!b.tags || b.tags.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'infoBlock type "tags" requiert tags', path: ['tags'] });
  });

// §v3 ADR-2 — le bloc ÉPISODE : la fiche que la machine à saucisse REMPLIT (pas un humain).
// C'est la composition scrollytelling (cold open + scènes Bourdain + montage), OUTPUT de la
// recherche sourcée. ADDITIF (optionnel) : une base sans `episode` rend uniquement en v2.
// Le rendu (route [dest]/[base]/) résout pills/coords/images depuis les POIs vérifiés — la fiche
// référence par `poiRef`/slot, elle ne duplique JAMAIS une URL ou une coordonnée.

// Pill d'épisode : soit dérivée d'un POI (url = poi.links[link]), soit un lien littéral.
const episodePillSchema = z.union([
  z.object({ poiRef: z.string(), link: z.enum(['maps', 'official', 'booking', 'tripadvisor']).default('maps'), label: z.string() }),
  linkSchema, // { label, url } — lien littéral (externe, ancre #carnet…)
]);

// Beat de carte (cold open / montage). fly via focusPoi+zoom XOR cadrage via boundsPois.
// pills : soit auto depuis `poiRef` (poiPills complet), soit la liste explicite `pills`.
const episodeBeatSchema = z
  .object({
    kicker: z.string(),
    body: z.string(),
    focusPoi: z.string().optional(),          // → data-fly = coords(focusPoi)+zoom
    zoom: z.number().optional(),
    boundsPois: z.array(z.string()).optional(), // → data-bounds = coords de chaque POI
    targets: z.array(z.string()).default([]),   // POI mis en évidence (halo + nom)
    thumb: z.string().optional(),               // slot vignette
    thumbAlt: z.string().optional(),
    poiRef: z.string().optional(),              // pills auto (poiPills) si `pills` absent
    pills: z.array(episodePillSchema).optional(),
    sources: z.array(sourceSchema).optional(),  // provenance du claim (la machine l'attache)
  })
  .superRefine((b, ctx) => {
    if (b.focusPoi && b.boundsPois)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'beat : focusPoi OU boundsPois, pas les deux', path: ['focusPoi'] });
  });

// Scène storybook (test Bourdain : qui ? pourquoi ? on commande quoi ?). pills auto depuis poiRef.
const episodeSceneSchema = z.object({
  id: z.string().optional(),     // ancre HTML (dérivée de l'index si absente)
  kicker: z.string(),
  title: z.string(),
  image: z.string(),             // slot photo pleine page
  alt: z.string(),               // = le claim (filet vision)
  intro: z.string(),
  reco: z.string(),
  quote: z.string().nullable().default(null),
  via: linkSchema.nullable().default(null), // provenance créateur affichée (« 📺 X en a fait un épisode »)
  poiRef: z.string().optional(),            // pills auto (poiPills) si `pills` absent
  pills: z.array(episodePillSchema).optional(),
  sources: z.array(sourceSchema).optional(),
});

// Carnet (mode terrain) : groupes de POI par `kinds`, ordre + labels + footers éditoriaux.
// Le groupe qui contient 'hotel' reçoit les accomExtras (hébergements hors-carte). Générique.
const episodeCarnetSchema = z.object({
  groups: z.array(z.object({
    label: z.string(),
    kinds: z.array(z.enum(POI_KINDS)),
    footer: z.string().optional(),
  })),
  dishesTitle: z.string(),                                  // « Le carnet de bouche »
  gemsTitle: z.string().default('Pépites locales'),
});

export const episodeSchema = z.object({
  coldOpen: z.array(episodeBeatSchema).default([]),
  scenes: z.array(episodeSceneSchema).default([]),
  montage: z.array(episodeBeatSchema).default([]),
  carnet: episodeCarnetSchema,
  // Fermeture de l'épisode (voix de Martin — « l'épisode c'est l'apéro ; le carnet, c'est l'outil »).
  // `body` peut contenir {count} → remplacé par le nombre de lieux du chapitre.
  outro: z.object({
    kicker: z.string(),
    body: z.string(),
    nextLabel: z.string(),
    nextHref: z.string(),
  }),
  // Override de vignettes pixel-vérifiées (manifest décalé, ex. crète). Vide = lit p.image.
  carnetThumbs: z.record(z.object({ slot: z.string(), alt: z.string() })).optional(),
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
    ...provenanceFields, // §v3 additifs (story/sources/verifiedAt/stale/singleSourceTrusted/approvedBy/region)
  })
  .superRefine((p, ctx) => {
    if (p.onMap && !p.coords)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'coords obligatoires si onMap', path: ['coords'] });
  });

// §3.4 dishes.json / gems.json — entités éditoriales (PAS des POIs)
const editorialSchema = z.object({
  id: z.string(),
  group: z.string().optional(), // titre du bloc v1 (« Incontournables foodie — Chania ») — un bloc rendu par groupe
  base: z.string().optional(),  // §v3 ADR-2 — scope le carnet de bouche par épisode (multi-bases). Additif :
                                // absent = visible partout (rétrocompat v2/crete/turquie) ; présent = ce chapitre seulement.
  title: z.string(),
  body: z.string(),
  poiRef: z.string().optional(), // rattache au POI vérifiable quand l'item EST un business
  links: z.array(linkSchema).optional(),
  image: z.string(),
  ...provenanceFields, // §v3 additifs — provenance & carnet de bouche
});
// dishes = items du carnet de bouche → portent `type` (plat|vin|bière|alcool|produit) ; gems = éditorial non-gustatif.
export const dishSchema = editorialSchema.extend({ type: z.enum(DISH_TYPES).optional() });
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
  // ADR-5 — vision-check SÉMANTIQUE (test de l'ami-témoin) : ÉCRIT par scripts/vision-images.mjs
  // (réseau, claude vision). Le fichier image dépeint-il bien ce que son `alt` (= le claim) affirme ?
  // N'importe qui qui connaît le lieu/plat juge l'image contre sa mémoire — aucune image ne doit trahir
  // son claim. Auto-invalidant : la garde offline (validate-images.mjs §4, dans validate:fast) compare
  // sha256+alt au sceau ; image ou alt qui change → périmé → rouge → re-check. `mismatch` persisté reste
  // rouge en CI jusqu'à correction ; absent = jamais vérifié = inverifiable (jaune). Corrige les alts décalés.
  visionCheckedSemantic: z
    .object({
      sha256: z.string(),                                    // sha256 au moment du check
      alt: z.string(),                                       // alt (claim) vérifié au moment du check
      verdict: z.enum(['match', 'mismatch', 'unverifiable']),
      checkedAt: ISO_DATE,
    })
    .optional(),
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
