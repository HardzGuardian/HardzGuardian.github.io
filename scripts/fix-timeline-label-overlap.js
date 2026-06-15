// When a page has very few items, both items can land on the same grid row
// (y=0), so the newest/oldest edge-year labels compute to the same scrollY
// and render stacked on top of each other (e.g. "2019"/"2017" both at top:0px
// on tv-shows.html). Push them apart by a minimum gap so both stay readable.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];
const T = '\t';

const OLD = `${T}${T}${T}const edgeYears = newestEntry === oldestEntry ? [newestEntry] : [newestEntry, oldestEntry];`;

const NEW = [
	`${T}${T}${T}const edgeYears = newestEntry === oldestEntry ? [newestEntry] : [newestEntry, oldestEntry];`,
	`${T}${T}${T}const MIN_LABEL_GAP = 14;`,
	`${T}${T}${T}if (edgeYears.length === 2 && Math.abs(edgeYears[0].y - edgeYears[1].y) < MIN_LABEL_GAP) {`,
	`${T}${T}${T}${T}const sorted = [...edgeYears].sort((a, b) => a.y - b.y);`,
	`${T}${T}${T}${T}sorted[0].y = Math.max(0, Math.min(sorted[0].y, barHeight - MIN_LABEL_GAP));`,
	`${T}${T}${T}${T}sorted[1].y = sorted[0].y + MIN_LABEL_GAP;`,
	`${T}${T}${T}}`
].join('\r\n');

for (const page of PAGES) {
  const p = path.join(__dirname, '..', 'library', page);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes(OLD)) {
    console.log(`${page}: WARNING pattern not found`);
    continue;
  }
  html = html.replace(OLD, NEW);
  fs.writeFileSync(p, html);
  console.log(`${page}: OK`);
}
