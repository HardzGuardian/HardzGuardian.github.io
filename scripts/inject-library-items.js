// One-time injection: append imported MAL entries (data/anime.json, data/manga.json,
// data/novel.json) into the imageChunks galleries of library/anime.html, manga.html,
// novel.html. Each entry becomes a ".item" div matching the existing gallery format.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TARGETS = [
  { data: 'anime.json', page: 'anime.html' },
  { data: 'manga.json', page: 'manga.html' },
  { data: 'novel.json', page: 'novel.html' }
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDate(dateAdded) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateAdded)) return new Date(dateAdded + 'T00:00:00Z');
  return new Date();
}

function toYymmdd(dateAdded) {
  const d = parseDate(dateAdded);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return yy + mm + dd;
}

function toUnix(dateAdded) {
  return Math.floor(parseDate(dateAdded).getTime() / 1000);
}

function buildItem(entry, index) {
  const yymmdd = toYymmdd(entry.dateAdded);
  const ts = toUnix(entry.dateAdded);
  const releaseTs = toUnix(entry.releaseDate || entry.dateAdded);
  const cover = escapeHtml(entry.cover || '');
  const title = escapeHtml(entry.title || '');
  const genresJson = JSON.stringify(entry.genres || []);
  const rating = entry.rating != null ? entry.rating : '';

  return `<div class="item" data-index="${index}" data-bit="1" data-date="${ts}" data-uploaded="${ts}" data-release="${releaseTs}" data-assigned="1" data-yymmdd="${yymmdd}" data-size="0" data-ft='[]' data-status="Completed" data-genres='${genresJson}' data-rating="${rating}" data-w="680" data-h="1000"><a href="${cover}" target="_blank" rel="noopener"><div class="thumb loading"><img src="${cover}" loading="lazy"></div></a><div class="filename">${title}</div> <div class="dates"> <div class="date" data-longdate="${yymmdd}000000"> Status: Completed </div> <div class="date">Rating: ${rating}</div> </div></div>`;
}

for (const target of TARGETS) {
  const dataPath = path.join(ROOT, 'data', target.data);
  const pagePath = path.join(ROOT, 'library', target.page);

  const { entries } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let html = fs.readFileSync(pagePath, 'utf8');

  const chunkMatch = html.match(/let imageChunks = \[(.*)\];/);
  if (!chunkMatch) {
    throw new Error(`Could not find imageChunks in ${target.page}`);
  }
  const existingChunks = new Function(`return [${chunkMatch[1]}]`)();

  const joined = existingChunks.join('');
  let maxIndex = -1;
  for (const m of joined.matchAll(/data-index="(\d+)"/g)) {
    maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
  }

  const newItemsHtml = entries.map((entry, i) => buildItem(entry, maxIndex + 1 + i)).join('');
  const newChunks = existingChunks.concat([newItemsHtml]);

  const newLine = `let imageChunks = [${newChunks.map(s => JSON.stringify(s)).join(', ')}];`;
  html = html.replace(/let imageChunks = \[(.*)\];/, newLine);

  const totalMatch = html.match(/Total Entries: (\d+)/);
  const newTotal = parseInt(totalMatch[1], 10) + entries.length;
  html = html.replace(/Total Entries: \d+/, `Total Entries: ${newTotal}`);

  fs.writeFileSync(pagePath, html);
  console.log(`${target.page}: +${entries.length} entries, total now ${newTotal}`);
}
