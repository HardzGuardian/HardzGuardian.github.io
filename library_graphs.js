// ===== Shared library activity graphs =====

const GRAPH_COLORS = ['#d4af37', '#c97b63', '#7ba88a', '#7b9fc9', '#c97bc1', '#c9c97b', '#a07bc9', '#7bc9b6'];
const GRAPH_SVG_NS = 'http://www.w3.org/2000/svg';

function buildLineChartSVG(series, xLabels, yMax) {
  const W = 600, H = 160;
  const padL = 28, padR = 10, padT = 10, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const svg = document.createElementNS(GRAPH_SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const n = xLabels.length;
  const xStep = n > 1 ? innerW / (n - 1) : 0;
  yMax = yMax || 1;

  const yDivisions = 4;
  for (let i = 0; i <= yDivisions; i++) {
    const y = padT + innerH - (innerH * i) / yDivisions;

    const line = document.createElementNS(GRAPH_SVG_NS, 'line');
    line.setAttribute('x1', padL);
    line.setAttribute('x2', W - padR);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'graph-grid-line');
    svg.appendChild(line);

    const label = document.createElementNS(GRAPH_SVG_NS, 'text');
    label.setAttribute('x', padL - 4);
    label.setAttribute('y', y + 2);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('class', 'graph-panel-axis-label');
    label.textContent = Math.round((yMax * i) / yDivisions);
    svg.appendChild(label);
  }

  // Only draw a handful of vertical grid lines/labels — with large date
  // ranges, one line per data point would overlap into a solid block.
  const labelStep = Math.max(1, Math.ceil(n / 12));
  const labelIndices = new Set();
  for (let i = 0; i < n; i += labelStep) labelIndices.add(i);
  labelIndices.add(n - 1);
  // Drop any regular index that sits too close to the last point, so its
  // label doesn't overlap with the final label.
  const minGap = labelStep;
  for (const i of [...labelIndices]) {
    if (i !== n - 1 && n - 1 - i < minGap) labelIndices.delete(i);
  }

  xLabels.forEach((xLabel, i) => {
    if (!labelIndices.has(i)) return;
    const x = padL + i * xStep;

    const line = document.createElementNS(GRAPH_SVG_NS, 'line');
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
    line.setAttribute('y1', padT);
    line.setAttribute('y2', padT + innerH);
    line.setAttribute('class', 'graph-grid-line');
    svg.appendChild(line);

    const text = document.createElementNS(GRAPH_SVG_NS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', H - 4);
    text.setAttribute('text-anchor', i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'));
    text.setAttribute('class', 'graph-panel-axis-label');
    text.textContent = xLabel;
    svg.appendChild(text);
  });

  series.forEach(s => {
    const linePoints = s.values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + innerH - (v / yMax) * innerH;
      return `${x},${y}`;
    });

    const baseY = padT + innerH;
    const areaPoints = [`${padL},${baseY}`, ...linePoints, `${padL + (n - 1) * xStep},${baseY}`].join(' ');

    const area = document.createElementNS(GRAPH_SVG_NS, 'polygon');
    area.setAttribute('points', areaPoints);
    area.setAttribute('fill', s.color);
    area.setAttribute('fill-opacity', '0.15');
    area.setAttribute('stroke', 'none');
    svg.appendChild(area);

    const polyline = document.createElementNS(GRAPH_SVG_NS, 'polyline');
    polyline.setAttribute('points', linePoints.join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', s.color);
    polyline.setAttribute('stroke-width', '1');
    svg.appendChild(polyline);
  });

  return svg;
}

function buildGraphPanel(title, series, xLabels, legendItems) {
  const panel = document.createElement('div');
  panel.className = 'graph-panel';

  const titleEl = document.createElement('div');
  titleEl.className = 'graph-panel-title';
  titleEl.textContent = title;
  panel.appendChild(titleEl);

  if (legendItems && legendItems.length) {
    const legend = document.createElement('div');
    legend.className = 'graph-panel-legend';
    legendItems.forEach(item => {
      const span = document.createElement('span');
      span.innerHTML = `<span class="swatch" style="background:${item.color}"></span>${item.label}`;
      legend.appendChild(span);
    });
    panel.appendChild(legend);
  }

  const yMax = Math.max(...series.flatMap(s => s.values), 1);
  panel.appendChild(buildLineChartSVG(series, xLabels, yMax));

  return panel;
}

async function renderLibraryGraphs(containerId) {
  const container = document.getElementById(containerId);
  const data = await loadAllLibraryEntries();

  const entries = data.entries.filter(e => e.dateAdded);
  const dates = entries.map(e => new Date(e.dateAdded)).sort((a, b) => a - b);
  const start = dates[0];
  const end = dates[dates.length - 1];

  // Bucket by day for short ranges, by month for long ones — otherwise a
  // multi-year span produces thousands of buckets, which is both slow and
  // renders as a solid block of overlapping grid lines.
  const spanDays = (end - start) / (1000 * 60 * 60 * 24);
  const useMonthly = spanDays > 60;

  const buckets = [];
  if (useMonthly) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: key.slice(2) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.push({ key, label: key.slice(2) });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const bucketKey = useMonthly ? (d) => d.slice(0, 7) : (d) => d;
  const xLabels = buckets.map(b => b.label);

  const series = data.categories.map((category, i) => {
    const counts = new Map();
    entries.forEach(e => {
      if (e.category !== category) return;
      const key = bucketKey(e.dateAdded);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const values = buckets.map(b => counts.get(b.key) || 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    return { label: category, color: GRAPH_COLORS[i % GRAPH_COLORS.length], values, total };
  }).filter(s => s.total > 0);

  container.appendChild(buildGraphPanel(
    'All',
    series,
    xLabels,
    series.map(s => ({ label: `${s.label} (${s.total})`, color: s.color }))
  ));

  series.forEach(s => {
    container.appendChild(buildGraphPanel(
      s.label,
      [s],
      xLabels,
      [{ label: `Total: ${s.total}`, color: s.color }]
    ));
  });
}
