// Fixtures dataset — cross-entrée. Crète et Turquie portent toutes deux un POI `tamam`
// (edge case PRD :155 — ids scopés par destination, pas de collision inter-dest).
import { makePoi } from './pois.mjs';

const img = (slot) => ({
  slot,
  file: `${slot}.jpg`,
  alt: `photo ${slot}`,
  layout: null,
  claims: 'atmosphere',
  credit: { source: 'unsplash', photoId: 'x', photographer: 'y', license: 'unsplash-standard' },
  sha256: slot,
  visionChecked: '2026-06-11',
});

// --- Crète : dataset cohérent ---
export const creteValid = {
  dest: 'crete',
  pois: [makePoi({ id: 'tamam', image: 'tamam-table' })],
  bases: [
    {
      slug: 'chania',
      cover: 'chania-cover',
      body: 'Trois adresses. [[poi:tamam]] dans les anciens bains turcs.',
      infoBlocks: [{ label: 'Où manger', type: 'poi-list', items: ['tamam'] }],
    },
  ],
  images: [img('tamam-table'), img('chania-cover')],
  dishes: [{ id: 'port-5h30', title: 'Le port à 5h30', body: 'avant les groupes', image: 'chania-cover' }],
  gems: [],
};

// --- Turquie : même id `tamam`, dataset distinct et cohérent ---
export const turquieValid = {
  dest: 'turquie',
  pois: [makePoi({ id: 'tamam', base: 'istanbul', image: 'istanbul-resto' })],
  bases: [
    {
      slug: 'istanbul',
      cover: 'istanbul-cover',
      body: 'Manger ici : [[poi:tamam]].',
      infoBlocks: [{ label: 'À table', type: 'poi-list', items: ['tamam'] }],
    },
  ],
  images: [img('istanbul-resto'), img('istanbul-cover')],
  dishes: [],
  gems: [],
};

// --- Invalides ---

// Slot d'image inconnu (le POI pointe un slot absent du manifest)
export const datasetUnknownSlot = {
  dest: 'crete',
  pois: [makePoi({ id: 'tamam', image: 'slot-fantome' })],
  bases: [],
  images: [img('tamam-table')],
};

// Ref `[[poi:]]` morte dans le narratif
export const datasetDeadRef = {
  dest: 'crete',
  pois: [makePoi({ id: 'tamam', image: 'tamam-table' })],
  bases: [{ slug: 'chania', cover: 'chania-cover', body: 'voir [[poi:mort]].', infoBlocks: [] }],
  images: [img('tamam-table'), img('chania-cover')],
};

// Id POI dupliqué intra-destination
export const datasetDupId = {
  dest: 'crete',
  pois: [makePoi({ id: 'tamam', image: 'tamam-table' }), makePoi({ id: 'tamam', name: 'Tamam Bis', image: 'tamam-table' })],
  bases: [],
  images: [img('tamam-table')],
};
