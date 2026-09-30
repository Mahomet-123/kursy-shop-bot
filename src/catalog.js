import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = join(__dirname, '..', 'data', 'catalog.json');

let cache = null;

export function loadCatalog() {
  if (cache) return cache;
  if (!existsSync(CATALOG_FILE)) {
    cache = [];
    return cache;
  }
  cache = JSON.parse(readFileSync(CATALOG_FILE, 'utf8'));
  return cache;
}

export function getCategories() {
  const cats = {};
  for (const it of loadCatalog()) {
    if (!cats[it.category]) cats[it.category] = [];
    cats[it.category].push(it);
  }
  return cats;
}

export function getItem(id) {
  return loadCatalog().find((i) => i.id === Number(id)) || null;
}

export function getItems(ids) {
  const set = new Set(ids.map(Number));
  return loadCatalog().filter((i) => set.has(i.id));
}

export function getCategoryNames() {
  return Object.keys(getCategories());
}
