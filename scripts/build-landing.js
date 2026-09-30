// Генерирует docs/index.html из data/catalog.json.
// Запуск: node scripts/build-landing.js  (или npm run build:landing)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const CATALOG = join(root, 'data', 'catalog.json');
const OUT_DIR = join(root, 'docs');
const OUT = join(OUT_DIR, 'index.html');

const BOT_USERNAME = process.env.BOT_USERNAME || 'your_bot_username';
const botLink = `https://t.me/${BOT_USERNAME}`;

if (!existsSync(CATALOG)) {
  console.error('Нет data/catalog.json');
  process.exit(1);
}
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

const cats = {};
for (const it of catalog) (cats[it.category] ||= []).push(it);

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let sections = '';
for (const [cat, items] of Object.entries(cats)) {
  const cards = items
    .map(
      (it) => `<div class="card">
        <span class="id">#${it.id}</span>
        <div class="title">${escapeHtml(it.title)}</div>
        <div class="price">${it.price.toLocaleString('ru-RU')} ₽</div>
      </div>`,
    )
    .join('');
  sections += `<section><h2>${escapeHtml(cat)} <span class="count">(${items.length})</span></h2><div class="grid">${cards}</div></section>`;
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Магазин обучающих материалов</title>
<style>
  :root { --bg:#0f1220; --card:#1a1f35; --accent:#ff5a3c; --text:#e9ecf5; --muted:#9aa3c0; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--text); }
  header { padding:48px 20px 32px; text-align:center; background:linear-gradient(160deg,#1a1f35,#0f1220); }
  header h1 { margin:0 0 8px; font-size:30px; }
  header p { color:var(--muted); margin:0 0 22px; }
  .cta { display:inline-block; background:var(--accent); color:#fff; padding:14px 26px; border-radius:12px; font-weight:700; text-decoration:none; font-size:16px; }
  main { max-width:1040px; margin:0 auto; padding:24px 16px 60px; }
  section { margin-top:36px; }
  h2 { font-size:21px; border-left:4px solid var(--accent); padding-left:10px; }
  .count { color:var(--muted); font-weight:400; font-size:15px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; margin-top:14px; }
  .card { background:var(--card); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px; min-height:120px; }
  .card .id { color:var(--accent); font-size:12px; font-weight:700; }
  .card .title { font-size:15px; line-height:1.35; flex:1; }
  .card .price { color:var(--muted); font-weight:700; }
  footer { text-align:center; color:var(--muted); font-size:13px; padding:30px; }
</style>
</head>
<body>
<header>
  <h1>📚 Магазин обучающих материалов</h1>
  <p>${catalog.length} курсов и гайдов по маркетингу, IT, дизайну, психологии и не только. Оплата переводом по СБП.</p>
  <a class="cta" href="${botLink}">▶ Открыть бота и купить</a>
</header>
<main>${sections}</main>
<footer>Оплата переводом по СБП. После перевода и подтверждения продавцом вы получаете ссылку на материал.</footer>
</body>
</html>`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`✅ Лендинг сгенерирован: ${OUT} (${catalog.length} позиций)`);
