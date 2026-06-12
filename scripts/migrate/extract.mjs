#!/usr/bin/env node
/**
 * extract.mjs — HTML v1 → arborescence §3 (pois, bases, budget, pratique, images)
 * Usage: node scripts/migrate/extract.mjs <html-file> <outdir>
 * Exit 0 = OK, 2 = parse fail
 *
 * One-shot migration script — gelé, jamais maintenu, commité pour traçabilité.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extrait le premier match entre deux patterns regex dans une string */
function between(html, openRx, closeRx) {
  const m = html.match(openRx);
  if (!m) return null;
  const start = m.index + m[0].length;
  const tail = html.slice(start);
  const end = tail.search(closeRx);
  if (end === -1) return tail;
  return tail.slice(0, end);
}

/** Strip toutes les balises HTML */
function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Decode HTML entities */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Convertit du HTML curatorial simple → Markdown, remplace <a> par [[poi:id]] si match */
function htmlToMd(html, poiNameToId) {
  let md = html;

  // h4 → #### heading
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gs, (_, inner) => `\n\n#### ${stripTags(inner)}\n\n`);

  // <strong> → **
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gs, (_, inner) => `**${stripTags(inner)}**`);

  // <em> → *
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gs, (_, inner) => `*${stripTags(inner)}*`);

  // <sup> → inline (ignorer la sémantique, garder le texte)
  md = md.replace(/<sup[^>]*>(.*?)<\/sup>/gs, (_, inner) => stripTags(inner));

  // <a> → [[poi:id]] si le nom matche un POI, sinon [text](url)
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gs, (_, href, inner) => {
    const text = stripTags(inner).trim();
    if (poiNameToId) {
      const id = findPoiIdByName(text, poiNameToId);
      if (id) return `[[poi:${id}]]`;
    }
    return `[${text}](${href})`;
  });

  // <br> → newline
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // <p> → paragraph
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gs, (_, inner) => `${inner.trim()}\n\n`);

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode entities
  md = decodeEntities(md);

  // Normalize whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

/** Convertit un nom de lieu en slug kebab-case ASCII */
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Trouve l'ID d'un POI par son nom (correspondance approximative) */
function findPoiIdByName(name, poiNameToId) {
  const slug = toSlug(name);
  if (poiNameToId[slug]) return poiNameToId[slug];
  // Chercher par inclusion partielle
  for (const [k, v] of Object.entries(poiNameToId)) {
    if (slug.startsWith(k) || k.startsWith(slug)) return v;
  }
  return null;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Parse l'objet MAPS JS depuis le HTML */
function parseMAPS(html) {
  const maps = {};

  // Parser chaque entrée de MAPS
  const mapEntryRx = /'(map-[^']+)'\s*:\s*\{[^{]*?center[^[]*?\[[^\]]*\][^,]*,\s*zoom:\s*\d+\s*,\s*markers:\s*\[([\s\S]*?)\]\s*\}/g;
  let match;
  while ((match = mapEntryRx.exec(html)) !== null) {
    const mapId = match[1];
    const markersStr = match[2];
    const markers = [];

    // Support both single and double quoted names
    const markerRx = /\{\s*type:'([^']+)',\s*name:(?:'([^']*(?:''[^']*)*)'|"([^"]+)"),\s*lat:([\d.-]+),\s*lng:([\d.-]+),\s*link:'([^']*)'\s*\}/g;
    let mm;
    while ((mm = markerRx.exec(markersStr)) !== null) {
      markers.push({
        type: mm[1],
        name: mm[2] !== undefined ? mm[2] : mm[3],
        lat: parseFloat(mm[4]),
        lng: parseFloat(mm[5]),
        link: mm[6]
      });
    }

    maps[mapId] = markers;
  }

  return maps;
}

