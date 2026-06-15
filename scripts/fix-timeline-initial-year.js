// On initial page load, the dot+year label never got positioned because
// buildAllItemsChunked's onComplete callback sets up the timeline (markers,
// y-positions) but never calls updateTimelineCurrentPosition(). As a result
// #timeline-current / #timeline-current-year had no `top`/text until the
// user scrolled. Call it once after the initial setup so the newest item's
// year is shown by default.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];
const CRLF = (s) => s.replace(/\n/g, '\r\n');

const OLD = CRLF(`        normalizeTimelinePositions(scrollbarHeight);
        renderTimelineMarkers();

        const spacer = document.getElementById("spacer");`);

const NEW = CRLF(`        normalizeTimelinePositions(scrollbarHeight);
        renderTimelineMarkers();
        updateTimelineCurrentPosition();

        const spacer = document.getElementById("spacer");`);

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
