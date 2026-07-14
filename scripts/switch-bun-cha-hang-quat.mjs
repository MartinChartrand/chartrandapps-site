// Switch le bún chả vedette : Đắc Kim → Hàng Quạt (pick #1 de Leila/curiousaboutvietnam,
// validé sur place par Martin). Ajoute le POI sourcé, réécrit la scène, met à jour le dish.
import { readFileSync, writeFileSync } from 'node:fs';
const D = 'src/content/destinations/vietnam/';
const L = (f) => JSON.parse(readFileSync(D + f, 'utf-8'));
const pois = L('pois.json'), dishes = L('dishes.json');
const hanoi = L('episodes/hanoi.json');
const WRITE = process.argv.includes('--write');

const SRC = [
  { creator: "Leila — curiousaboutvietnam (carte bún chả Hanoi, validée sur place)", url: "https://www.instagram.com/curiousaboutvietnam/", date: "2024-01" },
  { creator: "VnExpress — Hanoi's hidden bun cha, crowded for 25 years", url: "https://e.vnexpress.net/photo/food-recipes/hanois-hidden-bun-cha-crowded-for-25-years-4607715.html", date: "2023-01" },
  { creator: "Wanderlog — Bún chả 74 Hàng Quạt", url: "https://wanderlog.com/place/details/15028501/b%C3%BAn-ch%E1%BA%A3-74-h%C3%A0ng-qu%E1%BA%A1t", date: "2024-01" },
];

// 1) Nouveau POI Hàng Quạt (inséré juste avant Đắc Kim pour l'ordre du carnet)
const poi = {
  id: 'bun-cha-hang-quat', base: 'hanoi', kind: 'resto', mapType: 'resto', roles: ['eat'], tier: null,
  name: 'Bún Chả Hàng Quạt — la cour cachée',
  blurb: "Au bout d'une ruelle d'un mètre de large, une cour où quatre familles grillent le bún chả au charbon depuis 25 ans — aucune enseigne, aucun menu anglais, le pick d'initié du Vieux Quartier.",
  signature: 'Bún chả + nem, grillé au charbon (~2–3 $CA)',
  image: null,
  price: { range: '40 000–60 000 VND (~2–3 $CA)', currency: 'VND', asOf: '2026-06' },
  coords: { lat: 21.0334, lng: 105.8505, source: 'websearch (VnExpress, Wanderlog) — niveau rue', verifiedOn: '2026-06-19' },
  links: { official: null, booking: null, tripadvisor: null, maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Bún chả 74 Hàng Quạt Hoàn Kiếm Hanoi') },
  seasonal: false,
  status: { open: true, lastChecked: '2026-06-19', method: 'websearch' },
  onMap: true,
  story: "Au 74 Hàng Quạt, pas de devanture : une ruelle d'un mètre de large qui s'enfonce sur trente mètres entre deux immeubles, et au bout, une cour. Quatre familles s'y partagent le service depuis vingt-cinq ans — l'une grille, l'autre sert, une troisième tient les boissons. Les galettes passent sur le charbon à la commande, jamais réchauffées ; la fumée monte dans la cour, le nem croustille encore à l'arrivée. Aucun menu en anglais, aucune enseigne à photographier. C'est le bún chả que les guides ne trouvent pas et que le quartier n'a jamais lâché — ouvert le midi seulement, fermé dès que c'est vendu.",
  sources: SRC, verifiedAt: '2026-06-19', approvedBy: 'human', region: 'hanoi',
};
const dkIdx = pois.findIndex((p) => p.id === 'bun-cha-dac-kim');
if (!pois.some((p) => p.id === 'bun-cha-hang-quat')) pois.splice(dkIdx, 0, poi);

// 2) Réécriture de la scène
const sc = hanoi.scenes.find((s) => s.id === 'scene-bun-cha');
sc.kicker = 'Hàng Quạt · LA COUR CACHÉE';
sc.title = 'La cour de Hàng Quạt — quatre familles, une ruelle d’un mètre';
sc.intro = "Au 74 Hàng Quạt, il n'y a pas de devanture. Juste une ruelle d'un mètre de large qui s'enfonce sur trente mètres entre deux immeubles du Vieux Quartier, et au bout, une cour où quatre familles se partagent le service depuis vingt-cinq ans — l'une grille, l'autre sert, une troisième tient les boissons. Les galettes de porc passent sur le charbon à la commande, jamais réchauffées ; la fumée monte dans la cour, le bouillon légèrement vinaigrette coupe le gras, et le nem (rouleau frit) croustille encore à l'arrivée. Aucun menu en anglais, aucune enseigne à photographier — on s'assoit, on dit « bún chả » et « nem », et on attend. C'est le bún chả que les guides ne trouvent pas et que le quartier n'a jamais lâché. Pour comparer : Đắc Kim, à Hàng Mành, l'institution d'avant le tourisme (le bol sur la photo), grillée à la commande elle aussi.";
sc.reco = "Bún Chả Hàng Quạt, 74 Hàng Quạt, Hoàn Kiếm — ouvert 9h30–14h, à dix minutes à pied du lac Hoàn Kiếm. Entrer dans la ruelle étroite et marcher jusqu'à la cour au fond. Arriver avant midi : ça ferme dès que c'est vendu. Commander le bún chả + le nem ; pointer le bol de la table voisine au besoin. Budget : 40 000–60 000 VND (~2–3 $CA). Les institutions, si la cour déborde : Đắc Kim (Hàng Mành) et Bún Chả Tuyết (34 Hàng Than, Ba Đình), même charbon, même méthode à la commande.";
sc.quote = "Pas d'enseigne, pas de menu anglais. Une ruelle d'un mètre, et au bout, la cour.";
sc.poiRef = 'bun-cha-hang-quat';
sc.sources = SRC;
// l'image reste hanoi-bun-cha-dac-kim (vraie photo de bún chả, Đắc Kim cité dans la scène) ; alt déjà générique

// 3) Dish : lead Hàng Quạt, garde les institutions, repoint poiRef
const dish = dishes.find((d) => d.id === 'bun-cha-hanoi');
dish.body = "Galettes de porc grillées au charbon + boulettes en feuilles (cha bao), dans un bol de bouillon légèrement vinaigrette avec vermicelles et herbes fraîches à côté. On trempe, on assemble, on mange vite avant que la fumée refroidisse. Le pick d'initié : Bún Chả Hàng Quạt (74 Hàng Quạt, la cour au fond d'une ruelle d'un mètre) — 40 000–60 000 VND (~2–3 $CA). Les institutions : Đắc Kim (Hàng Mành) et Bún Chả Tuyết (34 Hàng Than, Ba Đình).";
dish.poiRef = 'bun-cha-hang-quat';

if (WRITE) {
  writeFileSync(D + 'pois.json', JSON.stringify(pois, null, 2) + '\n');
  writeFileSync(D + 'dishes.json', JSON.stringify(dishes, null, 2) + '\n');
  writeFileSync(D + 'episodes/hanoi.json', JSON.stringify(hanoi, null, 2) + '\n');
  console.log('✍️  POI Hàng Quạt ajouté, scène + dish réécrits');
} else {
  console.log('DRY: +POI bun-cha-hang-quat (coords 21.0334,105.8505), scène scene-bun-cha réécrite, dish repointé');
  console.log('POIs hanoi bún chả:', pois.filter((p) => p.id.includes('bun-cha')).map((p) => p.id).join(', '));
}