/** Parse destination.json depuis le hero et le head */
function parseDestination(html, slug) {
  const title = between(html, /<title>/, /<\/title>/);
  // "Crète — Septembre 2027 · Itinéraire de voyage" → heroTitle
  const titleParsed = title ? title.split('—')[0].trim() : slug;
  // FIX 1a: strip l'année du titleEm ("Septembre 2027" → "septembre", "Septembre–Octobre 2027" → "septembre–octobre")
  const rawTitleEm = title ? (title.split('—')[1] || '').split('·')[0].trim() : '';
  const titleEm = rawTitleEm.replace(/\s*\d{4}.*$/, '').trim().toLowerCase();

  const heroSub = between(html, /class="hero-sub"[^>]*>/, /<\//)?.replace(/<[^>]+>/g, '').trim() || '';

  // PHASE 2 : kicker + titre + intro de la vue d'ensemble (trois éléments distincts en v1)
  // .section-num (« Logique du voyage ») · h2.section-title (« Quatre bases, mouvement minimal ») · p.section-intro
  const overviewKicker = between(html, /class="section-num"[^>]*>/, /<\/span>/)?.replace(/<[^>]+>/g, '').trim() || '';
  const overviewTitleRaw = between(html, /class="section-title"[^>]*>/, /<\/h2>/) || '';
  const overviewTitle = stripTags(overviewTitleRaw.replace(/<br\s*\/?>/gi, ' '));
  const overviewIntro = between(html, /class="section-intro"[^>]*>/, /<\/p>/)?.replace(/<[^>]+>/g, '').trim() || '';

  // intro blocks (pourquoi + logistique) — AVEC titres (.intro-block-title)
  const introBlocks = [];
  const introBlockRx = /class="intro-block"[^>]*>[\s\S]*?class="intro-block-title"[^>]*>(.*?)<\/div>[\s\S]*?class="intro-block-body"[^>]*>([\s\S]*?)<\/div>/g;
  let ibm;
  while ((ibm = introBlockRx.exec(html)) !== null) {
    introBlocks.push({
      label: stripTags(ibm[1]),
      body: stripTags(ibm[2])
    });
  }

  // PHASE 2 : footer v1 (première ligne avant <br>)
  const footerM = html.match(/<footer>\s*([\s\S]*?)<br/);
  const footerNote = footerM ? stripTags(footerM[1]) : '';

  // Favicon
  const faviconMatch = html.match(/viewBox='0 0 100 100'><text y='\.9em'[^>]*>(.*?)<\/text>/);
  const favicon = faviconMatch ? faviconMatch[1] : '🏝️';

  // Season / title from chapter-num of first base
  const firstChapterNum = between(html, /class="chapter-num"[^>]*>/, /<\/span>/);
  // "01 / 04 · Base 1 · 5–12 septembre · 8 nuits"
  let season = '';
  if (firstChapterNum) {
    const dateMatch = firstChapterNum.match(/\d[\d–]+\s*(jan|fév|mar|avr|mai|juin|juil|août|sept|oct|nov|déc)\w*/i);
    if (dateMatch) {
      // Extract year from title
      const yearMatch = html.match(/(\d{4})/);
      season = `Septembre ${yearMatch ? yearMatch[1] : '2027'}`;
    }
  }
  // Fallback from page title
  if (!season) {
    const yearMatch = html.match(/(\d{4})/);
    season = `Septembre ${yearMatch ? yearMatch[1] : '2027'}`;
  }

  // palette slug = same as dest slug
  const palette = slug;

  // FIX 1b: Parser hero.label depuis .hero-label
  const heroLabelM = html.match(/class="hero-label"[^>]*>(.*?)<\/p>/s);
  const heroLabel = heroLabelM ? stripTags(heroLabelM[1]).trim() : 'Itinéraire';

  // FIX 1c+1d: Parser hero-stats pour travelers + dates
  const heroStats = [];
  const heroStatRx = /class="hero-stat"[^>]*>[\s\S]*?class="hero-stat-val"[^>]*>(.*?)<\/span>[\s\S]*?class="hero-stat-lbl"[^>]*>(.*?)<\/span>/g;
  let hsm;
  while ((hsm = heroStatRx.exec(html)) !== null) {
    heroStats.push({ val: stripTags(hsm[1]).trim(), lbl: stripTags(hsm[2]).trim() });
  }

  // Travelers (stat dont lbl contient "Personne" ou "Voyageur")
  const personStat = heroStats.find(s => /personn|voyageur/i.test(s.lbl));
  const travelersCount = personStat ? (parseInt(personStat.val) || 2) : 2;
  const travelersLabel = personStat
    ? (travelersCount === 1 ? 'Voyageur solo' : 'Voyage en duo')
    : 'Voyage en duo';

  // Dates arrivée/départ
  const arrivalStat = heroStats.find(s => /arriv/i.test(s.lbl));
  const departureStat = heroStats.find(s => /d[eé]part/i.test(s.lbl));

  // Année depuis le title
  const yearFromTitle = title ? (title.match(/(\d{4})/) || [])[1] || '2027' : '2027';

  // Mapper mois FR abrégés → numéro
  const MOIS_FR = {
    'jan': '01', 'janv': '01', 'fev': '02', 'fevr': '02', 'fév': '02', 'févr': '02',
    'mar': '03', 'mars': '03', 'avr': '04', 'mai': '05', 'juin': '06',
    'juil': '07', 'aou': '08', 'août': '08',
    'sep': '09', 'sept': '09', 'oct': '10', 'nov': '11',
    'dec': '12', 'déc': '12'
  };

  function parseHeroDate(val, year) {
    // "5 sept." → "2027-09-05"
    const m = val.match(/(\d+)\s+([a-zéûà]+)/i);
    if (!m) return '';
    const day = m[1].padStart(2, '0');
    const rawMonth = m[2].toLowerCase().replace(/\.$/, '');
    // Essayer 4 chars d'abord, puis 3
    const monthNum = MOIS_FR[rawMonth.substring(0, 4)] || MOIS_FR[rawMonth.substring(0, 3)] || '';
    if (!monthNum) return '';
    return `${year}-${monthNum}-${day}`;
  }

  function extractCityFromLbl(lbl, keywordPattern) {
    return lbl.replace(new RegExp(keywordPattern, 'i'), '').trim();
  }

  // Extraire codes IATA depuis le texte HTML ("Chania (CHQ)" → {chania: 'CHQ'})
  const iataFromText = {};
  const iataPairRx = /([A-ZÀ-Ûa-zà-û][a-zà-û]+(?:\s+[A-ZÀ-Ûa-zà-û][a-zà-û]+)?)\s*\(([A-Z]{3})\)/g;
  let ipm;
  while ((ipm = iataPairRx.exec(html)) !== null) {
    iataFromText[ipm[1].toLowerCase()] = ipm[2];
  }

  // Dictionnaire statique fallback
  const CITY_TO_IATA = {
    'chania': 'CHQ', 'héraklion': 'HER', 'heraklion': 'HER', 'iraklio': 'HER',
    'istanbul': 'IST', 'dalaman': 'DLM', 'antalya': 'AYT',
    'kayseri': 'ASR', 'ankara': 'ANK', 'izmir': 'ADB'
  };

  const arrivalCity = arrivalStat ? extractCityFromLbl(arrivalStat.lbl, 'arriv[ée]e?') : '';
  const departureCity = departureStat ? extractCityFromLbl(departureStat.lbl, 'd[eé]part') : '';
  const arrivalAirport = iataFromText[arrivalCity.toLowerCase()] || CITY_TO_IATA[arrivalCity.toLowerCase()] || '';
  const departureAirport = iataFromText[departureCity.toLowerCase()] || CITY_TO_IATA[departureCity.toLowerCase()] || '';
  const arrivalDate = arrivalStat ? parseHeroDate(arrivalStat.val, yearFromTitle) : '';
  const departureDate = departureStat ? parseHeroDate(departureStat.val, yearFromTitle) : '';

  // PHASE 2 : season depuis le <title> v1 (« Septembre–Octobre 2027 » ≠ « Septembre 2027 »)
  if (rawTitleEm) season = rawTitleEm;

  return {
    slug,
    pageTitle: title ? title.trim() : '',
    heroTitle: { main: titleParsed, em: titleEm },
    heroSub,
    subtitle: heroSub || overviewIntro.substring(0, 120),
    season,
    travelers: { count: travelersCount, label: travelersLabel },
    arrival: { date: arrivalDate, airport: arrivalAirport, city: arrivalCity },
    departure: { date: departureDate, airport: departureAirport, city: departureCity },
    theme: { favicon, palette },
    hero: { image: 'hero', label: heroLabel },
    overviewKicker,
    overviewTitle,
    overviewIntro,
    intro: {
      whySeason: { title: introBlocks[0]?.label || '', body: introBlocks[0]?.body || '' },
      logistics: { title: introBlocks[1]?.label || '', body: introBlocks[1]?.body || '' }
    },
    footerNote
  };
}

/** Parse les sections de chapitres (bases) */
function parseChapters(html) {
  const chapters = [];
  // Trouver tous les div avec id="<base>" qui contiennent class="tab-section" (class peut être multiple)
  const chapterRx = /<div\s+id="([^"]+)"\s+class="tab-section[^"]*">([\s\S]*?)(?=<div\s+id="[^"]+"\s+class="tab-section[^"]*">|<\/main>)/g;
  let m;
  while ((m = chapterRx.exec(html)) !== null) {
    const id = m[1];
    const content = m[2];
    // Vérifier que c'est un chapitre (contient chapter-title)
    if (!content.includes('chapter-title')) continue;
    chapters.push({ id, content });
  }
  return chapters;
}

