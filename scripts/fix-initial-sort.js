// One-time fix: on first load, allItems was never sorted — items rendered in
// raw injection order (alphabetical by title) even though the "Release Date"
// toggle is active by default and window.sortField/window.ascending are set
// to "date"/false (newest-to-oldest). This made the grid order and the
// timeline year markers inconsistent/jumbled. Sort allItems immediately after
// it's built, using the same field/direction logic as toggleDateField.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];

for (const page of PAGES) {
  const p = path.join(__dirname, '..', 'library', page);
  let html = fs.readFileSync(p, 'utf8');
  let changed = 0;

  html = html.replace(
    /(const meta = buildAllItemsMetadata\(\);\s*allItems = meta;\s*window\.allItems = allItems;\s*)/,
    (m) => {
      changed++;
      return `${m}const initialField = (window.sortField === "date") ? "release" : "uploaded";\n    sortItems(window.ascending, initialField);\n    allItems = window.allItems;\n`;
    }
  );

  if (changed !== 1) {
    console.log(`${page}: WARNING expected 1 change, got ${changed}`);
  } else {
    fs.writeFileSync(p, html);
    console.log(`${page}: OK`);
  }
}
