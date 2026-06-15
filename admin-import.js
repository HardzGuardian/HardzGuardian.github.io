// ===== Admin: Import from URL =====
// Detects a source (MyAnimeList via Jikan, Google Books) from a pasted URL/ISBN
// and returns a partial library entry to auto-fill the admin form.
// Sources without a CORS-friendly public API (MangaUpdates, MyDramaList, AniList,
// Anime-Planet, TMDB, ...) are reported as unsupported so the UI can fall back
// to manual entry.

const ADMIN_IMPORT_SOURCES = [
  { name: 'MangaUpdates', test: /mangaupdates\.com/i },
  { name: 'MyDramaList', test: /mydramalist\.com/i },
  { name: 'AniList', test: /anilist\.co/i },
  { name: 'Anime-Planet', test: /anime-planet\.com/i },
  { name: 'TMDB', test: /themoviedb\.org/i }
];

const MAL_STATUS_MAP = {
  'Finished Airing': 'Completed',
  'Currently Airing': 'In Progress',
  'Not yet aired': 'Plan',
  'Finished': 'Completed',
  'Publishing': 'In Progress',
  'On Hiatus': 'On Hold',
  'Discontinued': 'Dropped',
  'Not yet published': 'Plan'
};

function isbnFromString(str) {
  const cleaned = str.replace(/[-\s]/g, '');
  return /^(97[89])?\d{9}[\dXx]$/.test(cleaned) ? cleaned : null;
}

async function fetchJikan(kind, id) {
  const res = await fetch(`https://api.jikan.moe/v4/${kind}/${id}/full`);
  if (!res.ok) throw new Error(`MyAnimeList lookup failed (${res.status})`);
  const { data } = await res.json();

  const genres = [
    ...(data.genres || []),
    ...(data.themes || []),
    ...(data.demographics || [])
  ].map(g => g.name);

  const entry = {
    title: data.title_english || data.title || '',
    cover: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || '',
    description: data.synopsis || '',
    genres,
    status: MAL_STATUS_MAP[data.status] || 'Plan',
    rating: typeof data.score === 'number' ? data.score : null
  };

  const total = kind === 'anime' ? data.episodes : data.chapters;
  if (total) entry.progress = { current: 0, total };

  return { source: 'MyAnimeList', entry };
}

async function fetchGoogleBooks(query, byId) {
  const url = byId
    ? `https://www.googleapis.com/books/v1/volumes/${query}`
    : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books lookup failed (${res.status})`);
  const data = await res.json();

  const volume = byId ? data : (data.items && data.items[0]);
  if (!volume) throw new Error('No matching book found');

  const info = volume.volumeInfo || {};
  const title = info.subtitle ? `${info.title}: ${info.subtitle}` : (info.title || '');
  let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
  if (cover.startsWith('http://')) cover = cover.replace('http://', 'https://');

  const entry = {
    title,
    cover,
    description: info.description || '',
    genres: info.categories || [],
    status: 'Plan',
    rating: typeof info.averageRating === 'number' ? info.averageRating : null
  };

  if (info.pageCount) entry.progress = { current: 0, total: info.pageCount };

  return { source: 'Google Books', entry };
}

async function tryImportFromUrl(input) {
  const value = input.trim();
  if (!value) throw new Error('Enter a URL or ISBN first.');

  let url = null;
  try { url = new URL(value); } catch (e) { /* not a URL, maybe an ISBN */ }

  if (url) {
    const host = url.hostname.replace(/^www\./, '');

    let m = url.pathname.match(/\/anime\/(\d+)/);
    if (host.includes('myanimelist.net') && m) return fetchJikan('anime', m[1]);

    m = url.pathname.match(/\/manga\/(\d+)/);
    if (host.includes('myanimelist.net') && m) return fetchJikan('manga', m[1]);

    if (host.includes('books.google')) {
      const id = url.searchParams.get('id');
      if (id) return fetchGoogleBooks(id, true);
    }

    for (const src of ADMIN_IMPORT_SOURCES) {
      if (src.test.test(host)) return { unsupported: true, sourceName: src.name };
    }

    return { unsupported: true, sourceName: host };
  }

  const isbn = isbnFromString(value);
  if (isbn) return fetchGoogleBooks(`isbn:${isbn}`, false);

  return { unsupported: true, sourceName: 'this input' };
}

window.tryImportFromUrl = tryImportFromUrl;
