// The edge-year labels (newest/oldest) were picked by sorted scrollY, but
// ties at y=0 (multiple years map to the first grid row) caused the wrong
// year to be chosen as "newest" (e.g. showing 2023 instead of 2025). Pick
// edges by actual year value instead, independent of y position.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];

const T = '\t';

const OLD = [
	`${T}${T}${T}yearPositions.sort((a, b) => a.y - b.y);`,
	`${T}${T}${T}const edgeYears = yearPositions.length > 1`,
	`${T}${T}${T}${T}? [yearPositions[0], yearPositions[yearPositions.length - 1]]`,
	`${T}${T}${T}${T}: yearPositions;`
].join('\r\n');

const NEW = [
	`${T}${T}${T}yearPositions.sort((a, b) => a.y - b.y);`,
	`${T}${T}${T}const yearValues = yearPositions.map(p => Number(p.year));`,
	`${T}${T}${T}const maxYear = Math.max(...yearValues);`,
	`${T}${T}${T}const minYear = Math.min(...yearValues);`,
	`${T}${T}${T}const newestEntry = yearPositions.find(p => Number(p.year) === maxYear);`,
	`${T}${T}${T}const oldestEntry = yearPositions.find(p => Number(p.year) === minYear);`,
	`${T}${T}${T}const edgeYears = newestEntry === oldestEntry ? [newestEntry] : [newestEntry, oldestEntry];`
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
