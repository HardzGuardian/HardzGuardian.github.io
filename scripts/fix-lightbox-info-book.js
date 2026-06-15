// Same fix as fix-lightbox-info.js but for book.html, which has a Status/Genres
// row pair (no Rating) and a separate static "Notes" row that has no per-item
// data backing — left as-is, only Status/Genres made dynamic and the static
// Description block removed.

const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'library', 'book.html');
let html = fs.readFileSync(p, 'utf8');
let changed = 0;

html = html.replace(
  /(<span class="lb-row-label">Status<\/span>\s*<span class="lb-row-value")(>)/,
  (m, pre, post) => { changed++; return `${pre} id="lbStatus"${post}`; }
);
html = html.replace(
  /(<span class="lb-row-label">Genres<\/span>\s*<span class="lb-row-value")(>)/,
  (m, pre, post) => { changed++; return `${pre} id="lbGenres"${post}`; }
);

html = html.replace(
  /\s*<div class="lb-section">\s*<div class="lb-row-label" style="margin-bottom:5px;">Description<\/div>\s*<div class="lb-row-value" style="white-space:normal; line-height:1\.4;">[^<]*<\/div>\s*<\/div>/,
  (m) => { changed++; return ''; }
);

html = html.replace(
  /(lbReleaseDate\.textContent = '–';\s*\}\s*)/,
  (m) => {
    changed++;
    return `${m}\tconst lbStatusEl = document.getElementById('lbStatus');\n\tconst lbGenresEl = document.getElementById('lbGenres');\n\tif (lbStatusEl) lbStatusEl.textContent = meta.raw?.status || '–';\n\tif (lbGenresEl) lbGenresEl.textContent = (meta.raw?.genres && meta.raw.genres.length) ? meta.raw.genres.join(', ') : '–';\n`;
  }
);

if (changed !== 4) {
  console.log(`book.html: WARNING expected 4 changes, got ${changed}`);
} else {
  fs.writeFileSync(p, html);
  console.log('book.html: OK');
}
