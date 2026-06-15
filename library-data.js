// Shared loader for root-level pages (index.html, volume_tree.html).
// Merges the curated library.json with the bulk-imported per-category
// data files so stats/galleries reflect everything automatically.

const LIBRARY_EXTRA_DATA_FILES = ['data/anime.json', 'data/manga.json', 'data/novel.json'];

async function loadAllLibraryEntries() {
  const [main, ...extras] = await Promise.all(
    ['library.json', ...LIBRARY_EXTRA_DATA_FILES].map(p =>
      fetch(p).then(r => r.json()).catch(() => ({ entries: [] }))
    )
  );

  const entries = [main.entries || [], ...extras.map(e => e.entries || [])].flat();
  return { categories: main.categories || [], entries };
}
