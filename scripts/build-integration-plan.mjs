// Construit /tmp/vn-integration-plan.json à partir des matchs vérifiés au pixel.
import { writeFileSync } from 'node:fs';
const VP = '/Users/martinchartrand/Developer/chartrandapps-site/docs/v3-design-research/vietnam-photos';

const integrations = [
  { source: { uuid: '04C155B2-7C7F-427B-B4EE-E121901CA755' }, destFile: 'hanoi-bun-cha-dac-kim.jpg', slot: 'hanoi-bun-cha-dac-kim', base: 'hanoi', role: 'food', claims: 'place', confidence: 'match', rotate: 'none', photoId: 'icloud-04C155B2',
    alt: "Plateau de bún chả à Hanoi — galettes de porc grillées dans un bol de bouillon, grande assiette d'herbes fraîches, vermicelles de riz et bière locale sur une table de marbre",
    consumers: [{ kind: 'scene', id: 'scene-bun-cha', base: 'hanoi' }, { kind: 'dish', id: 'bun-cha-hanoi', base: 'hanoi' }] },

  { source: { localFile: `${VP}/hanoi/hanoi-20.jpeg` }, destFile: 'hanoi-ca-phe-trung.jpg', slot: 'hanoi-ca-phe-trung', base: 'hanoi', role: 'food', claims: 'place', confidence: 'match', rotate: '180', photoId: 'hanoi-20',
    alt: "Verre de cà phê trứng (café à l'œuf) à la mousse crémeuse dorée et son filtre phin, sur une table donnant sur un lac de Hanoi",
    consumers: [{ kind: 'scene', id: 'scene-ca-phe', base: 'hanoi' }, { kind: 'dish', id: 'ca-phe-trung-hanoi', base: 'hanoi' }] },

  { source: { uuid: 'FB5734EB-EAB1-4E0A-A058-0569F922B0B4' }, destFile: 'hanoi-vieux-quartier.jpg', slot: 'hanoi-vieux-quartier', base: 'hanoi', role: 'photo', claims: 'place', confidence: 'approx', rotate: 'none', photoId: 'icloud-FB5734EB',
    alt: "Rue du vieux quartier de Hanoi — rangée de scooters le long du trottoir, façades coloniales et passants sous les arbres dénudés",
    consumers: [{ kind: 'scene', id: 'scene-vieux-quartier', base: 'hanoi' }] },

  // marché aux poissons : sert le gem Duy Hải ET la scène gỏi cá (toutes deux poisson/côte, alts honnêtes)
  { source: { uuid: '9ABC151E-9A73-4318-97B7-918C3616EF9B' }, destFile: 'hoian-marche-poissons.jpg', slot: 'hoian-marche-poissons', base: 'hoian', role: 'photo', claims: 'place', confidence: 'approx', rotate: 'none', photoId: 'icloud-9ABC151E',
    alt: "Étals de poisson frais au sol d'un marché près de Hội An — bassines bleues et rouges de petits poissons argentés, vendeuses qui trient, béton mouillé",
    consumers: [{ kind: 'gem', id: 'duy-hai-marche-poissons-aube', base: 'hoian' }, { kind: 'scene', id: 'scene-goi-ca-nam-o', base: 'hoian' }] },

  { source: { uuid: '821E4556-EF01-4154-8112-061F7008B962' }, destFile: 'hoian-bai-rang-son-tra.jpg', slot: 'hoian-bai-rang-son-tra', base: 'hoian', role: 'photo', claims: 'place', confidence: 'approx', rotate: 'none', photoId: 'icloud-821E4556',
    alt: "Vue depuis la péninsule de Son Trà sur la baie de Đà Nẵng — eau bleu-vert, promontoire boisé et petite crique, silhouette de la ville au loin",
    consumers: [{ kind: 'gem', id: 'bai-rang-son-tra', base: 'hoian' }] },
];

// Bench : slots sans photo honnête → image vidée (carnet gère l'absence de vignette)
const benches = [
  { kind: 'dish', id: 'bia-hoi-ha-noi', base: 'hanoi' },      // selfie rejeté
  { kind: 'gem', id: 'lang-da-sy-forgerons', base: 'hanoi' }, // forgeron occidental
  { kind: 'gem', id: 'ngoc-ha-epave-b52', base: 'hanoi' },    // Tour de la Tortue ≠ épave B-52
  { kind: 'gem', id: 'ghenh-rang-galets', base: 'quynhon' },  // aucune photo
];

// Reassigns in-pool (pas d'export) : scènes orphelines qui gardent une photo existante + alt honnête.
const reassigns = [
  // Cẩm Kim : la photo de l'île n'est exportable qu'en album partagé (472px) → on garde une vraie
  // photo de campagne de Hội An (cultures maraîchères), thématiquement rurale, alt honnête.
  { slot: 'hoian-31', alt: "Cultures maraîchères dans la campagne de Hội An — rangées de légumes et terre cultivée, arrière-pays rural de l'île",
    consumers: [{ kind: 'scene', id: 'scene-cam-kim', base: 'hoian' }, { kind: 'gem', id: 'cam-kim-boucle-velo', base: 'hoian' }] },
  // Canal Nhiêu Lộc : aucune photo du canal de Saïgon → la photo existante (promenade de bord d'eau
  // à l'aube) reste, mais l'alt cesse de prétendre Saïgon — description honnête de ce qu'on voit.
  { slot: 'saigon-canal-aube', alt: "Promenade arborée au bord de l'eau à l'aube — passants, chapeau conique et vélos le long de la berge",
    consumers: [{ kind: 'scene', id: 'scene-canal-nhieu-loc', base: 'saigon' }] },
];

writeFileSync('/tmp/vn-integration-plan.json', JSON.stringify({ integrations, benches, reassigns }, null, 2));
console.log(`plan: ${integrations.length} intégrations, ${benches.length} benchs, ${reassigns.length} reassigns`);
