// One-time bulk import: MyAnimeList manga export -> data/manga.json + data/novel.json
// Enriches each entry via Jikan (cover, genres, type, synopsis) and filters out
// Hentai/Ecchi/Erotica. Checkpointed so it can be safely resumed if interrupted.

const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, '..', 'MAL', 'mangalist_1781525808_-_5553223.xml');
const OUT_DIR = path.join(__dirname, '..', 'data');
const MANGA_OUT = path.join(OUT_DIR, 'manga.json');
const NOVEL_OUT = path.join(OUT_DIR, 'novel.json');
const PROGRESS_PATH = path.join(OUT_DIR, 'mal-manga-progress.json');
const EXCLUDED_PATH = path.join(OUT_DIR, 'mal-manga-excluded.json');
const FAILED_PATH = path.join(OUT_DIR, 'mal-manga-failed.json');

const ADULT_TAGS = new Set(['Hentai', 'Ecchi', 'Erotica']);

const STATUS_MAP = {
  'Reading': 'In Progress',
  'Completed': 'Completed',
  'On-Hold': 'On Hold',
  'Dropped': 'Dropped',
  'Plan to Read': 'Plan'
};

const REQUEST_DELAY_MS = 1000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function decodeCdata(text) {
  return text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function parseEntries(xml) {
  const entries = [];
  const re = /<manga>([\s\S]*?)<\/manga>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
      const mm = r.exec(block);
      return mm ? decodeCdata(mm[1]) : '';
    };
    entries.push({
      id: get('manga_mangadb_id'),
      title: get('manga_title'),
      volumes: parseInt(get('manga_volumes'), 10) || 0,
      chapters: parseInt(get('manga_chapters'), 10) || 0,
      myReadChapters: parseInt(get('my_read_chapters'), 10) || 0,
      myReadVolumes: parseInt(get('my_read_volumes'), 10) || 0,
      myScore: parseInt(get('my_score'), 10) || 0,
      myStatus: get('my_status'),
      myStartDate: get('my_start_date')
    });
  }
  return entries;
}

async function fetchJikan(id) {
  const url = `https://api.jikan.moe/v4/manga/${id}`;
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
  return undefined; // signals "failed after retries"
}

function isAdult(data) {
  const tags = [
    ...(data.genres || []),
    ...(data.themes || []),
    ...(data.demographics || []),
    ...(data.explicit_genres || [])
  ];
  return tags.some(t => ADULT_TAGS.has(t.name));
}

function mapEntry(raw, data) {
  const isNovel = data.type === 'Novel' || data.type === 'Light Novel';
  const category = isNovel ? 'Novel' : 'Manga';
  const genres = [
    ...(data.genres || []),
    ...(data.themes || [])
  ].map(g => g.name);
  const total = data.chapters || raw.chapters || data.volumes || raw.volumes || 0;
  const current = raw.myReadChapters || raw.myReadVolumes || 0;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.myStartDate) && raw.myStartDate !== '0000-00-00';
  const entry = {
    id: `${category.toLowerCase()}-mal-${raw.id}`,
    category,
    title: data.title_english || data.title || raw.title,
    cover: (data.images && data.images.jpg && data.images.jpg.large_image_url) || '',
    description: (data.synopsis || '').replace(/\n+/g, ' ').slice(0, 600),
    genres,
    status: STATUS_MAP[raw.myStatus] || 'Plan',
    rating: raw.myScore || null,
    notes: '',
    link: `https://myanimelist.net/manga/${raw.id}`,
    dateAdded: validDate ? raw.myStartDate : new Date().toISOString().slice(0, 10)
  };
  if (total) entry.progress = { current, total };
  return entry;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const xml = fs.readFileSync(XML_PATH, 'utf8');
  const allEntries = parseEntries(xml);

  const progress = readJson(PROGRESS_PATH, { nextIndex: 0, included: 0, excluded: 0, failed: 0 });
  const manga = readJson(MANGA_OUT, { entries: [] });
  const novel = readJson(NOVEL_OUT, { entries: [] });
  const excluded = readJson(EXCLUDED_PATH, []);
  const failed = readJson(FAILED_PATH, []);

  console.log(`Total manga entries in export: ${allEntries.length}`);
  console.log(`Resuming from index ${progress.nextIndex}`);

  for (let i = progress.nextIndex; i < allEntries.length; i++) {
    const raw = allEntries[i];

    if (raw.myStatus !== 'Completed' || raw.myScore < 8) {
      progress.nextIndex = i + 1;
      continue;
    }

    const data = await fetchJikan(raw.id);

    if (data === undefined) {
      failed.push({ id: raw.id, title: raw.title });
      progress.failed++;
    } else if (data === null) {
      failed.push({ id: raw.id, title: raw.title, reason: '404' });
      progress.failed++;
    } else if (isAdult(data)) {
      excluded.push({ id: raw.id, title: raw.title, genres: (data.genres || []).map(g => g.name) });
      progress.excluded++;
    } else {
      const entry = mapEntry(raw, data);
      if (entry.category === 'Novel') novel.entries.push(entry);
      else manga.entries.push(entry);
      progress.included++;
    }

    progress.nextIndex = i + 1;

    if (i % 20 === 0 || i === allEntries.length - 1) {
      writeJson(MANGA_OUT, manga);
      writeJson(NOVEL_OUT, novel);
      writeJson(EXCLUDED_PATH, excluded);
      writeJson(FAILED_PATH, failed);
      writeJson(PROGRESS_PATH, progress);
      console.log(`[${i + 1}/${allEntries.length}] included=${progress.included} excluded=${progress.excluded} failed=${progress.failed}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  writeJson(MANGA_OUT, manga);
  writeJson(NOVEL_OUT, novel);
  writeJson(EXCLUDED_PATH, excluded);
  writeJson(FAILED_PATH, failed);
  writeJson(PROGRESS_PATH, progress);
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