// ── Matching POI base-scoped (PHASE 2) ────────────────────────────────────────
// Les noms v1 dérivent entre les surfaces : « Museum Hotel (Relais & Châteaux) »
// (accom-card) vs « Museum Hotel (Uçhisar) » (MAPS). Le matching global par
// sous-chaîne croisait les bases (« Hideaway Hotel » Kaş ↔ Faralya) — on scope
// à la base et on ajoute un fallback par recouvrement de tokens.

function normalizeForMatch(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Retire les parenthèses (généralement un qualificatif de lieu) */
function stripParens(s) {
  return s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

const GENERIC_TOKENS = new Set([
  'hotel', 'hotels', 'otel', 'beach', 'plage', 'taverna', 'restaurant',
  'boutique', 'guesthouse', 'rooms', 'suites', 'cave', 'caves', 'premium', 'cozy'
]);

function nameTokens(s) {
  return stripParens(s)
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

/** Trouve un POI dans la liste (scopée base) — exact → sous-chaîne → tokens */
function matchPoiInBase(name, basePois) {
  const norm = normalizeForMatch(name);
  if (!norm) return null;
  for (const p of basePois) if (normalizeForMatch(p.name) === norm) return p;
  const normStripped = normalizeForMatch(stripParens(name));
  for (const p of basePois) {
    const pn = normalizeForMatch(p.name);
    const pnStripped = normalizeForMatch(stripParens(p.name));
    if (pnStripped && normStripped && pnStripped === normStripped) return p;
    if (norm.length >= 6 && (pn.includes(norm) || norm.includes(pn))) return p;
    if (normStripped.length >= 6 && (pnStripped.includes(normStripped) || normStripped.includes(pnStripped))) return p;
  }
  const tokens = new Set(nameTokens(name));
  if (tokens.size === 0) return null;
  for (const p of basePois) {
    const ptokens = nameTokens(p.name);
    if (ptokens.length === 0) continue;
    const common = ptokens.filter(t => tokens.has(t)).length;
    // ≥2 tokens communs, OU 1 seul mais l'un des deux noms n'a qu'un token significatif
    // (« Museum Hotel » ↔ « Museum Hotel (Uçhisar) ») — évite le faux positif
    // « Baie de Loutro » ↔ « Hotel Porto Loutro » (1 commun sur 2/2).
    if (common >= 2) return p;
    if (common === 1 && Math.min(tokens.size, ptokens.length) === 1) return p;
  }
  return null;
}

/** Timeline de la vue d'ensemble : title/kicker/region/summary par base (ordre v1) */
function parseTimelineCards(html) {
  const cards = [];
  const rx = /class="base-card"[\s\S]*?class="base-card-title"[^>]*>([\s\S]*?)<\/div>\s*<div class="base-card-region"[^>]*>([\s\S]*?)<\/div>[\s\S]*?class="base-body"[^>]*>\s*<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const titleRaw = stripTags(m[1]);
    const [title, kicker] = titleRaw.split('—').map(s => s.trim());
    cards.push({
      title: title || titleRaw,
      kicker: kicker || '',
      region: stripTags(m[2]),
      summary: stripTags(m[3])
    });
  }
  return cards;
}

/**
 * Hébergements d'un chapitre — deux markups v1 :
 *  A. .accom-card (accom-tier / accom-name / accom-price / accom-desc)
 *  B. dérive Rethymno : .info-block avec .accom-tier + <strong>Nom</strong><br>desc (prix dans le desc)
 * Enrichit les POIs matchés (blurb/price/tier) ; les cartes sans POI deviennent accomExtras.
 */
function processAccoms(content, basePois, photoSlotByPhotoId) {
  const items = [];
  const extras = [];
  const TIER = { budget: 'budget', mid: 'mid', gem: 'gem' };

  function slotFor(imgUrl) {
    if (!imgUrl) return '';
    const idM = imgUrl.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    return (idM && pickSlot(photoSlotByPhotoId.get(idM[1]), ['accom'])) || '';
  }

  // Pattern A
  const aRx = /class="accom-card"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>/g;
  let am;
  while ((am = aRx.exec(content)) !== null) {
    const block = am[1];
    const imgM = block.match(/class="accom-img"[^>]+src="([^"]+)"/);
    const tierM = block.match(/class="accom-tier ([^"]+)"/);
    const nameM = block.match(/class="accom-name"[^>]*>([\s\S]*?)<\/div>/);
    const priceM = block.match(/class="accom-price"[^>]*>([\s\S]*?)<\/div>/);
    const descM = block.match(/class="accom-desc"[^>]*>([\s\S]*?)<\/div>/);
    if (!nameM) continue;
    const name = stripTags(nameM[1]);
    const tier = tierM ? (TIER[tierM[1].trim().toLowerCase()] || null) : null;
    const price = priceM ? stripTags(priceM[1]) : '';
    const blurb = descM ? stripTags(descM[1]) : '';
    const poi = matchPoiInBase(name, basePois);
    if (poi) {
      if (blurb) poi.blurb = blurb;
      if (price) poi.price.range = price;
      if (tier) poi.tier = tier;
      if (imgM) poi.image = slotFor(imgM[1]) || null;
      items.push(poi.id);
    } else {
      extras.push({ name, tier, price, blurb, image: slotFor(imgM ? imgM[1] : ''), links: [] });
    }
  }

  // Pattern B (dérive Rethymno)
  const bRx = /(?:<img class="accom-img"[^>]+src="([^"]+)"[^>]*>\s*)?<span class="accom-tier ([^"]+)"[^>]*>[^<]*<\/span>\s*<strong>([^<]+)<\/strong><br>\s*([^<]+)/g;
  let bm;
  while ((bm = bRx.exec(content)) !== null) {
    const name = bm[3].trim();
    const tier = TIER[bm[2].trim().toLowerCase()] || null;
    let blurb = decodeEntities(bm[4]).replace(/\s+/g, ' ').trim();
    let price = '';
    const priceM = blurb.match(/(~?[\d][\d\s.,–-]*\s*€\/nuit)\.?\s*$/);
    if (priceM) {
      price = priceM[1].trim();
      blurb = blurb.slice(0, priceM.index).replace(/\s+$/, '');
    }
    const poi = matchPoiInBase(name, basePois);
    if (poi) {
      if (blurb && !poi.blurb) poi.blurb = blurb;
      if (price && !poi.price.range) poi.price.range = price;
      if (tier && !poi.tier) poi.tier = tier;
      if (bm[1] && !poi.image) poi.image = slotFor(bm[1]) || null;
      if (!items.includes(poi.id)) items.push(poi.id);
    } else {
      extras.push({ name, tier, price, blurb, image: slotFor(bm[1] || ''), links: [] });
    }
  }

  return { items, extras };
}

/**
 * Info-blocks d'un chapitre — décision par bloc :
 *  - tous les <strong> matchent des POIs de la base → poi-list (+ footer <em>X :</em>)
 *  - sinon → prose avec TOUT le texte (les <strong> non-POI portaient du contenu perdu en v2 phase 1)
 * Enrichit les blurbs des POIs listés.
 */
function processInfoBlocks(content, basePois) {
  const blocks = [];
  const rx = /class="info-block"[^>]*>[\s\S]*?class="info-label"[^>]*>(.*?)<\/span>[\s\S]*?class="info-body"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>/g;
  let m;
  while ((m = rx.exec(content)) !== null) {
    const label = stripTags(m[1]);
    if (label.toLowerCase().includes('accéder')) continue; // bloc access
    if (label.toLowerCase().includes('température')) continue; // tagBlock
    let bodyHtml = m[2];
    if (/accom-tier|accom-card/.test(bodyHtml)) continue; // hébergements (processAccoms)

    // footer = <em>Label :</em> texte (après le dernier item) — les <em> inline restent dans les blurbs
    let footer = '';
    const footM = bodyHtml.match(/<em>([^<]*:)\s*<\/em>([^<]*)/);
    if (footM) {
      footer = `${stripTags(footM[1])} ${decodeEntities(footM[2]).replace(/\s+/g, ' ').trim()}`.trim();
      bodyHtml = bodyHtml.slice(0, footM.index) + bodyHtml.slice(footM.index + footM[0].length);
    }

    // strongs en TÊTE d'item (début de body, après <br>, </div> ou <img …>) = noms ;
    // les <strong> inline (« Réserver. ») font partie du texte de l'item
    const strongs = [];
    const strongRx = /<strong>([^<]+)<\/strong>/g;
    let sm;
    while ((sm = strongRx.exec(bodyHtml)) !== null) {
      const before = bodyHtml.slice(0, sm.index).replace(/\s+$/, '');
      const leading = before === '' || /(<br\s*\/?>|<\/div>|<img[^>]*>)$/.test(before);
      strongs.push({ index: sm.index, name: stripTags(sm[1]), leading });
    }
    const leads = strongs.filter(s => s.leading);
    const matched = leads.map(s => matchPoiInBase(s.name, basePois));

    if (leads.length > 0 && matched.every(Boolean)) {
      // poi-list + enrichissement des blurbs (chunk = du nom jusqu'au prochain item)
      for (let li = 0; li < leads.length; li++) {
        const poi = matched[li];
        const start = bodyHtml.indexOf('</strong>', leads[li].index) + '</strong>'.length;
        const end = li + 1 < leads.length ? leads[li + 1].index : bodyHtml.length;
        const chunk = bodyHtml.slice(start, end)
          .replace(/<div class="link-row">[\s\S]*?<\/div>/g, ' ')
          .replace(/<img[^>]+>/g, ' ');
        const text = stripTags(chunk).replace(/^[—–-]\s*/, '').trim();
        if (text && text.length >= 5 && !poi.blurb) poi.blurb = text;
      }
      const items = [...new Set(matched.map(p => p.id))];
      blocks.push({ label, type: 'poi-list', items, ...(footer ? { footer } : {}) });
    } else {
      const blockBody = stripTags(
        bodyHtml.replace(/<div class="link-row">[\s\S]*?<\/div>/g, '').replace(/<img[^>]+>/g, '')
      ).trim();
      const full = footer ? `${blockBody} ${footer}`.trim() : blockBody;
      if (full) blocks.push({ label, type: 'prose', body: full });
    }
  }
  return blocks;
}

/** Note-boxes d'un chapitre (logistique, transitions) */
function parseNotes(content) {
  const notes = [];
  const rx = /class="note-box"[^>]*>\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = rx.exec(content)) !== null) {
    const kind = stripTags(m[1]).replace(/\s*:\s*$/, '');
    const body = stripTags(m[2]);
    if (body) notes.push({ kind, body });
  }
  return notes;
}

