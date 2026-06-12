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
  const titleEm = title ? (title.split('—')[1] || '').split('·')[0].trim() : '';

  const heroSub = between(html, /class="hero-sub"[^>]*>/, /<\//)?.replace(/<[^>]+>/g, '').trim() || '';

  // section-intro = overviewIntro
  const overviewIntro = between(html, /class="section-intro"[^>]*>/, /<\/p>/)?.replace(/<[^>]+>/g, '').trim() || '';

  // intro blocks (pourquoi + logistique)
  const introBlocks = [];
  const introBlockRx = /class="intro-block"[^>]*>[\s\S]*?class="intro-block-title"[^>]*>(.*?)<\/div>[\s\S]*?class="intro-block-body"[^>]*>([\s\S]*?)<\/div>/g;
  let ibm;
  while ((ibm = introBlockRx.exec(html)) !== null) {
    introBlocks.push({
      label: stripTags(ibm[1]),
      body: stripTags(ibm[2])
    });
  }

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

  return {
    slug,
    heroTitle: { main: titleParsed, em: titleEm.toLowerCase() },
    heroSub,
    subtitle: heroSub || overviewIntro.substring(0, 120),
    season,
    travelers: { count: 2, label: 'Voyage en duo' },
    arrival: { date: '', airport: '', city: '' },
    departure: { date: '', airport: '', city: '' },
    theme: { favicon, palette },
    hero: { image: 'hero', label: 'Itinéraire · Voyage en duo' },
    overviewIntro,
    intro: {
      whySeason: introBlocks[0]?.body || '',
      logistics: introBlocks[1]?.body || ''
    }
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

/** Parse un chapitre en objet base */
function parseBase(chapterId, content, order, poiNameToId, kickerMap) {
  // title
  const titleM = content.match(/class="chapter-title"[^>]*>(.*?)<\/h2>/s);
  const title = titleM ? stripTags(titleM[1]) : chapterId;
  const slug = chapterId;

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

  // focus = base-card-region
  const focusM = content.match(/class="(?:base-card-region|chapter-subtitle)"[^>]*>(.*?)</s);
  const focus = focusM ? stripTags(focusM[1]) : subtitle;

  // summary = base-body p
  const summaryM = content.match(/class="base-body"[^>]*>[\s\S]*?<p>(.*?)<\/p>/s);
  const summary = summaryM ? stripTags(summaryM[1]) : '';

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

  // infoBlocks — accom-grid (hébergements)
  const infoBlocks = [];
  const accomItems = [];
  const accomRx = /class="accom-card"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>/g;
  let am;
  while ((am = accomRx.exec(content)) !== null) {
    const accomHtml = am[1];
    const tierM = accomHtml.match(/class="accom-tier ([^"]+)"[^>]*>(.*?)<\/span>/s);
    const nameM = accomHtml.match(/class="accom-name"[^>]*>(.*?)<\/div>/s);
    const priceM = accomHtml.match(/class="accom-price"[^>]*>(.*?)<\/div>/s);
    const descM = accomHtml.match(/class="accom-desc"[^>]*>(.*?)<\/div>/s);
    if (nameM) {
      const name = stripTags(nameM[1]);
      accomItems.push(toSlug(name));
    }
  }
  if (accomItems.length > 0) {
    infoBlocks.push({
      label: 'Où dormir',
      type: 'poi-list',
      items: accomItems
    });
  }

  // infoBlocks — info-block sections (où manger, plages, etc.)
  const infoBlockRx = /class="info-block"[^>]*>[\s\S]*?class="info-label"[^>]*>(.*?)<\/span>[\s\S]*?class="info-body"[^>]*>([\s\S]*?)<\/div>\s*\n?\s*<\/div>/g;
  let ibm;
  while ((ibm = infoBlockRx.exec(content)) !== null) {
    const label = stripTags(ibm[1]);
    if (label.toLowerCase().includes('accéder')) continue; // skip access
    if (label.toLowerCase().includes('température')) continue; // skip tagBlock
    const bodyHtml = ibm[2];

    // Extraire les POI items (strong = nom de lieu)
    const items = [];
    const strongRx = /<strong>([^<]+)<\/strong>/g;
    let srm;
    while ((srm = strongRx.exec(bodyHtml)) !== null) {
      const name = stripTags(srm[1]);
      const id = findPoiIdByName(name, poiNameToId);
      if (id) items.push(id);
    }

    const blockBody = stripTags(bodyHtml.replace(/<div class="link-row">[\s\S]*?<\/div>/g, '').replace(/<img[^>]+>/g, '')).trim();

    if (items.length > 0) {
      infoBlocks.push({ label, type: 'poi-list', items });
    } else if (blockBody) {
      infoBlocks.push({ label, type: 'prose', body: blockBody });
    }
  }

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
    ...(tagBlock ? { tagBlock } : {}),
    ...(infoBlocks.length > 0 ? { infoBlocks } : {}),
    body: bodyMd
  };
}

