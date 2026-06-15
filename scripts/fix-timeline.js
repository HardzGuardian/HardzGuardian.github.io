// One-time fix: the "right side years" timeline was always built from
// item.date (the date-added/uploaded timestamp), which is nearly identical
// for every imported entry, so the timeline collapsed to a single year. It
// should reflect the actual release date (item.release), and it should be
// rebuilt on every render so it stays correct after sort-order toggles.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];

for (const page of PAGES) {
  const p = path.join(__dirname, '..', 'library', page);
  let html = fs.readFileSync(p, 'utf8');
  let changed = 0;

  html = html.replace(
    /function getItemTimelineDate\(item\) \{\s*if \(!item\.date\) return null;\s*const d = new Date\(item\.date \* 1000\);/,
    (m) => {
      changed++;
      return m.replace(/item\.date/g, 'item.release');
    }
  );

  html = html.replace(
    /(scrollbarEl\.classList\.remove\("hidden"\);\s*const scrollbarHeight = scrollbarEl\.clientHeight;\s*)(updateTimelineYPositions\(\);)/,
    (m, pre, post) => {
      changed++;
      return `${pre}window.timelineMap = buildTimelineMap();\n\t\t\t${post}`;
    }
  );

  if (changed !== 2) {
    console.log(`${page}: WARNING expected 2 changes, got ${changed}`);
  } else {
    fs.writeFileSync(p, html);
    console.log(`${page}: OK`);
  }
}
