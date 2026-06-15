// Remove the right-side timeline bar's tick marks and static year labels
// (the "small bar" of clutter). Keep only the #timeline-current position dot,
// with a year label next to it that updates as you scroll/drag.
// getYearAnchorEntry/scrollToYear/scrollToMonth become unused once the
// marker/label click handlers (their only callers) are removed.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['anime.html', 'book.html', 'manga.html', 'movies.html', 'novel.html', 'tools.html', 'tv-shows.html'];
const T = '\t';
const CRLF = (s) => s.replace(/\n/g, '\r\n');

// --- 1. HTML: add the year label element next to #timeline-current ---
const htmlOld = CRLF(`  <div id="timeline-bar">
    <div id="timeline-current"></div>
  </div>`);
const htmlNew = CRLF(`  <div id="timeline-bar">
    <div id="timeline-current"></div>
    <div id="timeline-current-year" class="timeline-current-year"></div>
  </div>`);

// --- 2. updateTimelineCurrentPosition: drive the year label from scroll position ---
const jsOld1 = CRLF(`${T}${T}function updateTimelineCurrentPosition() {
${T}${T}${T}const scrollTop = scroller.scrollTop;
${T}${T}${T}const totalHeight = computeVirtualPositions.totalHeight;
${T}${T}${T}const scrollbarHeight = scrollbarEl.clientHeight;
${T}${T}${T}const currentY = (scrollTop / totalHeight) * scrollbarHeight;
${T}${T}${T}currentEl.style.top = \`\${currentY}px\`;
${T}${T}}
${T}${T}scroller.addEventListener('scroll', updateTimelineCurrentPosition);`);

const jsNew1 = CRLF(`${T}${T}const currentYearEl = document.getElementById("timeline-current-year");

${T}${T}function getItemAtScrollTop(scrollTop) {
${T}${T}${T}const items = window.allItems;
${T}${T}${T}if (!items || !items.length) return null;
${T}${T}${T}let lo = 0, hi = items.length - 1, ans = 0;
${T}${T}${T}while (lo <= hi) {
${T}${T}${T}${T}const mid = (lo + hi) >> 1;
${T}${T}${T}${T}if (items[mid].y <= scrollTop) { ans = mid; lo = mid + 1; }
${T}${T}${T}${T}else hi = mid - 1;
${T}${T}${T}}
${T}${T}${T}return items[ans];
${T}${T}}

${T}${T}function updateTimelineCurrentPosition() {
${T}${T}${T}const scrollTop = scroller.scrollTop;
${T}${T}${T}const totalHeight = computeVirtualPositions.totalHeight;
${T}${T}${T}const scrollbarHeight = scrollbarEl.clientHeight;
${T}${T}${T}const currentY = (scrollTop / totalHeight) * scrollbarHeight;
${T}${T}${T}currentEl.style.top = \`\${currentY}px\`;
${T}${T}${T}if (currentYearEl) {
${T}${T}${T}${T}const item = getItemAtScrollTop(scrollTop);
${T}${T}${T}${T}currentYearEl.textContent = (item && typeof item.release === "number") ? new Date(item.release * 1000).getFullYear() : "";
${T}${T}${T}${T}currentYearEl.style.top = \`\${currentY}px\`;
${T}${T}${T}}
${T}${T}}
${T}${T}scroller.addEventListener('scroll', updateTimelineCurrentPosition);`);

