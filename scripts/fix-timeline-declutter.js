// Declutter the right-side timeline: with ~44 distinct years compressed into
// a short bar, .timeline-year labels overlapped each other heavily. By default
// only show the newest and oldest year labels (the range bounds); month/year
// tick markers for everything in between remain, just without overlapping text.

const fs = require('fs');
const path = require('path');

const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];

const T = '\t';

const OLD = `${T}${T}function renderTimelineMarkers() {
${T}${T}${T}const bar = document.getElementById("timeline-bar");
${T}${T}${T}if (!bar || !window.timelineMap) return;
${T}${T}${T}bar.querySelectorAll('.timeline-marker, .timeline-year').forEach(el => el.remove());
${T}${T}${T}const barHeight = bar.clientHeight;
${T}${T}${T}const reverse = window.ascending;
${T}${T}${T}for (const year in timelineMap) {
${T}${T}${T}${T}const yearEntry = getYearAnchorEntry(timelineMap[year]);
${T}${T}${T}${T}if (yearEntry && typeof yearEntry.scrollY === "number") {
${T}${T}${T}${T}${T}let y = yearEntry.scrollY;
${T}${T}${T}${T}${T}if (reverse) y = barHeight - y;
${T}${T}${T}${T}${T}const label = document.createElement("div");
${T}${T}${T}${T}${T}label.className = "timeline-year";
${T}${T}${T}${T}${T}label.textContent = year;
${T}${T}${T}${T}${T}label.style.top = \`\${y}px\`;
${T}${T}${T}${T}${T}label.addEventListener("click", (e) => {
${T}${T}${T}${T}${T}${T}e.stopPropagation();
${T}${T}${T}${T}${T}${T}scrollToYear(year);
${T}${T}${T}${T}${T}});
${T}${T}${T}${T}${T}bar.appendChild(label);
${T}${T}${T}${T}}
${T}${T}${T}${T}for (const month in timelineMap[year]) {
${T}${T}${T}${T}${T}const entry = timelineMap[year][month];
${T}${T}${T}${T}${T}if (typeof entry.scrollY !== "number") continue;
${T}${T}${T}${T}${T}let y = entry.scrollY;
${T}${T}${T}${T}${T}if (reverse) y = barHeight - y;
${T}${T}${T}${T}${T}const marker = document.createElement("div");
${T}${T}${T}${T}${T}marker.className = "timeline-marker";
${T}${T}${T}${T}${T}marker.style.top = \`\${y}px\`;
${T}${T}${T}${T}${T}marker.addEventListener("click", (e) => {
${T}${T}${T}${T}${T}${T}e.stopPropagation();
${T}${T}${T}${T}${T}${T}scrollToMonth(year, month);
${T}${T}${T}${T}${T}});
${T}${T}${T}${T}${T}bar.appendChild(marker);
${T}${T}${T}${T}}
${T}${T}${T}}
${T}${T}}`;

const NEW = `${T}${T}function renderTimelineMarkers() {
${T}${T}${T}const bar = document.getElementById("timeline-bar");
${T}${T}${T}if (!bar || !window.timelineMap) return;
${T}${T}${T}bar.querySelectorAll('.timeline-marker, .timeline-year').forEach(el => el.remove());
${T}${T}${T}const barHeight = bar.clientHeight;
${T}${T}${T}const reverse = window.ascending;
${T}${T}${T}const yearPositions = [];
${T}${T}${T}for (const year in timelineMap) {
${T}${T}${T}${T}const yearEntry = getYearAnchorEntry(timelineMap[year]);
${T}${T}${T}${T}if (yearEntry && typeof yearEntry.scrollY === "number") {
${T}${T}${T}${T}${T}let y = yearEntry.scrollY;
${T}${T}${T}${T}${T}if (reverse) y = barHeight - y;
${T}${T}${T}${T}${T}yearPositions.push({ year, y });
${T}${T}${T}${T}}
${T}${T}${T}${T}for (const month in timelineMap[year]) {
${T}${T}${T}${T}${T}const entry = timelineMap[year][month];
${T}${T}${T}${T}${T}if (typeof entry.scrollY !== "number") continue;
${T}${T}${T}${T}${T}let y = entry.scrollY;
${T}${T}${T}${T}${T}if (reverse) y = barHeight - y;
${T}${T}${T}${T}${T}const marker = document.createElement("div");
${T}${T}${T}${T}${T}marker.className = "timeline-marker";
${T}${T}${T}${T}${T}marker.style.top = \`\${y}px\`;
${T}${T}${T}${T}${T}marker.addEventListener("click", (e) => {
${T}${T}${T}${T}${T}${T}e.stopPropagation();
${T}${T}${T}${T}${T}${T}scrollToMonth(year, month);
${T}${T}${T}${T}${T}});
${T}${T}${T}${T}${T}bar.appendChild(marker);
${T}${T}${T}${T}}
${T}${T}${T}}
${T}${T}${T}yearPositions.sort((a, b) => a.y - b.y);
${T}${T}${T}const edgeYears = yearPositions.length > 1
${T}${T}${T}${T}? [yearPositions[0], yearPositions[yearPositions.length - 1]]
${T}${T}${T}${T}: yearPositions;
${T}${T}${T}edgeYears.forEach(({ year, y }) => {
${T}${T}${T}${T}const label = document.createElement("div");
${T}${T}${T}${T}label.className = "timeline-year";
${T}${T}${T}${T}label.textContent = year;
${T}${T}${T}${T}label.style.top = \`\${y}px\`;
${T}${T}${T}${T}label.addEventListener("click", (e) => {
${T}${T}${T}${T}${T}e.stopPropagation();
${T}${T}${T}${T}${T}scrollToYear(year);
${T}${T}${T}${T}});
${T}${T}${T}${T}bar.appendChild(label);
${T}${T}${T}});
${T}${T}}`;

const OLD_CRLF = OLD.replace(/\n/g, '\r\n');
const NEW_CRLF = NEW.replace(/\n/g, '\r\n');

for (const page of PAGES) {
  const p = path.join(__dirname, '..', 'library', page);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes(OLD_CRLF)) {
    console.log(`${page}: WARNING pattern not found`);
    continue;
  }
  html = html.replace(OLD_CRLF, NEW_CRLF);
  fs.writeFileSync(p, html);
  console.log(`${page}: OK`);
}
