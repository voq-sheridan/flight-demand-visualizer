---
title: Toronto Pearson Airport — Flight Activity
---

# ✈ Toronto Pearson International Airport (YYZ)— Flights Monitor

Live and upcoming flights for the next 24 hours (departures and arrivals).  
Data sourced from [AviationStack](https://aviationstack.com/).

<style>
  /* Layout */
  .top-row {
    display: flex;
    gap: 1.25rem;
    align-items: stretch;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .summary-panel {
    display: flex;
    gap: 0.75rem;
    align-items: stretch;
    flex: 1 1 340px;
    flex-wrap: wrap;
    padding: 0.15em 0.6em;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .pill-active    { background: #bbf7d0; color: #14532d; }
  .pill-delayed   { background: #fed7aa; color: #7c2d12; }
  .pill-landed    { background: #e5e7eb; color: #374151; }
  .pill-cancelled { background: #e5e7eb; color: #374151; }
  .pill-scheduled { background: #e0e7ff; color: #3730a3; }

  .meta {
    font-size: 0.82rem;
    color: #6b7280;
    margin-top: 0.75rem;
  }
  .legend {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    margin: 1rem 0;
    font-size: 0.83rem;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .dot-green  { background: #22c55e; }
  .dot-orange { background: #f97316; }
  .dot-gray   { background: #9ca3af; }
  .dot-blue   { background: #6366f1; }

  .heatmap-container {
    width: 100%;
    overflow-x: auto;
  }

  .heatmap-section-title {
    margin: 0.55rem 0 0.25rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #1f2937;
  }

  .heatmap-svg {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: #4b5563;
  }

  .heatmap-swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    display: inline-block;
    border: 1px solid #e5e7eb;
  }

  .heatmap-axis-label {
    font-size: 0.72rem;
    fill: #475569;
  }

  .control-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: #4b5563;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .control-row select {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    font-size: 0.85rem;
  }

  .staff-banner {
    margin-top: 0.65rem;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    font-size: 0.85rem;
    color: #92400e;
  }

  .date-heading {
    font-size: 0.9rem;
    font-weight: 600;
    color: #111827;
    margin: 0.25rem 0 0.35rem;
  }

  .chart-tooltip {
    position: absolute;
    pointer-events: none;
    background: #ffffff;
    border-radius: 6px;
    box-shadow: 0 4px 8px rgba(15,23,42,0.18);
    padding: 0.4rem 0.55rem;
    font-size: 0.78rem;
    color: #111827;
    z-index: 20;
    max-width: 240px;
  }

  .chart-tooltip.hidden {
    display: none;
  }

  .error-box {
    padding: 1rem 1.25rem;
    border-left: 4px solid #ef4444;
    background: #fef2f2;
    border-radius: 4px;
    color: #7f1d1d;
    font-size: 0.9rem;
  }
  .empty-box {
    padding: 1.5rem;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }
</style>

<div class="legend">
  <span class="legend-item"><span class="legend-dot dot-green"></span> Active / En-route — current demand</span>
  <span class="legend-item"><span class="legend-dot dot-orange"></span> Delayed — potential staffing disruption</span>
  <span class="legend-item"><span class="legend-dot dot-gray"></span> Cancelled / Landed</span>
  <span class="legend-item"><span class="legend-dot dot-blue"></span> Scheduled</span>
</div>

```js
const data = await FileAttachment("data/flights.json").json();
```

```js
// Render live summary, busyness chart and auto-refresh (10 minutes)
// Use Observable Framework's npm import syntax so D3 is bundled correctly.
import * as d3 from "npm:d3@7";

// Helper to safely parse times in Toronto timezone context
function toLocalDate(iso) {
  if (!iso) return null;
  return new Date(iso);
}

function buildUI() {
  // Top containers
  const wrapper = document.createElement('div');
  wrapper.className = 'top-row';

  const summaryPanel = document.createElement('div');
  summaryPanel.className = 'summary-panel';

  const chartCard = document.createElement('div');
  chartCard.className = 'chart-card';

  // Metric cards
  const metrics = {
    active: createMetricCard('Active', '—', 'metric-active-card'),
    delayed: createMetricCard('Delayed', '—', 'metric-delayed-card'),
    scheduled: createMetricCard('Scheduled', '—', 'metric-scheduled-card'),
    total: createMetricCard('Total flights', '—', 'metric-total-card')
  };
  Object.values(metrics).forEach(c => summaryPanel.appendChild(c.card));

  // Staffing recommendation banner (below summary cards)
  const staffBanner = document.createElement('div');
  staffBanner.className = 'staff-banner';
  staffBanner.textContent = 'Staffing insight will appear here once data is loaded.';
  summaryPanel.appendChild(staffBanner);

  // Chart title
  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = 'Flight volume by hour — next 24 hours';

  // Controls row: date selector + status filter
  const controlRow = document.createElement('div');
  controlRow.className = 'control-row';

  const dateGroup = document.createElement('div');
  dateGroup.className = 'control-group';
  const dateLabel = document.createElement('span');
  dateLabel.textContent = 'Date:';
  const dateSelect = document.createElement('select');
  dateGroup.appendChild(dateLabel);
  dateGroup.appendChild(dateSelect);

  const statusGroup = document.createElement('div');
  statusGroup.className = 'control-group';
  const statusLabel = document.createElement('span');
  statusLabel.textContent = 'Filter status:';
  const statusSelect = document.createElement('select');
  statusSelect.innerHTML = `
    <option value="all">All</option>
    <option value="active">Active</option>
    <option value="delayed">Delayed</option>
    <option value="landed">Landed</option>
    <option value="cancelled">Cancelled</option>
    <option value="scheduled">Scheduled</option>`;
  statusGroup.appendChild(statusLabel);
  statusGroup.appendChild(statusSelect);

  controlRow.appendChild(dateGroup);
  controlRow.appendChild(statusGroup);

  // Selected date heading
  const dateHeading = document.createElement('div');
  dateHeading.className = 'date-heading';

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'chart-sub';
  sub.textContent = 'GitHub-style heatmaps for today and tomorrow. Darker red indicates higher staffing pressure.';

  const depHeatmapTitle = document.createElement('div');
  depHeatmapTitle.className = 'heatmap-section-title';
  depHeatmapTitle.textContent = 'Departures by Hour';

  const depHeatmapContainer = document.createElement('div');
  depHeatmapContainer.className = 'heatmap-container';
  depHeatmapContainer.style.marginBottom = '0.55rem';

  const depHeatmapSvg = d3
    .select(depHeatmapContainer)
    .append('svg')
    .attr('class', 'heatmap-svg');

  const arrHeatmapTitle = document.createElement('div');
  arrHeatmapTitle.className = 'heatmap-section-title';
  arrHeatmapTitle.textContent = 'Arrivals by Hour';

  const arrHeatmapContainer = document.createElement('div');
  arrHeatmapContainer.className = 'heatmap-container';
  arrHeatmapContainer.style.marginBottom = '0.65rem';

  const arrHeatmapSvg = d3
    .select(arrHeatmapContainer)
    .append('svg')
    .attr('class', 'heatmap-svg');

  // Heatmap legend (Less -> More)
  const heatmapLegend = document.createElement('div');
  heatmapLegend.className = 'heatmap-legend';
  heatmapLegend.innerHTML = `
    <span>Less</span>
    <span class="heatmap-swatch" style="background:#f5f5f5"></span>
    <span class="heatmap-swatch" style="background:#fecaca"></span>
    <span class="heatmap-swatch" style="background:#f87171"></span>
    <span class="heatmap-swatch" style="background:#ef4444"></span>
    <span class="heatmap-swatch" style="background:#b91c1c"></span>
    <span>More</span>`;

  // Tooltip for bars
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip hidden';

  chartCard.appendChild(title);
  chartCard.appendChild(controlRow);
  chartCard.appendChild(dateHeading);
  chartCard.appendChild(sub);
  chartCard.appendChild(depHeatmapTitle);
  chartCard.appendChild(depHeatmapContainer);
  chartCard.appendChild(arrHeatmapTitle);
  chartCard.appendChild(arrHeatmapContainer);
  chartCard.appendChild(heatmapLegend);
  chartCard.appendChild(tooltip);

  wrapper.appendChild(summaryPanel);
  wrapper.appendChild(chartCard);

  // Container for the flight table below the top row
  const tableContainer = document.createElement('div');
  tableContainer.style.marginTop = '1.25rem';

  return {
    wrapper,
    summaryPanel,
    staffBanner,
    metrics,
    chartCard,
    dateSelect,
    statusSelect,
    dateHeading,
    depHeatmapSvg,
    depHeatmapContainer,
    arrHeatmapSvg,
    arrHeatmapContainer,
    tooltip,
    tableContainer
  };
}

function createMetricCard(label, num, variantClass) {
  const card = document.createElement('div');
  card.className = 'metric-card';
  if (variantClass) card.classList.add(variantClass);
  const n = document.createElement('div'); n.className = 'metric-num'; n.textContent = num;
  const l = document.createElement('div'); l.className = 'metric-label'; l.textContent = label;
  card.appendChild(n); card.appendChild(l);
  return {card, set: (v) => n.textContent = v};
}

// Build the dashboard UI once and attach it to the document
const {
  wrapper,
  summaryPanel,
  staffBanner,
  metrics,
  chartCard,
  dateSelect,
  statusSelect,
  dateHeading,
  depHeatmapSvg,
  depHeatmapContainer,
  arrHeatmapSvg,
  arrHeatmapContainer,
  tooltip,
  tableContainer
} = buildUI();

display(wrapper);

// Time helpers in Toronto timezone
function torontoDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function torontoHour(date) {
  return Number(date.toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    hour12: false,
    hour: '2-digit'
  }));
}

function hourLabelFromIndex(h) {
  const base = new Date(Date.UTC(2000, 0, 1, h, 0, 0));
  return base.toLocaleTimeString('en-CA', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: true
  });
}

function buildBinsForDate(flights, dateKey) {
  const bins = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: hourLabelFromIndex(h),
    departures: 0,
    arrivals: 0,
    total: 0,
    airlinesDep: {},
    airlinesArr: {},
    flightsDep: [],
    flightsArr: []
  }));

  flights.forEach(f => {
    const when = toLocalDate(f.scheduledTime);
    if (!when) return;
    if (torontoDateKey(when) !== dateKey) return;
    const h = torontoHour(when);
    if (h < 0 || h > 23) return;
    const bin = bins[h];
    if (f.type === 'departure') {
      bin.departures++;
      bin.airlinesDep[f.airline] = (bin.airlinesDep[f.airline] || 0) + 1;
      bin.flightsDep.push(f);
    } else {
      bin.arrivals++;
      bin.airlinesArr[f.airline] = (bin.airlinesArr[f.airline] || 0) + 1;
      bin.flightsArr.push(f);
    }
    bin.total = bin.departures + bin.arrivals;
  });

  return bins;
}

const HEATMAP_COLORS = ['#f5f5f5', '#fecaca', '#f87171', '#ef4444', '#b91c1c'];

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function shiftDateKey(dateKey, offsetDays) {
  const dt = parseDateKey(dateKey);
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getHeatmapDateKeys() {
  const todayKey = torontoDateKey(new Date());
  return [
    todayKey,
    shiftDateKey(todayKey, 1)
  ];
}

function isYYZDeparture(f) {
  const code = (f.departureIata || '').toUpperCase();
  return code === 'YYZ' || (!code && f.type === 'departure');
}

function isYYZArrival(f) {
  const code = (f.arrivalIata || '').toUpperCase();
  return code === 'YYZ' || (!code && f.type === 'arrival');
}

function buildDirectionalHeatmapData(flights, dateKeys, mode) {
  const effectiveDateKeys = dateKeys.slice(-2);
  const byDateHour = new Map();

  flights.forEach((f) => {
    if (mode === 'departures' && !isYYZDeparture(f)) return;
    if (mode === 'arrivals' && !isYYZArrival(f)) return;

    const when = toLocalDate(f.scheduledTime);
    if (!when) return;

    const dateKey = torontoDateKey(when);
  if (!effectiveDateKeys.includes(dateKey)) return;

    const hour = torontoHour(when);
    if (hour < 0 || hour > 23) return;

    const mapKey = `${dateKey}|${hour}`;
    if (!byDateHour.has(mapKey)) {
      byDateHour.set(mapKey, {
        dateKey,
        hour,
        total: 0,
        airlines: new Set()
      });
    }

    const slot = byDateHour.get(mapKey);
    slot.total += 1;
    if (f.airline) slot.airlines.add(f.airline);
  });

  const cells = [];
  effectiveDateKeys.forEach((dateKey) => {
    for (let hour = 0; hour < 24; hour++) {
      const slot = byDateHour.get(`${dateKey}|${hour}`);
      cells.push(slot ?? { dateKey, hour, total: 0, airlines: new Set() });
    }
  });

  const maxTotal = d3.max(cells, (d) => d.total) || 0;
  return { dateKeys: effectiveDateKeys, cells, maxTotal };
}

function drawDirectionalHeatmap(svg, container, heatmapData, sharedMax) {
  const { dateKeys, cells } = heatmapData;
  svg.selectAll('*').remove();

  const margin = { top: 26, right: 10, bottom: 14, left: 112 };
  const cols = 24;
  const gap = 3;

  const baseWidth = container.clientWidth || 1000;
  const usableWidth = Math.max(360, baseWidth - margin.left - margin.right);
  const cellSize = Math.max(10, Math.floor((usableWidth - gap * (cols - 1)) / cols));
  const gridWidth = cols * cellSize + (cols - 1) * gap;
  const rows = dateKeys.length;
  const gridHeight = rows * cellSize + (rows - 1) * gap;

  const width = margin.left + gridWidth + margin.right;
  const height = margin.top + gridHeight + margin.bottom;

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('width', '100%')
    .attr('height', height);

  const g = svg.append('g');
  const tooltipSel = d3.select(tooltip);

  const todayKey = torontoDateKey(new Date());
  const currentHour = torontoHour(new Date());
  const todayRowIndex = dateKeys.indexOf(todayKey);

  const color = d3
    .scaleQuantize()
    .domain([0, Math.max(1, sharedMax)])
    .range(HEATMAP_COLORS);

  const rowIndexByKey = new Map(dateKeys.map((d, i) => [d, i]));

  g
    .selectAll('.heatmap-hour-label')
    .data(d3.range(24))
    .join('text')
    .attr('class', 'heatmap-axis-label heatmap-hour-label')
    .attr('x', (d) => margin.left + d * (cellSize + gap) + cellSize / 2)
    .attr('y', margin.top - 8)
    .attr('text-anchor', 'middle')
    .text((d) => String(d).padStart(2, '0'));

  g
    .selectAll('.heatmap-date-label')
    .data(dateKeys)
    .join('text')
    .attr('class', 'heatmap-axis-label heatmap-date-label')
    .attr('x', margin.left - 10)
    .attr('y', (_, i) => margin.top + i * (cellSize + gap) + cellSize / 2 + 4)
    .attr('text-anchor', 'end')
  .style('font-weight', (d) => (d === todayKey ? '700' : '400'))
    .text((d) => {
      const dateObj = parseDateKey(d);
      return dateObj.toLocaleDateString('en-CA', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    });

  if (todayRowIndex >= 0 && currentHour >= 0 && currentHour <= 23) {
    const x = margin.left + currentHour * (cellSize + gap);
    const y = margin.top + todayRowIndex * (cellSize + gap);
    g
      .append('rect')
      .attr('x', x - 2)
      .attr('y', y - 2)
      .attr('width', cellSize + 4)
      .attr('height', cellSize + 4)
      .attr('rx', 5)
      .attr('fill', 'none')
      .attr('stroke', '#60a5fa')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.85);
  }

  g
    .selectAll('.heatmap-cell')
    .data(cells)
    .join('rect')
    .attr('class', 'heatmap-cell')
    .attr('x', (d) => margin.left + d.hour * (cellSize + gap))
    .attr('y', (d) => margin.top + rowIndexByKey.get(d.dateKey) * (cellSize + gap))
    .attr('width', cellSize)
    .attr('height', cellSize)
    .attr('rx', 4)
    .attr('ry', 4)
    .attr('fill', (d) => color(d.total))
    .style('cursor', 'pointer')
    .on('mousemove', (event, d) => {
      const dateObj = parseDateKey(d.dateKey);
      const dateLabel = dateObj.toLocaleDateString('en-CA', {
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const airlinesText = Array.from(d.airlines).sort().join(', ') || '—';

      tooltipSel
        .html(`
          <div><strong>${dateLabel}</strong></div>
          <div>Hour: ${String(d.hour).padStart(2, '0')}:00</div>
          <div>Total flights: <strong>${d.total}</strong></div>
          <div>Airlines: ${airlinesText}</div>
        `)
        .classed('hidden', false)
        .style('left', `${event.clientX + 12}px`)
        .style('top', `${event.clientY + 12}px`);
    })
    .on('mouseleave', () => {
      tooltipSel.classed('hidden', true);
    });
}

function pillClass(resolvedStatus) {
  return `pill-${resolvedStatus}`;
}

function rowClass(resolvedStatus) {
  return `status-${resolvedStatus}`;
}

function statusLabel(resolvedStatus, rawStatus, delay) {
  const labels = {
    active: 'Active',
    delayed: `Delayed${delay > 0 ? ` +${delay} min` : ''}`,
    landed: 'Landed',
    cancelled: 'Cancelled',
    scheduled: 'Scheduled',
  };
  return labels[resolvedStatus] ?? rawStatus ?? 'Unknown';
}

let allFlights = data.flights ?? [];
let fetchedAt = data.fetchedAt ? new Date(data.fetchedAt) : null;
const todayKey = torontoDateKey(new Date());
let availableDateKeys = [];
let currentDateKey = null;
let currentStatusFilter = 'all';
let peakBinGlobal = null;

let metaRow = null;
let metaBaseSpan = null;
let countdownSpan = null;

const REFRESH_MS = 10 * 60 * 1000;
let nextRefreshAt = Date.now() + REFRESH_MS;

function recomputeDateOptions() {
  const keysSet = new Set();
  allFlights.forEach(f => {
    const d = toLocalDate(f.scheduledTime);
    if (!d) return;
    keysSet.add(torontoDateKey(d));
  });
  availableDateKeys = Array.from(keysSet).sort();
  if (!currentDateKey) {
    currentDateKey = availableDateKeys.includes(todayKey)
      ? todayKey
      : availableDateKeys[0] || todayKey;
  } else if (!availableDateKeys.includes(currentDateKey) && availableDateKeys.length) {
    currentDateKey = availableDateKeys[0];
  }

  dateSelect.innerHTML = '';
  availableDateKeys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    const d = new Date(`${k}T00:00:00`);
    opt.textContent = d.toLocaleDateString('en-CA', {
      timeZone: 'America/Toronto',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (k === currentDateKey) opt.selected = true;
    dateSelect.appendChild(opt);
  });
}

function ensureMetaRow() {
  if (metaRow) return;
  metaRow = document.createElement('div');
  metaRow.id = 'visual-meta-row';
  metaRow.className = 'meta';
  metaBaseSpan = document.createElement('span');
  metaBaseSpan.id = 'meta-base';
  countdownSpan = document.createElement('span');
  countdownSpan.id = 'refresh-countdown';
  countdownSpan.style.marginLeft = '0.5rem';
  metaRow.appendChild(metaBaseSpan);
  metaRow.appendChild(countdownSpan);
  wrapper.appendChild(metaRow);
}

function updateMeta(visibleCount) {
  if (!fetchedAt) return;
  ensureMetaRow();
  const baseText = `Last updated: ${fetchedAt.toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })} ET  ·  ${visibleCount} flight${visibleCount !== 1 ? 's' : ''} shown`;
  metaBaseSpan.textContent = baseText;
}

function updateCountdown() {
  if (!countdownSpan || !nextRefreshAt) return;
  const now = Date.now();
  const remainingMs = Math.max(0, nextRefreshAt - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  countdownSpan.textContent = ` · Refresh in ${mm}:${ss}`;
}

const countdownTimer = setInterval(updateCountdown, 1000);

function renderTable(flightsForDate) {
  tableContainer.innerHTML = '';
  const filtered = flightsForDate.filter(f =>
    currentStatusFilter === 'all' ? true : f.resolvedStatus === currentStatusFilter
  );

  if (filtered.length === 0) {
    const box = document.createElement('div');
    box.className = 'empty-box';
    box.textContent = 'No flights found for this date and filters.';
    tableContainer.appendChild(box);
    return;
  }

  const table = document.createElement('table');
  table.className = 'flight-board';

  const rows = filtered.map((f) => {
    const airport = f.otherAirportCode
      ? `${f.otherAirport} (${f.otherAirportCode})`
      : f.otherAirport;
    const label = statusLabel(f.resolvedStatus, f.status, f.delay);
    return `
      <tr class="${rowClass(f.resolvedStatus)}">
        <td><span class="badge badge-${f.type === 'departure' ? 'dep' : 'arr'}">${f.type === 'departure' ? 'DEP' : 'ARR'}</span></td>
        <td><strong>${f.flightNumber}</strong></td>
        <td>${f.airline}</td>
        <td>${airport}</td>
        <td>${formatTime(f.scheduledTime)}</td>
        <td><span class="status-pill ${pillClass(f.resolvedStatus)}">${label}</span></td>
      </tr>`;
  }).join('');

  table.innerHTML = `
    <thead>
      <tr>
        <th>Type</th>
        <th>Flight</th>
        <th>Airline</th>
        <th>${'Origin / Destination'}</th>
        <th>Scheduled (ET)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>`;

  tableContainer.appendChild(table);
}

function renderForSelection() {
  if (!currentDateKey) return;
  const flightsForDate = allFlights.filter(f => {
    const d = toLocalDate(f.scheduledTime);
    return d && torontoDateKey(d) === currentDateKey;
  });

  // metrics for selected date
  const totalActive = flightsForDate.filter(f => f.resolvedStatus === 'active').length;
  const totalDelayed = flightsForDate.filter(f => f.resolvedStatus === 'delayed').length;
  const totalScheduled = flightsForDate.filter(f => f.resolvedStatus === 'scheduled').length;
  const totalFlights = flightsForDate.length;
  metrics.active.set(totalActive);
  metrics.delayed.set(totalDelayed);
  metrics.scheduled.set(totalScheduled);
  metrics.total.set(totalFlights);

  const bins = buildBinsForDate(flightsForDate, currentDateKey);

  // peak bin across total flights
  peakBinGlobal = null;
  bins.forEach(b => {
    if (!peakBinGlobal || b.total > peakBinGlobal.total) {
      peakBinGlobal = b;
    }
  });

  const heatmapDateKeys = getHeatmapDateKeys();
  const depHeatmapData = buildDirectionalHeatmapData(allFlights, heatmapDateKeys, 'departures');
  const arrHeatmapData = buildDirectionalHeatmapData(allFlights, heatmapDateKeys, 'arrivals');
  const sharedMax = Math.max(depHeatmapData.maxTotal, arrHeatmapData.maxTotal);

  drawDirectionalHeatmap(depHeatmapSvg, depHeatmapContainer, depHeatmapData, sharedMax);
  drawDirectionalHeatmap(arrHeatmapSvg, arrHeatmapContainer, arrHeatmapData, sharedMax);

  // selected date heading
  const d = new Date(`${currentDateKey}T00:00:00`);
  dateHeading.textContent = d.toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // staffing recommendation banner
  if (peakBinGlobal && peakBinGlobal.total > 0) {
    const startLabel = hourLabelFromIndex(peakBinGlobal.hour);
    const endHour = (peakBinGlobal.hour + 1) % 24;
    const endLabel = hourLabelFromIndex(endHour);
    staffBanner.textContent = `High demand expected between ${startLabel} – ${endLabel} (≈${peakBinGlobal.total} flights) — consider increasing staffing.`;
  } else {
    staffBanner.textContent = 'No significant demand peaks detected for the selected date.';
  }

  renderTable(flightsForDate);
  updateMeta(flightsForDate.length);
}

function applyNewData(srcData) {
  allFlights = srcData.flights ?? [];
  fetchedAt = srcData.fetchedAt ? new Date(srcData.fetchedAt) : null;
  recomputeDateOptions();
  renderForSelection();
}

// Wire up controls
dateSelect.addEventListener('change', () => {
  currentDateKey = dateSelect.value;
  renderForSelection();
});

statusSelect.addEventListener('change', () => {
  currentStatusFilter = statusSelect.value;
  renderForSelection();
});

// initial render
try {
  applyNewData(data);
} catch (e) {
  console.warn('Could not render chart initially', e);
}

// Auto-refresh every 10 minutes: attempt to fetch the JSON file and re-render if successful.
const refreshTimer = setInterval(async () => {
  try {
    const json = await FileAttachment("data/flights.json").json();
    applyNewData(json);
    nextRefreshAt = Date.now() + REFRESH_MS;
  } catch (e) {
    // fallback: do nothing; keep showing current snapshot
    console.warn('Auto-refresh failed:', e);
  }
}, REFRESH_MS);

// Clean up on notebook disposal (if runtime provides a hook)
if (typeof window !== 'undefined') {
  const beforeUnload = () => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
  };
  window.addEventListener('beforeunload', beforeUnload);
}

// Observable runtime cleanup on cell re-evaluation (prevents duplicate stale timers / 404 fetches).
if (typeof invalidation !== 'undefined') {
  invalidation.then(() => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
  });
}

```
```js
if (data.error) {
  const msg = data.error === "missing_api_key"
    ? "AviationStack API key is not configured. Set the <code>AVIATIONSTACK_API_KEY</code> environment variable and restart the dev server."
    : `Failed to load flight data: ${data.error}`;
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `⚠️ ${msg}`;
  display(box);
}
```

```js
const flights = data.flights ?? [];

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function pillClass(resolvedStatus) {
  return `pill-${resolvedStatus}`;
}

function rowClass(resolvedStatus) {
  return `status-${resolvedStatus}`;
}

function statusLabel(resolvedStatus, rawStatus, delay) {
  const labels = {
    active: "Active",
    delayed: `Delayed${delay > 0 ? ` +${delay} min` : ""}`,
    landed: "Landed",
    cancelled: "Cancelled",
    scheduled: "Scheduled",
  };
  return labels[resolvedStatus] ?? rawStatus ?? "Unknown";
}

if (flights.length === 0 && !data.error) {
  const box = document.createElement("div");
  box.className = "empty-box";
  box.textContent = "No flights found in the next 24 hours.";
  display(box);
} else if (flights.length > 0) {
  const rows = flights.map((f) => {
    const airport = f.otherAirportCode
      ? `${f.otherAirport} (${f.otherAirportCode})`
      : f.otherAirport;
    const label = statusLabel(f.resolvedStatus, f.status, f.delay);
    return `
      <tr class="${rowClass(f.resolvedStatus)}">
        <td><span class="badge badge-${f.type === "departure" ? "dep" : "arr"}">${f.type === "departure" ? "DEP" : "ARR"}</span></td>
        <td><strong>${f.flightNumber}</strong></td>
        <td>${f.airline}</td>
        <td>${airport}</td>
        <td>${formatTime(f.scheduledTime)}</td>
        <td><span class="status-pill ${pillClass(f.resolvedStatus)}">${label}</span></td>
      </tr>`;
  }).join("");

  const table = document.createElement("table");
  table.className = "flight-board";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Type</th>
        <th>Flight</th>
        <th>Airline</th>
        <th>${"Origin / Destination"}</th>
        <th>Scheduled (ET)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>`;
  display(table);
}
```

```js
if (data.fetchedAt) {
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `Last updated: ${new Date(data.fetchedAt).toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "short",
  })} ET  ·  ${flights.length} flight${flights.length !== 1 ? "s" : ""} shown`;
  display(meta);
}
```