/** Blocs éditoriaux foodie/gem d'un chapitre (§3.4) */
function parseEditorialBlocks(content, kind, photoSlotByPhotoId, usedIds) {
  const out = [];

  function slotOf(imgUrl) {
    if (!imgUrl) return '';
    const idM = imgUrl.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    return (idM && pickSlot(photoSlotByPhotoId.get(idM[1]), ['foodie', 'food', 'resto'])) || '';
  }

  function pushItem(group, title, descHtml, imgUrl) {
    const body = stripTags(descHtml.replace(/<img[^>]+>/g, ' ')).replace(/^[—–-]\s*/, '').trim();
    const links = [];
    const linkRx = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let lm;
    while ((lm = linkRx.exec(descHtml)) !== null) {
      links.push({ label: stripTags(lm[2]), url: lm[1] });
    }
    let id = toSlug(title);
    let attempt = id, n = 2;
    while (usedIds.has(attempt)) attempt = `${id}-${n++}`;
    id = attempt;
    usedIds.add(id);
    out.push({ id, group, title, body, ...(links.length > 0 ? { links } : {}), image: slotOf(imgUrl) });
  }

  // Markup standard : .foodie-item / .gem-item
  const titleM = content.match(new RegExp(`class="${kind}-title"[^>]*>([\\s\\S]*?)<\\/div>`));
  const group = titleM ? stripTags(titleM[1]) : '';
  const itemRx = new RegExp(
    `class="${kind}-item">\\s*<div class="${kind}-item-name"[^>]*>([\\s\\S]*?)<\\/div>\\s*<div class="${kind}-item-desc"[^>]*>([\\s\\S]*?)<\\/div>\\s*(?:<img[^>]+src="([^"]+)")?`,
    'g'
  );
  let m;
  while ((m = itemRx.exec(content)) !== null) {
    pushItem(group, stripTags(m[1]), m[2], m[3] || '');
  }
  if (out.length > 0) return out;

  // Dérive Rethymno : .foodie-block / .gem-block avec un seul .info-body
  // (<strong>Nom</strong> — desc <img class="…-item-img">…) — pas de .foodie-item
  const blockStartM = content.match(new RegExp(`class="${kind}-block"[^>]*>`));
  if (!blockStartM) return out;
  let block = content.slice(blockStartM.index + blockStartM[0].length);
  const endM = block.match(/class="(?:foodie|gem)-block"[^>]*>|id="budget"/);
  if (endM) block = block.slice(0, endM.index);

  const driftTitleM = block.match(/class="info-label"[^>]*>([\s\S]*?)<\/span>/);
  const driftGroup = driftTitleM ? stripTags(driftTitleM[1]) : '';
  const bodyM = block.match(/class="info-body"[^>]*>([\s\S]*?)$/);
  if (!bodyM) return out;
  const body = bodyM[1];

  // strongs en tête d'item (début, après <br>, </div> ou <img …>)
  const leads = [];
  const strongRx = /<strong>([^<]+)<\/strong>/g;
  let sm;
  while ((sm = strongRx.exec(body)) !== null) {
    const before = body.slice(0, sm.index).replace(/\s+$/, '');
    if (before === '' || /(<br\s*\/?>|<\/div>|<img[^>]*>)$/.test(before)) {
      leads.push({ index: sm.index, name: stripTags(sm[1]), end: sm.index + sm[0].length });
    }
  }
  for (let i = 0; i < leads.length; i++) {
    const chunk = body.slice(leads[i].end, i + 1 < leads.length ? leads[i + 1].index : body.length);
    const imgM = chunk.match(/<img[^>]+src="([^"]+)"/);
    pushItem(driftGroup, leads[i].name, chunk, imgM ? imgM[1] : '');
  }
  return out;
}

