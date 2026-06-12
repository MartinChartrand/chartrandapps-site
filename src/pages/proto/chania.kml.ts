// PROTOTYPE v3 — export KML du chapitre Chania.
// Réponse au mode terrain réel de Martin (« en voyage, je vis dans Google Maps ») :
// importer ce fichier UNE fois dans Google My Maps = les POI du chapitre deviennent
// des pins dans son app Google Maps, consultables offline.
import { getCollection } from 'astro:content';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const allPois = await getCollection('pois');
  const pois = allPois
    .filter((p) => p.id.startsWith('crete/'))
    .map((p) => p.data)
    .filter((p) => p.base === 'chania' && p.onMap);

  const placemarks = pois
    .map((p) => {
      const parts = [p.blurb, p.price?.range, p.links.official, p.links.maps].filter(Boolean);
      return `  <Placemark>
    <name>${esc(p.name)}</name>
    <description>${esc(parts.join(' · '))}</description>
    <Point><coordinates>${p.coords.lng},${p.coords.lat},0</coordinates></Point>
  </Placemark>`;
    })
    .join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Chania — Crète (chartrandapps.ca)</name>
${placemarks}
</Document>
</kml>
`;

  return new Response(kml, {
    headers: { 'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8' },
  });
}
