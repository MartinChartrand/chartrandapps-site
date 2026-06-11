import { defineConfig } from 'astro/config';

// URLs publiques préservées : site canonique, AUCUN base (chartrandapps.ca à la racine).
// CNAME et pages legacy servis depuis public/ (copié verbatim → racine du site).
export default defineConfig({
  site: 'https://chartrandapps.ca',
});
