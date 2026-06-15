// getItemAtScrollTop picked the LAST item with y <= scrollTop, which for
// scrollTop=0 lands on the rightmost (last) item of row 0 instead of the
// newest (first) item, showing the wrong year next to the position dot.
// Switch to a lower-bound search: the first item with y >= scrollTop.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];
const T = '\t';
const CRLF = (s) => s.replace(/\n/g, '\r\n');

const OLD = CRLF(`${T}${T}function getItemAtScrollTop(scrollTop) {
${T}${T}${T}const items = window.allItems;
${T}${T}${T}if (!items || !items.length) return null;
${T}${T}${T}let lo = 0, hi = items.length - 1, ans = 0;
${T}${T}${T}while (lo <= hi) {
${T}${T}${T}${T}const mid = (lo + hi) >> 1;
${T}${T}${T}${T}if (items[mid].y <= scrollTop) { ans = mid; lo = mid + 1; }
${T}${T}${T}${T}else hi = mid - 1;
${T}${T}${T}}
${T}${T}${T}return items[ans];
${T}${T}}`);

const NEW = CRLF(`${T}${T}function getItemAtScrollTop(scrollTop) {
${T}${T}${T}const items = window.allItems;
${T}${T}${T}if (!items || !items.length) return null;
${T}${T}${T}let lo = 0, hi = items.length - 1, ans = items.length - 1;
${T}${T}${T}while (lo <= hi) {
${T}${T}${T}${T}const mid = (lo + hi) >> 1;
${T}${T}${T}${T}if (items[mid].y >= scrollTop) { ans = mid; hi = mid - 1; }
${T}${T}${T}${T}else lo = mid + 1;
${T}${T}${T}}
${T}${T}${T}return items[ans];
${T}${T}}`);

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
