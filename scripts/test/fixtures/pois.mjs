// Fixtures POI — par-entrée. Valides + invalides pour exercer les refinements zod (§3.3).

export function makePoi(overrides = {}) {
  return {
    id: 'tamam',
    base: 'chania',
    kind: 'resto',
    mapType: 'resto',
    roles: ['eat'],
    tier: null,
    name: 'Tamam',
    blurb: 'Anciens bains turcs du XVIe.',
    signature: 'végétarien remarquable — réserver',
    image: 'tamam-table',
    price: { range: '15–25 €', currency: 'EUR', asOf: '2026-04' },
    coords: { lat: 35.5165, lng: 24.0163, source: 'nominatim', verifiedOn: '2026-04-16' },
    links: { official: 'https://example.org', booking: null, tripadvisor: null, maps: null },
    seasonal: false,
    status: { open: true, lastChecked: '2026-06-11', method: 'websearch' },
    onMap: true,
    ...overrides,
  };
}

// Valide : onMap true AVEC coords, price.asOf présent, status.lastChecked présent
export const validPoi = makePoi();

// Valide : pas sur la carte, donc coords facultatives
export const validPoiOffMap = makePoi({ onMap: false, coords: undefined });

// Invalide : onMap true SANS coords (coords obligatoires si onMap)
export const poiNoCoordsOnMap = makePoi({ onMap: true, coords: undefined });

// Invalide : price sans asOf
export const poiNoAsOf = makePoi({ price: { range: '15–25 €', currency: 'EUR' } });

// Invalide : status sans lastChecked
export const poiNoLastChecked = makePoi({ status: { open: true, method: 'websearch' } });

// Invalide : kind hors enum
export const poiBadKind = makePoi({ kind: 'spaceship' });