/** Parse le budget */
function parseBudget(html) {
  const budgetSection = between(html, /id="budget"/, /id="pratique"/);
  if (!budgetSection) return null;

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

  // Scenarios from advice
  const scenarios = [];
  const serreM = advice.match(/Budget serré\s*:\s*([^·]*)/i);
  const confortM = advice.match(/Budget confort\+\s*:\s*([^·]*)/i);
  if (serreM) scenarios.push({ name: 'Budget serré', total: '', desc: serreM[1].trim() });
  if (confortM) scenarios.push({ name: 'Budget confort+', total: '', desc: confortM[1].trim() });

  return { statCards, lines, scenarios, advice, total };
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

/** Extrait toutes les images Unsplash */
function parseImages(html, slug) {
  const images = [];
  const seen = new Set();
  const imgRx = /<img[^>]+src="(https:\/\/images\.unsplash\.com\/[^"]+)"[^>]*alt="([^"]*)"[^>]*(class="([^"]*)")?[^>]*>/g;
  let m;
  let idx = 0;
  while ((m = imgRx.exec(html)) !== null) {
    const url = m[1];
    const alt = m[2];
    const cls = m[4] || '';

    // Extraire le photo ID depuis l'URL
    const photoIdM = url.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    const photoId = photoIdM ? photoIdM[1] : `img-${idx}`;

    if (seen.has(photoId)) continue;
    seen.add(photoId);

    // Générer un slot basé sur la classe
    let slotBase;
    if (cls.includes('accom-img')) slotBase = 'accom';
    else if (cls.includes('resto-img')) slotBase = 'resto';
    else if (cls.includes('foodie-item-img')) slotBase = 'foodie';
    else if (cls.includes('food-img')) slotBase = 'food';
    else slotBase = 'photo';

    const slot = `${slotBase}-${idx}`;
    const layout = cls.includes('photo-wide') ? 'wide' : null;

    images.push({
      id: slot,
      slot,
      file: `${slot}.jpg`,
      alt,
      layout,
      claims: 'atmosphere',
      credit: {
        source: 'unsplash',
        photoId,
        photographer: '',
        license: 'unsplash-standard'
      },
      _url: url  // kept for fetch-images.mjs, removed from final if needed
    });

    idx++;
  }

  // Nommer correctement : cover de chapitre
  const coverRx = /class="chapter-cover"[\s\S]*?<img\s[^>]*src="(https:\/\/images\.unsplash\.com\/[^"]+)"[^>]*alt="([^"]*)"/g;
  let cm;
  idx = 1;
  // Reset pour faire les covers
  const coverMap = {};
  while ((cm = coverRx.exec(html)) !== null) {
    const url = cm[1];
    const photoIdM = url.match(/\/photo-([a-zA-Z0-9_-]+)\?/);
    const photoId = photoIdM ? photoIdM[1] : null;
    if (photoId) coverMap[photoId] = idx++;
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
    plage: { kind: 'plage', mapType: 'plage', roles: ['swim'] },
    sight: { kind: 'sight', mapType: 'sight', roles: ['visit'] },
    winery: { kind: 'winery', mapType: 'sight', roles: ['visit'] },
    activity: { kind: 'activity', mapType: 'sight', roles: ['visit'] }
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
        image: `${id}-img`,
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

  writeFileSync(join(outdir, 'pois.json'), JSON.stringify(pois, null, 2));
  process.stdout.write(`  pois.json — ${pois.length} POIs\n`);

  // ── 2. Parse destination.json ──────────────────────────────────────────────
  const destination = parseDestination(html, slug);
  writeFileSync(join(outdir, 'destination.json'), JSON.stringify(destination, null, 2));
  process.stdout.write(`  destination.json — ${destination.slug}\n`);

  // ── 3. Parse chapters → bases/*.md ────────────────────────────────────────
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

  for (let i = 0; i < chapters.length; i++) {
    const { id, content } = chapters[i];
    const base = parseBase(id, content, i + 1, poiNameToId, kickerMap);

    const nn = String(i + 1).padStart(2, '0');
    const filename = `${nn}-${base.slug}.md`;

    // Séparer body du frontmatter
    const { body, ...frontmatterData } = base;

    // Construire le frontmatter YAML manuellement (pas de dep yaml)
    const fm = buildFrontmatter(frontmatterData);
    const mdContent = `---\n${fm}---\n\n${body || ''}\n`;

    writeFileSync(join(outdir, 'bases', filename), mdContent);
    process.stdout.write(`  bases/${filename} — ${base.title} (${base.nights}n)\n`);
  }

  // ── 4. Budget ──────────────────────────────────────────────────────────────
  const budget = parseBudget(html);
  writeFileSync(join(outdir, 'budget.json'), JSON.stringify(budget, null, 2));
  process.stdout.write(`  budget.json — ${budget?.lines?.length || 0} lignes\n`);

  // ── 5. Pratique ────────────────────────────────────────────────────────────
  const pratique = parsePratique(html);
  writeFileSync(join(outdir, 'pratique.json'), JSON.stringify(pratique, null, 2));
  process.stdout.write(`  pratique.json — ${pratique.length} items\n`);

  // ── 6. Images ──────────────────────────────────────────────────────────────
  const images = parseImages(html, slug);
  writeFileSync(join(outdir, 'images.json'), JSON.stringify(images, null, 2));
  process.stdout.write(`  images.json — ${images.length} images\n`);

  // ── 7. Dishes + Gems (vides — contenu éditorial) ──────────────────────────
  writeFileSync(join(outdir, 'dishes.json'), JSON.stringify([], null, 2));
  writeFileSync(join(outdir, 'gems.json'), JSON.stringify([], null, 2));
  process.stdout.write(`  dishes.json + gems.json — vides (remplir manuellement)\n`);

  process.stdout.write(`\nExtraction terminée → ${outdir}\n`);
}

/** Construit un frontmatter YAML simple (pas de dep yaml) */
function buildFrontmatter(obj, indent = '') {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out += `${indent}${k}: null\n`;
    } else if (typeof v === 'string') {
      // Quote si contient des caractères spéciaux
      if (v.includes('\n') || v.includes('"') || v.includes(':') || v.includes('#') || v.includes('[') || v.includes(']') || v.includes('{') || v.includes('}')) {
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

export { parseMAPS, parseDestination, parseChapters, parseBase, parseBudget, parsePratique, parseImages, toSlug };