/** Parse un chapitre en objet base */
function parseBase(chapterId, content, order, poiNameToId, kickerMap, ctx = {}) {
  // title
  const titleM = content.match(/class="chapter-title"[^>]*>(.*?)<\/h2>/s);
  const title = titleM ? stripTags(titleM[1]) : chapterId;
  const slug = chapterId;
  const card = ctx.timelineCard || null;

  // chapter-num → dates, nights
  const numM = content.match(/class="chapter-num"[^>]*>(.*?)<\/span>/s);
  let dates = '';
  let nights = 0;
  let kicker = '';
  if (numM) {
    const num = stripTags(numM[1]).replace(/\s+/g, ' ');
    // "01 / 04  ·  Base 1  ·  5–12 septembre  ·  8 nuits"
    const parts = num.split('·').map(s => s.trim());
    if (parts.length >= 3) dates = parts[2];
    if (parts.length >= 4) {
      const nightsM = parts[3].match(/(\d+)/);
      if (nightsM) nights = parseInt(nightsM[1]);
    }
  }

  // subtitle
  const subM = content.match(/class="chapter-subtitle"[^>]*>(.*?)<\/p>/s);
  const subtitle = subM ? stripTags(subM[1]) : '';

  // kicker = depuis la timeline dans la section vue (passé en paramètre)
  if (kickerMap && kickerMap[title]) {
    kicker = kickerMap[title];
  }
  if (card && card.kicker) kicker = card.kicker;

  // PHASE 2 — mapping corrigé :
  // v1 .base-card-region (timeline, vue d'ensemble) → focus
  // v1 .base-body p (résumé timeline)               → summary
  // chapter-subtitle                                → subtitle (inchangé)
  const focus = (card && card.region) || subtitle;
  const summary = (card && card.summary) || '';

  // pullquote
  const pqM = content.match(/class="pullquote[^"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/s);
  const pullquote = pqM ? stripTags(pqM[1]) : '';

  // cover image = chapter-cover img src (sans les params)
  const coverImgM = content.match(/class="chapter-cover"[^>]*>[\s\S]*?<img\s[^>]*src="([^"]+)"/s);
  let coverSlot = `${slug}-cover`;

  // curatorial content
  const curM = content.match(/class="curatorial reveal"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<div class="photo-grid/s);
  let bodyMd = '';
  if (curM) {
    bodyMd = htmlToMd(curM[1], poiNameToId);
  }

  // access block
  let access = null;
  const accessM = content.match(/label[^>]*>Comment y accéder<\/span>[\s\S]*?class="info-body"[^>]*>([\s\S]*?)<\/div>/s);
  if (accessM) {
    const accessHtml = accessM[1];
    const accessLinks = [];
    const linkRx = /href="([^"]+)"[^>]*class="link-pill"[^>]*>(.*?)<\/a>/g;
    let lm;
    while ((lm = linkRx.exec(accessHtml)) !== null) {
      accessLinks.push({ label: stripTags(lm[2]), url: lm[1] });
    }
    access = {
      body: stripTags(accessHtml.replace(/<div class="link-row">[\s\S]*?<\/div>/g, '')).trim(),
      links: accessLinks
    };
  }

  // tagBlock — chercher un info-block dont l'info-label contient "Température" ou "météo"
  // et qui contient une tag-list
  let tagBlock = null;
  const tagBlockRx = /class="info-block"[^>]*>[\s\S]*?class="info-label"[^>]*>(Température[^<]*|Météo[^<]*|Eau[^<]*)<\/span>[\s\S]*?class="tag-list"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>\s*\n?\s*<\/div>/i;
  const tagBlockM = content.match(tagBlockRx);
  if (tagBlockM) {
    const tags = [];
    const tagRx = /class="tag([^"]*)"[^>]*>(.*?)<\/span>/g;
    let tm;
    while ((tm = tagRx.exec(tagBlockM[2])) !== null) {
      const tone = tm[1].includes('amber') ? 'amber' : tm[1].includes('green') ? 'green' : undefined;
      const tag = { text: stripTags(tm[2]) };
      if (tone) tag.tone = tone;
      tags.push(tag);
    }
    tagBlock = { label: stripTags(tagBlockM[1]), tags };
  }

  // PHASE 2 — infoBlocks : hébergements (processAccoms) + info-blocks (processInfoBlocks),
  // tous deux scopés base et calculés dans main() (enrichissement des POIs en place)
  const infoBlocks = [];
  const accom = ctx.accom || { items: [], extras: [] };
  if (accom.items.length > 0) {
    infoBlocks.push({ label: 'Où dormir', type: 'poi-list', items: accom.items });
  }
  infoBlocks.push(...(ctx.infoBlocks || []));

  // map-label v1 (« Carte — Chania et environs »)
  const mapLabelM = content.match(/class="map-label"[^>]*>([\s\S]*?)<\/span>/);
  const mapLabel = mapLabelM ? stripTags(mapLabelM[1]) : '';

  // note-boxes (logistique, transitions)
  const notes = parseNotes(content);

  return {
    order,
    slug,
    title,
    kicker: kicker || title.toLowerCase(),
    nights,
    dates,
    focus: focus || subtitle,
    subtitle,
    summary,
    pullquote,
    cover: coverSlot,
    ...(access ? { access } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    ...(tagBlock ? { tagBlock } : {}),
    ...(infoBlocks.length > 0 ? { infoBlocks } : {}),
    ...(mapLabel ? { mapLabel } : {}),
    ...(accom.extras.length > 0 ? { accomExtras: accom.extras } : {}),
    body: bodyMd
  };
}

