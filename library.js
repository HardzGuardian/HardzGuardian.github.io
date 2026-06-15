// ===== Personal Media Library =====

const CATEGORY_CONFIG = {
  "Movies":        { progressLabel: null,       statusType: "watch" },
  "TV Shows":      { progressLabel: "Episodes", statusType: "watch" },
  "Anime":         { progressLabel: "Episodes", statusType: "watch" },
  "Manga":         { progressLabel: "Chapters", statusType: "read" },
  "Novel":         { progressLabel: "Chapters", statusType: "read" },
  "Book":          { progressLabel: "Pages",    statusType: "read" },
  "Tools":         { progressLabel: null,       statusType: null }
};

// Display labels per status, varying by category type (watch vs. read media).
// The underlying status value (used for data-status/CSS and dashboard counts)
// stays the same across categories — only the displayed label changes.
const STATUS_LABELS = {
  watch: {
    "Plan":        "Plan to Watch",
    "In Progress": "Watching",
    "Completed":   "Completed",
    "On Hold":     "On Hold",
    "Dropped":     "Dropped"
  },
  read: {
    "Plan":        "Plan to Read",
    "In Progress": "Reading",
    "Completed":   "Completed",
    "On Hold":     "On Hold",
    "Dropped":     "Dropped"
  }
};

function getStatusLabel(category, status) {
  const type = (CATEGORY_CONFIG[category] || {}).statusType;
  const map = STATUS_LABELS[type];
  return (map && map[status]) || status;
}

const LIB_JSON_PATH = window.LIBRARY_JSON_PATH || 'library.json';
const LIB_ADMIN_PATH = window.LIBRARY_ADMIN_PATH || 'admin.html';

let LIBRARY_DATA = null;

