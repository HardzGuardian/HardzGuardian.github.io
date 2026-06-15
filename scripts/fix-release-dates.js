// One-time fix: the initial MAL import wrote the "date added to MAL" (or
// today's date as a fallback) into data-release for every injected entry,
// instead of the actual release/air/publish date of the anime/manga/novel.
// This script re-queries Jikan for each entry's MAL id and records the real
// release date (aired.from for anime, published.from for manga/novel) as
// entry.releaseDate. Checkpointed so it can be resumed if interrupted.

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data');
const PROGRESS_PATH = path.join(OUT_DIR, 'mal-release-date-progress.json');

const TARGETS = [
  { file: 'anime.json', kind: 'anime' },
  { file: 'manga.json', kind: 'manga' },
  { file: 'novel.json', kind: 'manga' }
];

const REQUEST_DELAY_MS = 1000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function idFromLink(link) {
  const m = /myanimelist\.net\/(?:anime|manga)\/(\d+)/.exec(link || '');
  return m ? m[1] : null;
}

async function fetchJikan(kind, id) {
  const url = `https://api.jikan.moe/v4/${kind}/${id}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const json = await res.json();
    return json.data;
  }
  return undefined;
}

async function main() {
  const progress = readJson(PROGRESS_PATH, {});

  for (const target of TARGETS) {
    const dataPath = path.join(OUT_DIR, target.file);
    const json = readJson(dataPath, { entries: [] });
    const key = target.file;
    if (!progress[key]) progress[key] = { nextIndex: 0 };

    console.log(`${target.file}: ${json.entries.length} entries, resuming from ${progress[key].nextIndex}`);

    for (let i = progress[key].nextIndex; i < json.entries.length; i++) {
      const entry = json.entries[i];
      const id = idFromLink(entry.link);

      if (!id) {
        entry.releaseDate = entry.dateAdded;
      } else {
        const data = await fetchJikan(target.kind, id);
        if (!data) {
          entry.releaseDate = entry.dateAdded;
        } else {
          const range = target.kind === 'anime' ? data.aired : data.published;
          const from = range && range.from ? range.from.slice(0, 10) : null;
          entry.releaseDate = from || entry.dateAdded;
        }
        await sleep(REQUEST_DELAY_MS);
      }

      progress[key].nextIndex = i + 1;

      if (i % 20 === 0 || i === json.entries.length - 1) {
        writeJson(dataPath, json);
        writeJson(PROGRESS_PATH, progress);
        console.log(`  [${i + 1}/${json.entries.length}] ${entry.title} -> ${entry.releaseDate}`);
      }
    }

    writeJson(dataPath, json);
    writeJson(PROGRESS_PATH, progress);
  }

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