/** Parse le budget */
function parseBudget(html) {
  const budgetSection = between(html, /id="budget"/, /id="pratique"/);
  if (!budgetSection) return null;

  // PHASE 2 : en-tête de section v1 (« Finances » / « Budget estimé » / intro taux de change)
  const kicker = between(budgetSection, /class="section-num"[^>]*>/, /<\/span>/)?.replace(/<[^>]+>/g, '').trim() || '';
  const titleRaw = between(budgetSection, /class="section-title"[^>]*>/, /<\/h2>/) || '';
  const title = stripTags(titleRaw.replace(/<br\s*\/?>/gi, ' '));
  const intro = between(budgetSection, /class="section-intro"[^>]*>/, /<\/p>/)?.replace(/<[^>]+>/g, '').trim() || '';

  const statCards = [];
  const statCardRx = /class="stat-card"[^>]*>[\s\S]*?class="stat-card-val"[^>]*>(.*?)<\/span>[\s\S]*?class="stat-card-lbl"[^>]*>(.*?)<\/div>/g;
  let scm;
  while ((scm = statCardRx.exec(budgetSection)) !== null) {
    statCards.push({
      value: stripTags(scm[1]).trim(),
      label: stripTags(scm[2]).trim()
    });
  }

  const lines = [];
  // Parse rows de la budget table (pas la .budget-total)
  const rowRx = /<tr(?!\s*class="budget-total")>[\s\S]*?<strong>(.*?)<\/strong>[\s\S]*?class="budget-cat"[^>]*>(.*?)<\/span>[\s\S]*?<td>(~[\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  let rm;
  while ((rm = rowRx.exec(budgetSection)) !== null) {
    lines.push({
      label: stripTags(rm[1]).trim(),
      category: stripTags(rm[2]).trim(),
      amount: stripTags(rm[3]).trim()
    });
  }

  // Total
  const totalM = budgetSection.match(/class="budget-total"[^>]*>[\s\S]*?<td>(~[\d\s$,]+)<\/td>/);
  const total = totalM ? totalM[1].trim() : '';

  // Advice (paragraph after table)
  const adviceM = budgetSection.match(/<\/table>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
  const advice = adviceM ? stripTags(adviceM[1]).trim() : '';

  // FIX 1g: Scenarios from advice — extraire le total depuis le début du desc
  const scenarios = [];
  const serreM = advice.match(/Budget serré\s*:\s*([^·]*)/i);
  const confortM = advice.match(/Budget confort\+\s*:\s*([^·]*)/i);
  if (serreM) {
    const desc = serreM[1].trim();
    const totalM = desc.match(/^(~[\d\s,]+\$(?:\s*CAD)?)/);
    scenarios.push({ name: 'Budget serré', total: totalM ? totalM[1].trim() : '', desc });
  }
  if (confortM) {
    const desc = confortM[1].trim();
    const totalM = desc.match(/^(~[\d\s,]+\$(?:\s*CAD)?)/);
    scenarios.push({ name: 'Budget confort+', total: totalM ? totalM[1].trim() : '', desc });
  }

  return { kicker, title, intro, statCards, lines, scenarios, advice, total };
}

/** Parse la section pratique */
function parsePratique(html) {
  const pratSection = between(html, /id="pratique"/, /<\/main>/);
  if (!pratSection) return [];

  const items = [];
  const cardRx = /class="prat-card"[^>]*>[\s\S]*?class="prat-card-title"[^>]*>(.*?)<\/div>[\s\S]*?class="prat-card-body"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>/g;
  let cm;
  while ((cm = cardRx.exec(pratSection)) !== null) {
    const label = stripTags(cm[1]).trim();
    const bodyHtml = cm[2];
    const links = [];
    const linkRx = /href="([^"]+)"[^>]*>(.*?)<\/a>/g;
    let lm;
    while ((lm = linkRx.exec(bodyHtml)) !== null) {
      links.push({ label: stripTags(lm[2]), url: lm[1] });
    }
    items.push({
      label,
      body: stripTags(bodyHtml).trim(),
      ...(links.length > 0 ? { links } : {})
    });
  }

  return items;
}

/** Choisit le slot d'un photoId parmi ses usages, en préférant certains rôles. */
function pickSlot(usages, preferredRoles = []) {
  if (!usages || usages.length === 0) return '';
  for (const r of preferredRoles) {
    const hit = usages.find((u) => u.role === r);
    if (hit) return hit.slot;
  }
  return usages[0].slot;
}

/**
 * Extrait toutes les images Unsplash — une entrée par USAGE (slot).
 * Le même photoId peut apparaître dans plusieurs slots (réutilisation v1, fréquente en Turquie :
 * 82 <img> pour 50 photoIds uniques) : les usages partagent file/sha256 — dédup au niveau
 * FICHIER, pas au niveau slot. L'ancienne dédup par photoId perdait les usages réutilisés.
 * `prevByPhotoId` (manifest existant) réutilise les fichiers déjà téléchargés — zéro réseau.
 * Chaque usage est associé à son chapitre (`base`) par position dans le HTML, et typé (`role`).
 */
function parseImages(html, slug, prevByPhotoId = new Map()) {
  const images = [];
  const fileByPhotoId = new Map(); // photoId → {file, sha256?, visionChecked?} — le 1er usage fixe le fichier

  // Parser les attributs indépendamment de leur ordre dans le tag
  // (l'ancienne regex séquentielle src→alt→class ratait class= : [^>]* greedy l'avalait toujours)
  function attr(tag, name) {
    const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
    return m ? m[1] : '';
  }

  function entry({ slot, base, role, alt, layout, photoId, url }) {
    let f = fileByPhotoId.get(photoId);
    if (!f) {
      const prev = prevByPhotoId.get(photoId);
      f = prev
        ? { file: prev.file, sha256: prev.sha256, visionChecked: prev.visionChecked }
        : { file: `${slot}.jpg` };
      fileByPhotoId.set(photoId, f);
    }
    return {
      id: slot,
      slot,
      base,
      role,
      file: f.file,
      alt,
      layout,
      claims: 'atmosphere',
      credit: { source: 'unsplash', photoId, photographer: '', license: 'unsplash-standard' },
      ...(f.sha256 ? { sha256: f.sha256 } : { _url: url }), // _url consommé par fetch-images.mjs
      ...(f.visionChecked ? { visionChecked: f.visionChecked } : {}),
    };
  }

  // Hero — background-image du <header class="hero">
  const heroHeaderM = html.match(/class="hero"[^>]*style="[^"]*url\('(https:\/\/images\.unsplash\.com\/[^']+)'\)/);
  if (heroHeaderM) {
    const url = heroHeaderM[1];
    const photoIdM = url.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    images.push(entry({
      slot: 'hero', base: null, role: 'hero',
      alt: `Vue emblématique — ${slug}`, layout: null,
      photoId: photoIdM ? photoIdM[1] : 'hero-unknown', url,
    }));
  }

  // Bornes des chapitres (mêmes frontières que parseChapters) → association usage → base
  const chapterRanges = [];
  const chapterRx = /<div\s+id="([^"]+)"\s+class="tab-section[^"]*">([\s\S]*?)(?=<div\s+id="[^"]+"\s+class="tab-section[^"]*">|<\/main>)/g;
  let cr;
  while ((cr = chapterRx.exec(html)) !== null) {
    if (!cr[2].includes('chapter-title')) continue;
    chapterRanges.push({ id: cr[1], start: cr.index, end: cr.index + cr[0].length });
  }
  const baseAt = (i) => chapterRanges.find((r) => i >= r.start && i < r.end)?.id ?? null;

  // L'<img> qui suit immédiatement l'ouverture d'un .chapter-cover = cover du chapitre
  const coverImgIdx = new Set();
  const coverOpenRx = /class="chapter-cover"[^>]*>/g;
  let co;
  while ((co = coverOpenRx.exec(html)) !== null) {
    const j = html.indexOf('<img', co.index);
    if (j !== -1 && j - co.index < 600) coverImgIdx.add(j);
  }

  const counters = { photo: 0, accom: 0, resto: 0, foodie: 0, food: 0 };
  const usedSlots = new Set(['hero']);
  const tagRx = /<img\b[^>]*>/g;
  let m;
  while ((m = tagRx.exec(html)) !== null) {
    const tag = m[0];
    const url = attr(tag, 'src');
    if (!url.startsWith('https://images.unsplash.com/')) continue;
    const alt = attr(tag, 'alt');
    const cls = attr(tag, 'class');
    const photoIdM = url.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    const photoId = photoIdM ? photoIdM[1] : `img-${m.index}`;
    const base = baseAt(m.index);

    let role;
    if (coverImgIdx.has(m.index)) role = 'cover';
    else if (cls.includes('accom-img')) role = 'accom';
    else if (cls.includes('resto-img')) role = 'resto';
    else if (cls.includes('foodie-item-img')) role = 'foodie';
    else if (cls.includes('food-img')) role = 'food';
    else role = 'photo';

    let slot;
    if (role === 'cover' && base) {
      slot = `${base}-cover`;
    } else {
      const key = role === 'cover' ? 'photo' : role;
      slot = `${key}-${++counters[key]}`;
    }
    let unique = slot;
    let n = 2;
    while (usedSlots.has(unique)) unique = `${slot}-${n++}`;
    usedSlots.add(unique);

    images.push(entry({
      slot: unique, base, role, alt,
      layout: cls.includes('photo-wide') ? 'wide' : cls.includes('photo-tall') ? 'tall' : null,
      photoId, url,
    }));
  }

  return images;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [,, htmlFile, outdir] = process.argv;

  if (!htmlFile || !outdir) {
    process.stderr.write('Usage: node extract.mjs <html-file> <outdir>\n');
    process.exit(2);
  }

  if (!existsSync(htmlFile)) {
    process.stderr.write(`Error: HTML file not found: ${htmlFile}\n`);
    process.exit(2);
  }

  let html;
  try {
    html = readFileSync(htmlFile, 'utf8');
  } catch (e) {
    process.stderr.write(`Error reading file: ${e.message}\n`);
    process.exit(2);
  }

  // Détecter le slug depuis le chemin ou le titre
  const slugM = htmlFile.match(/fixtures\/([^/]+)\//);
  const slug = slugM ? slugM[1] : 'destination';

  // Créer les dossiers
  mkdirSync(outdir, { recursive: true });
  mkdirSync(join(outdir, 'bases'), { recursive: true });

  // ── 1. Parse MAPS → POIs ───────────────────────────────────────────────────
  const maps = parseMAPS(html);

  if (Object.keys(maps).length === 0) {
    process.stderr.write('Error: Could not parse MAPS object from HTML\n');
    process.exit(2);
  }

  const KIND_ROLES = {
    hotel: { kind: 'hotel', mapType: 'hotel', roles: ['sleep'] },
    resto: { kind: 'resto', mapType: 'resto', roles: ['eat'] },
    plage: { kind: 'plage', mapType: 'plage', roles: ['do'] },
    sight: { kind: 'sight', mapType: 'sight', roles: ['see'] },
    winery: { kind: 'winery', mapType: 'sight', roles: ['do'] },
    activity: { kind: 'activity', mapType: 'sight', roles: ['do'] }
  };

  // Construire les POIs depuis MAPS
  const pois = [];
  const poiIds = new Set();
  const poiNameToId = {};

  for (const [mapId, markers] of Object.entries(maps)) {
    // Extraire le slug de base depuis l'id de la carte (map-chania → chania)
    const baseSlug = mapId.replace(/^map-/, '');

    for (const marker of markers) {
      let id = toSlug(marker.name);
      // Assurer unicité
      let attempt = id;
      let n = 2;
      while (poiIds.has(attempt)) {
        attempt = `${id}-${n++}`;
      }
      id = attempt;
      poiIds.add(id);

      const typeInfo = KIND_ROLES[marker.type] || KIND_ROLES.sight;
      const poi = {
        id,
        base: baseSlug,
        kind: typeInfo.kind,
        mapType: typeInfo.mapType,
        roles: typeInfo.roles,
        tier: typeInfo.kind === 'hotel' ? null : undefined,
        name: marker.name,
        blurb: '',
        signature: '',
        image: null, // rempli par processAccoms si la carte v1 avait une image

        price: { range: '', currency: 'EUR', asOf: '2026-06' },
        coords: {
          lat: marker.lat,
          lng: marker.lng,
          source: 'maps-v1',
          verifiedOn: '2026-06-12'
        },
        links: {
          official: null,
          booking: null,
          tripadvisor: null,
          maps: marker.link
        },
        extraLinks: [],
        seasonal: false,
        status: { open: true, lastChecked: '2026-06-12', method: 'migration-v1' },
        onMap: true
      };

      // Nettoyer les champs undefined
      if (poi.tier === undefined) delete poi.tier;

      pois.push(poi);
      poiNameToId[toSlug(marker.name)] = id;
      // Aussi indexer par prénom (premier mot)
      const firstWord = toSlug(marker.name.split(' ')[0]);
      if (!poiNameToId[firstWord]) poiNameToId[firstWord] = id;
    }
  }

  // ── 2. Images (AVANT les bases : map photoId → usages pour accoms + dishes/gems)
  // Manifest existant (si présent) : réutilise file/sha256/visionChecked par photoId — zéro re-téléchargement
  const prevManifestPath = join(outdir, 'images.json');
  const prevByPhotoId = new Map();
  if (existsSync(prevManifestPath)) {
    try {
      for (const img of JSON.parse(readFileSync(prevManifestPath, 'utf8'))) {
        if (img.credit?.photoId && img.sha256 && !prevByPhotoId.has(img.credit.photoId)) {
          prevByPhotoId.set(img.credit.photoId, {
            file: img.file,
            sha256: img.sha256,
            visionChecked: img.visionChecked,
          });
        }
      }
    } catch {
      // manifest illisible → on repart à neuf, fetch-images re-téléchargera
    }
  }
  const images = parseImages(html, slug, prevByPhotoId);
  const photoSlotByPhotoId = new Map();
  for (const img of images) {
    const arr = photoSlotByPhotoId.get(img.credit.photoId) || [];
    arr.push({ slot: img.slot, role: img.role });
    photoSlotByPhotoId.set(img.credit.photoId, arr);
  }

  // ── 3. Parse destination.json ──────────────────────────────────────────────
  const destination = parseDestination(html, slug);
  writeFileSync(join(outdir, 'destination.json'), JSON.stringify(destination, null, 2));
  process.stdout.write(`  destination.json — ${destination.slug}\n`);

  // ── 4. Parse chapters → bases/*.md + dishes/gems ───────────────────────────
  const chapters = parseChapters(html);

  if (chapters.length === 0) {
    process.stderr.write('Error: No chapters found in HTML (expected chapter-title elements)\n');
    process.exit(2);
  }

  // Extraire les kickers depuis la timeline (section vue)
  const kickerMap = {};
  const kickerRx = /class="base-card-title"[^>]*>([^—<]+)—\s*([^<]+)</g;
  let km;
  while ((km = kickerRx.exec(html)) !== null) {
    kickerMap[km[1].trim()] = km[2].trim();
  }

  // PHASE 2 : cartes de la timeline (focus = .base-card-region, summary = .base-body p)
  const timelineCards = parseTimelineCards(html);

  const dishes = [];
  const gems = [];
  const dishIds = new Set();
  const gemIds = new Set();

  for (let i = 0; i < chapters.length; i++) {
    const { id, content } = chapters[i];

    // Scope base : matching + enrichissement des POIs de CETTE base seulement
    const basePois = pois.filter(p => p.base === id);
    const accom = processAccoms(content, basePois, photoSlotByPhotoId);
    const infoBlocks = processInfoBlocks(content, basePois);
    for (const extra of accom.extras) {
      process.stderr.write(`  [INFO] hébergement hors MAPS → accomExtras: "${extra.name}" (${id})\n`);
    }

    const base = parseBase(id, content, i + 1, poiNameToId, kickerMap, {
      timelineCard: timelineCards[i] || null,
      accom,
      infoBlocks
    });

    const nn = String(i + 1).padStart(2, '0');
    const filename = `${nn}-${base.slug}.md`;

    // Séparer body du frontmatter
    const { body, ...frontmatterData } = base;

    // Construire le frontmatter YAML manuellement (pas de dep yaml)
    const fm = buildFrontmatter(frontmatterData);
    const mdContent = `---\n${fm}---\n\n${body || ''}\n`;

    writeFileSync(join(outdir, 'bases', filename), mdContent);
    process.stdout.write(`  bases/${filename} — ${base.title} (${base.nights}n)\n`);

    // PHASE 2 : blocs éditoriaux foodie/gem du chapitre (§3.4)
    dishes.push(...parseEditorialBlocks(content, 'foodie', photoSlotByPhotoId, dishIds));
    gems.push(...parseEditorialBlocks(content, 'gem', photoSlotByPhotoId, gemIds));
  }

  // pois.json écrit APRÈS la boucle (enrichi en place par processAccoms/processInfoBlocks)
  writeFileSync(join(outdir, 'pois.json'), JSON.stringify(pois, null, 2));
  process.stdout.write(`  pois.json — ${pois.length} POIs\n`);

  // ── 5. Budget ──────────────────────────────────────────────────────────────
  const budget = parseBudget(html);
  writeFileSync(join(outdir, 'budget.json'), JSON.stringify(budget, null, 2));
  process.stdout.write(`  budget.json — ${budget?.lines?.length || 0} lignes\n`);

  // ── 6. Pratique ────────────────────────────────────────────────────────────
  const pratiqueItems = parsePratique(html);
  // Le schéma attend {groups: [{label, items:[]}]} — on groupe tout dans "Info pratique"
  const pratique = { groups: [{ label: 'Info pratique', items: pratiqueItems }] };
  writeFileSync(join(outdir, 'pratique.json'), JSON.stringify(pratique, null, 2));
  process.stdout.write(`  pratique.json — ${pratiqueItems.length} items\n`);

  // ── 7. Images ──────────────────────────────────────────────────────────────
  writeFileSync(join(outdir, 'images.json'), JSON.stringify(images, null, 2));
  process.stdout.write(`  images.json — ${images.length} images\n`);

  // ── 8. Dishes + Gems (PHASE 2 : extraits des .foodie-block / .gem-block v1)
  writeFileSync(join(outdir, 'dishes.json'), JSON.stringify(dishes, null, 2));
  writeFileSync(join(outdir, 'gems.json'), JSON.stringify(gems, null, 2));
  process.stdout.write(`  dishes.json — ${dishes.length} · gems.json — ${gems.length}\n`);

  process.stdout.write(`\nExtraction terminée → ${outdir}\n`);
}

/** Construit un frontmatter YAML simple (pas de dep yaml) */
function buildFrontmatter(obj, indent = '') {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out += `${indent}${k}: null\n`;
    } else if (typeof v === 'string') {
      // Quote si vide ou contient des caractères spéciaux
      if (v === '' || v.includes('\n') || v.includes('"') || v.includes(':') || v.includes('#') || v.includes('[') || v.includes(']') || v.includes('{') || v.includes('}') || v.includes("'")) {
        const escaped = v.replace(/'/g, "''");
        out += `${indent}${k}: '${escaped}'\n`;
      } else {
        out += `${indent}${k}: ${v}\n`;
      }
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out += `${indent}${k}: ${v}\n`;
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        out += `${indent}${k}: []\n`;
      } else if (typeof v[0] === 'string') {
        out += `${indent}${k}:\n`;
        for (const item of v) out += `${indent}  - ${item}\n`;
      } else {
        out += `${indent}${k}:\n`;
        for (const item of v) {
          const lines = buildFrontmatter(item, `${indent}    `);
          out += `${indent}  -\n${lines}`;
        }
      }
    } else if (typeof v === 'object') {
      out += `${indent}${k}:\n`;
      out += buildFrontmatter(v, `${indent}  `);
    }
  }
  return out;
}

// Guard CLI (KD-8)
const isMain = process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith('extract.mjs');

if (isMain) {
  main().catch(e => {
    process.stderr.write(`Fatal: ${e.message}\n${e.stack}\n`);
    process.exit(2);
  });
}

export {
  parseMAPS, parseDestination, parseChapters, parseBase, parseBudget, parsePratique, parseImages, toSlug,
  parseTimelineCards, processAccoms, processInfoBlocks, parseNotes, parseEditorialBlocks, matchPoiInBase
};
