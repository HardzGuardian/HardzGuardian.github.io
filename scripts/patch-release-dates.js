// One-time fix: rewrite the data-release timestamp on every injected item in
// library/{anime,manga,novel}.html using the releaseDate field populated by
// fix-release-dates.js (the real air/publish date), instead of the import
// date that was originally (incorrectly) written there.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TARGETS = [
  { data: 'anime.json', page: 'anime.html' },
  { data: 'manga.json', page: 'manga.html' },
  { data: 'novel.json', page: 'novel.html' }
];

function parseDate(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr + 'T00:00:00Z');
  return new Date();
}

function toUnix(dateStr) {
  return Math.floor(parseDate(dateStr).getTime() / 1000);
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
  const chunks = new Function(`return [${chunkMatch[1]}]`)();

  let lastChunk = chunks[chunks.length - 1];
  let updated = 0;

  lastChunk = lastChunk.replace(
    /(<div class="item" data-index="(\d+)"[^>]*?data-release=")(\d+)(")/g,
    (full, pre, idxStr, oldTs, post) => {
      const idx = parseInt(idxStr, 10);
      const entry = entries[idx - 1];
      if (!entry) return full;
      const newTs = toUnix(entry.releaseDate || entry.dateAdded);
      updated++;
      return pre + newTs + post;
    }
  );

  chunks[chunks.length - 1] = lastChunk;

  const newLine = `let imageChunks = [${chunks.map(s => JSON.stringify(s)).join(', ')}];`;
  html = html.replace(/let imageChunks = \[(.*)\];/, newLine);

  fs.writeFileSync(pagePath, html);
  console.log(`${target.page}: updated data-release on ${updated}/${entries.length} entries`);
}
