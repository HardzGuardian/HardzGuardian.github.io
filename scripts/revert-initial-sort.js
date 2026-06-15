// Revert fix-initial-sort.js: remove the initial sortItems() call added to
// buildAllItemsChunked, restoring alphabetical-on-load (sort only on toggle click).

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];
const CRLF = (s) => s.replace(/\n/g, '\r\n');

const OLD = CRLF(`    window.allItems = allItems;
    const initialField = (window.sortField === "date") ? "release" : "uploaded";
    sortItems(window.ascending, initialField);
    allItems = window.allItems;
const totalItems = meta.length;`);

const NEW = CRLF(`    window.allItems = allItems;
    const totalItems = meta.length;`);

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
