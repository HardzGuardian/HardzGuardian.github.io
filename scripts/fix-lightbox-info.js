// One-time fix: the lightbox "info" panel's Status/Genres/Rating rows and the
// Description block were static placeholder text left over from the original
// single-item template (Frieren's values for anime.html, etc.) — they never
// updated per item. Add ids to Status/Genres/Rating so openLightbox can fill
// them from the item's own data-status/data-genres/data-rating, and drop the
// Description block since no per-item description data exists in the markup.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'manga.html', 'novel.html', 'movies.html', 'tv-shows.html'];

for (const page of PAGES) {
  const p = path.join(__dirname, '..', 'library', page);
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
    /(<span class="lb-row-label">Rating<\/span>\s*<span class="lb-row-value")(>)/,
    (m, pre, post) => { changed++; return `${pre} id="lbRating"${post}`; }
  );

  // Drop the static Description section entirely.
  html = html.replace(
    /\s*<div class="lb-section">\s*<div class="lb-row-label" style="margin-bottom:5px;">Description<\/div>\s*<div class="lb-row-value" style="white-space:normal; line-height:1\.4;">[^<]*<\/div>\s*<\/div>/,
    (m) => { changed++; return ''; }
  );

  // Populate the new fields in openLightbox alongside lbReleaseDate.
  html = html.replace(
    /(lbReleaseDate\.textContent = '–';\s*\}\s*)/,
    (m) => {
      changed++;
      return `${m}\tconst lbStatusEl = document.getElementById('lbStatus');\n\tconst lbGenresEl = document.getElementById('lbGenres');\n\tconst lbRatingEl = document.getElementById('lbRating');\n\tif (lbStatusEl) lbStatusEl.textContent = meta.raw?.status || '–';\n\tif (lbGenresEl) lbGenresEl.textContent = (meta.raw?.genres && meta.raw.genres.length) ? meta.raw.genres.join(', ') : '–';\n\tif (lbRatingEl) lbRatingEl.textContent = (meta.raw?.rating != null) ? \`\${meta.raw.rating} / 10\` : '–';\n`;
    }
  );

  if (changed !== 5) {
    console.log(`${page}: WARNING expected 5 changes, got ${changed}`);
  } else {
    fs.writeFileSync(p, html);
    console.log(`${page}: OK`);
  }
}