async function loadLibraryData() {
  if (LIBRARY_DATA) return LIBRARY_DATA;
  const res = await fetch(LIB_JSON_PATH);
  LIBRARY_DATA = await res.json();
  return LIBRARY_DATA;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusBadgeHtml(status, category) {
  if (!status) return '';
  const label = getStatusLabel(category, status);
  return `<span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function ratingHtml(rating) {
  if (rating === null || rating === undefined || rating === '') return '';
  return `<span class="lib-rating"><i class="ti ti-star-filled"></i>${escapeHtml(rating)}</span>`;
}

function coverHtml(entry, imgClass) {
  if (entry.cover) {
    return `<img class="${imgClass}" src="${escapeHtml(entry.cover)}" alt="${escapeHtml(entry.title)}" loading="lazy">`;
  }
  return escapeHtml(entry.title);
}

// ===== Category card grid =====

function buildLibraryCard(entry) {
  const card = document.createElement('div');
  card.className = 'lib-card';
  card.addEventListener('click', () => openLibraryModal(entry.id));

  const cover = document.createElement('div');
  cover.className = 'lib-card-cover';
  cover.innerHTML = coverHtml(entry, 'lib-card-cover-img');
  if (cover.querySelector('img')) {
    cover.querySelector('img').style.width = '100%';
    cover.querySelector('img').style.height = '100%';
    cover.querySelector('img').style.objectFit = 'cover';
  }

  const body = document.createElement('div');
  body.className = 'lib-card-body';
  body.innerHTML = `
    <div class="lib-card-title">${escapeHtml(entry.title)}</div>
    <div class="lib-card-meta">${statusBadgeHtml(entry.status, entry.category)}${ratingHtml(entry.rating)}</div>
  `;

  card.appendChild(cover);
  card.appendChild(body);
  return card;
}

function updateCategoryStats(entries) {
  const totalEl = document.getElementById('lib-total-count');
  if (totalEl) totalEl.textContent = `Total Entries: ${entries.length}`;

  const countByStatus = (status) => entries.filter(e => e.status === status).length;

  const completedEl = document.getElementById('lib-stat-completed');
  if (completedEl) completedEl.textContent = countByStatus('Completed');

  const progressEl = document.getElementById('lib-stat-progress');
  if (progressEl) progressEl.textContent = countByStatus('In Progress');

  const planEl = document.getElementById('lib-stat-plan');
  if (planEl) planEl.textContent = countByStatus('Plan');

  const rated = entries.filter(e => e.rating !== null && e.rating !== undefined && e.rating !== '');
  const ratingEl = document.getElementById('lib-stat-rating');
  if (ratingEl) {
    ratingEl.textContent = rated.length
      ? (rated.reduce((sum, e) => sum + Number(e.rating), 0) / rated.length).toFixed(1)
      : '–';
  }
}

async function buildCategoryGrid(category) {
  const data = await loadLibraryData();
  const grid = document.getElementById('lib-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const entries = data.entries.filter(e => e.category === category);

  updateCategoryStats(entries);

  if (!entries.length) {
    grid.innerHTML = '<div class="admin-empty">No entries yet. Add one from the admin page.</div>';
    return;
  }

  entries.forEach(entry => grid.appendChild(buildLibraryCard(entry)));
}

// ===== Detail modal =====

function openLibraryModal(id) {
  const data = LIBRARY_DATA;
  if (!data) return;
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;

  const cfg = CATEGORY_CONFIG[entry.category] || {};

  closeLibraryModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'lib-modal-backdrop';
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeLibraryModal();
  });

  const modal = document.createElement('div');
  modal.className = 'lib-modal';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lib-modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', closeLibraryModal);

  const cover = document.createElement('div');
  cover.className = 'lib-modal-cover';
  if (entry.cover) {
    cover.innerHTML = `<img src="${escapeHtml(entry.cover)}" alt="${escapeHtml(entry.title)}">`;
  } else {
    cover.textContent = entry.title;
  }

  const body = document.createElement('div');
  body.className = 'lib-modal-body';

  let html = `<div class="lib-modal-category">${escapeHtml(entry.category)}</div>`;
  html += `<h3 class="lib-modal-title">${escapeHtml(entry.title)}</h3>`;
  html += `<div class="lib-modal-badges">${statusBadgeHtml(entry.status, entry.category)}${ratingHtml(entry.rating)}</div>`;

  if (entry.genres && entry.genres.length) {
    html += `<div class="genre-chip-row">${entry.genres.map(g => `<span class="genre-chip">${escapeHtml(g)}</span>`).join('')}</div>`;
  }

  if (entry.description) {
    html += `<div class="lib-modal-desc">${escapeHtml(entry.description)}</div>`;
  }

  if (cfg.progressLabel && entry.progress && entry.progress.total) {
    const { current = 0, total } = entry.progress;
    const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
    html += `
      <div class="lib-progress-wrap">
        <div class="lib-progress-label">${escapeHtml(cfg.progressLabel)}: ${escapeHtml(current)} / ${escapeHtml(total)}</div>
        <div class="lib-progress-bar"><div class="lib-progress-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }

  if (entry.notes) {
    html += `<div class="lib-modal-notes">${escapeHtml(entry.notes)}</div>`;
  }

  html += `<div class="lib-modal-actions">`;
  if (entry.link) {
    html += `<a class="admin-btn" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener noreferrer">Open Link</a>`;
  }
  html += `<a class="admin-btn primary" href="${LIB_ADMIN_PATH}?id=${encodeURIComponent(entry.id)}">Edit</a>`;
  html += `</div>`;

  body.innerHTML = html;

  modal.appendChild(closeBtn);
  modal.appendChild(cover);
  modal.appendChild(body);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  document.addEventListener('keydown', libraryModalEscHandler);
}

function libraryModalEscHandler(e) {
  if (e.key === 'Escape') closeLibraryModal();
}

function closeLibraryModal() {
  const backdrop = document.querySelector('.lib-modal-backdrop');
  if (backdrop) backdrop.remove();
  document.removeEventListener('keydown', libraryModalEscHandler);
}

// ===== Init =====

async function initLibraryCategoryPage(category) {
  await loadLibraryData();
  await buildCategoryGrid(category);
}
