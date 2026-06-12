// load-content.mjs — Loaders disque partagés pour les validateurs FR-7/FR-8/FR-9.
// Chaque loader retourne [] / {} / vide si le fichier est absent (jamais bloquant).
// loadBases utilise js-yaml (dépendance transitive astro) ; échec import → incomplete:true.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
export const DEST_ROOT = join(ROOT, 'src', 'content', 'destinations');

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/** Lit un fichier JSON ; retourne `fallback` si absent ou malformé. */
function readJson(path, fallback = []) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

/** Retourne le contenu d'un fichier texte ou null si absent. */
function readText(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

// ---------------------------------------------------------------------------
// Loaders JSON basiques
// ---------------------------------------------------------------------------

/** Liste toutes les destinations sous DEST_ROOT. Retourne [] si répertoire absent. */
export function listDestinations() {
  if (!existsSync(DEST_ROOT)) return [];
  return readdirSync(DEST_ROOT).filter((name) => {
    try {
      return statSync(join(DEST_ROOT, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

/** Charge un fichier JSON par nom de destination et nom de fichier. */
export function loadArray(dest, filename) {
  return readJson(join(DEST_ROOT, dest, filename));
}

export function loadPois(dest) {
  return loadArray(dest, 'pois.json');
}

export function loadImages(dest) {
  return loadArray(dest, 'images.json');
}

export function loadDishes(dest) {
  return loadArray(dest, 'dishes.json');
}

export function loadGems(dest) {
  return loadArray(dest, 'gems.json');
}

// ---------------------------------------------------------------------------
// Bases markdown (frontmatter YAML + body)
// ---------------------------------------------------------------------------

/**
 * Sépare le frontmatter YAML d'un fichier markdown.
 * Retourne { frontmatter: string, body: string } ou null si pas de frontmatter.
 */
export function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Charge toutes les bases markdown d'une destination.
 * Retourne { bases: [{...frontmatter, body}], incomplete: boolean }.
 * incomplete=true si js-yaml indisponible ou si le répertoire bases est illisible.
 */
export async function loadBases(dest) {
  let yaml;
  try {
    yaml = await import('js-yaml');
  } catch {
    return { bases: [], incomplete: true };
  }

  const basesDir = join(DEST_ROOT, dest, 'bases');
  if (!existsSync(basesDir)) return { bases: [], incomplete: false };

  let files;
  try {
    files = readdirSync(basesDir).filter((f) => f.endsWith('.md'));
  } catch {
    return { bases: [], incomplete: true };
  }

  const bases = [];
  for (const file of files) {
    const raw = readText(join(basesDir, file));
    if (raw === null) continue;
    const parts = splitFrontmatter(raw);
    if (!parts) continue;
    try {
      const fm = yaml.load(parts.frontmatter) ?? {};
      bases.push({ ...fm, body: parts.body, filePath: join(basesDir, file) });
    } catch {
      // YAML malformé → on continue sans cette base (conservative)
    }
  }

  return { bases, incomplete: false };
}

// ---------------------------------------------------------------------------
// Sidecars optionnels (vision.lock.json + image-reuse.allow.json)
// ---------------------------------------------------------------------------

/**
 * Charge le sidecar vision.lock.json d'une destination.
 * Retourne un Map id→{sha256,alt} ({} si absent).
 * @param {string} dest
 * @returns {Record<string,{sha256:string,alt:string}>}
 */
export function loadVisionLock(dest) {
  const arr = readJson(join(DEST_ROOT, dest, 'vision.lock.json'), null);
  if (!Array.isArray(arr)) return {};
  const map = {};
  for (const entry of arr) {
    const id = entry.id ?? entry.slot;
    if (id) map[id] = { sha256: entry.sha256, alt: entry.alt };
  }
  return map;
}

/**
 * Charge la liste blanche de réutilisation intentionnelle de sha256.
 * Retourne un Set<string> (vide si absent).
 * @param {string} dest
 * @returns {Set<string>}
 */
export function loadReuseAllowlist(dest) {
  const arr = readJson(join(DEST_ROOT, dest, 'image-reuse.allow.json'), null);
  if (!Array.isArray(arr)) return new Set();
  return new Set(arr);
}