// --- 3. renderTimelineMarkers + scrollToYear + scrollToMonth + getYearAnchorEntry: drop entirely ---
const jsOld2 = CRLF(`${T}${T}function getYearAnchorEntry(months) {
${T}${T}${T}let best = null;
${T}${T}${T}for (const month in months) {
${T}${T}${T}${T}const entry = months[month];
${T}${T}${T}${T}if (!best || entry.firstTimestamp < best.firstTimestamp) {
${T}${T}${T}${T}${T}best = entry;
${T}${T}${T}${T}}
${T}${T}${T}}
${T}${T}${T}return best;
${T}${T}}

${T}${T}function renderTimelineMarkers() {
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
${T}${T}${T}const yearValues = yearPositions.map(p => Number(p.year));
${T}${T}${T}const maxYear = Math.max(...yearValues);
${T}${T}${T}const minYear = Math.min(...yearValues);
${T}${T}${T}const newestEntry = yearPositions.find(p => Number(p.year) === maxYear);
${T}${T}${T}const oldestEntry = yearPositions.find(p => Number(p.year) === minYear);
${T}${T}${T}const edgeYears = newestEntry === oldestEntry ? [newestEntry] : [newestEntry, oldestEntry];
${T}${T}${T}const MIN_LABEL_GAP = 14;
${T}${T}${T}if (edgeYears.length === 2 && Math.abs(edgeYears[0].y - edgeYears[1].y) < MIN_LABEL_GAP) {
${T}${T}${T}${T}const sorted = [...edgeYears].sort((a, b) => a.y - b.y);
${T}${T}${T}${T}sorted[0].y = Math.max(0, Math.min(sorted[0].y, barHeight - MIN_LABEL_GAP));
${T}${T}${T}${T}sorted[1].y = sorted[0].y + MIN_LABEL_GAP;
${T}${T}${T}}
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
${T}${T}}

${T}${T}function scrollToYear(year) {
${T}${T}${T}const entry = getYearAnchorEntry(timelineMap[year]);
${T}${T}${T}if (!entry) return;
${T}${T}${T}const index = entry.firstArrayIndex;
${T}${T}${T}const item = allItems[index];
${T}${T}${T}if (!item) return;
${T}${T}${T}let targetY = item.y;
${T}${T}${T}if (window.ascending) {
${T}${T}${T}${T}const total = computeVirtualPositions.totalHeight;
${T}${T}${T}${T}targetY = total - targetY;
${T}${T}${T}}
${T}${T}${T}document.querySelector('.all').scrollTo({
${T}${T}${T}${T}top: targetY,
${T}${T}${T}${T}behavior: "instant"
${T}${T}${T}});
${T}${T}}

${T}${T}function scrollToMonth(year, month) {
${T}${T}${T}const entry = timelineMap[year][month];
${T}${T}${T}if (!entry) return;
${T}${T}${T}const index = entry.firstArrayIndex;
${T}${T}${T}const item = allItems[index];
${T}${T}${T}if (!item) return;
${T}${T}${T}let targetY = item.y;
${T}${T}${T}if (window.ascending) {
${T}${T}${T}${T}const total = computeVirtualPositions.totalHeight;
${T}${T}${T}${T}targetY = total - targetY;
${T}${T}${T}}
${T}${T}${T}document.querySelector('.all').scrollTo({
${T}${T}${T}${T}top: targetY,
${T}${T}${T}${T}behavior: "instant"
${T}${T}${T}});
${T}${T}}
`);

const jsNew2 = CRLF(`${T}${T}function renderTimelineMarkers() {
${T}${T}${T}const bar = document.getElementById("timeline-bar");
${T}${T}${T}if (!bar) return;
${T}${T}${T}bar.querySelectorAll('.timeline-marker, .timeline-year').forEach(el => el.remove());
${T}${T}}
`);

for (const page of PAGES) {
  const p = path.join(ROOT, 'library', page);
  let html = fs.readFileSync(p, 'utf8');
  let changed = 0;

  if (html.includes(htmlOld)) { html = html.replace(htmlOld, htmlNew); changed++; }
  if (html.includes(jsOld1)) { html = html.replace(jsOld1, jsNew1); changed++; }
  if (html.includes(jsOld2)) { html = html.replace(jsOld2, jsNew2); changed++; }

  if (changed !== 3) {
    console.log(`${page}: WARNING expected 3 changes, got ${changed}`);
    continue;
  }
  fs.writeFileSync(p, html);
  console.log(`${page}: OK`);
}
