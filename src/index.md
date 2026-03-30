---
title: Flight Monitor Visualization - Toronto Pearson International Airport YYZ
---

# Flight Monitor Visualization - Toronto Pearson International Airport YYZ

All available flights currently returned by the API feed for departures and arrivals.  
Data sourced from AeroDataBox via RapidAPI.

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
  .snapshot-totals {
    flex: 1 1 100%;
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: #334155;
    margin-top: 0.25rem;
    padding: 0.35rem 0.55rem;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
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
    font-size: 1.25rem;
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
    align-items: flex-start;
    gap: 0.45rem;
    margin-top: 0.69rem;
    font-size: 0.8rem;
    color: #4b5563;
  }

  .heatmap-legend-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.18rem;
    min-width: 72px;
  }

  .heatmap-legend-name {
    font-size: 1rem;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.1;
    text-align: center;
  }

  .heatmap-legend-range {
    font-size: 0.90rem;
    color: #6b7280;
    line-height: 1.1;
    text-align: center;
  }

  .heatmap-swatch {
    width: 25px;
    height: 25px;
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

  .staff-insight-box {
    margin-top: 0.45rem;
    border: 2px solid #60a5fa;
    border-radius: 10px;
    background: #eff6ff;
    color: #1e3a8a;
    font-size: 0.82rem;
    padding: 0.55rem 0.7rem;
  }

  .staff-insight-box h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .staff-insight-box ul {
    margin: 0.35rem 0 0;
    padding-left: 1.1rem;
  }

  .staff-insight-box li {
    margin: 0.25rem 0;
    line-height: 1.35;
  }

  .staff-insight-badge {
    display: inline-block;
    margin: 0.35rem 0 0.15rem;
    padding: 0.14rem 0.45rem;
    border-radius: 999px;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    background: rgba(255, 255, 255, 0.55);
  }

  .staff-state-upcoming {
    border-color: #60a5fa;
    background: #eff6ff;
    color: #1e3a8a;
  }

  .staff-state-active-departure {
    border-color: #f59e0b;
    background: #fffbeb;
    color: #92400e;
  }

  .staff-state-active-arrival {
    border-color: #ef4444;
    background: #fef2f2;
    color: #991b1b;
  }

  .staff-state-passed {
    border-color: #9ca3af;
    background: #f3f4f6;
    color: #374151;
  }

  .staff-state-low {
    border-color: #22c55e;
    background: #ecfdf5;
    color: #166534;
  }

  .date-heading {
    font-size: 2rem;
    font-weight: 600;
    color: #111827;
    margin: 0.25rem 0 0.35rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    background: #ffffff;
    display: inline-block;
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

  .table-section {
    max-height: 600px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
    padding: 0.75rem;
  }

  .table-summary {
    font-size: 0.85rem;
    color: #475569;
    margin-bottom: 0.55rem;
    font-weight: 600;
  }

  .table-scroll {
    overflow-x: auto;
  }

  .table-pagination {
    margin-top: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
  }

  .pagination-btn {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.3rem 0.65rem;
    cursor: pointer;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #f1f5f9;
  }

  .pagination-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .pagination-info {
    font-size: 0.82rem;
    color: #475569;
    min-width: 90px;
    text-align: center;
  }

  .back-to-top-btn {
    position: fixed;
    right: 16px;
    bottom: 16px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #ffffff;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0.42rem 0.72rem;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 40;
  }

  .back-to-top-btn.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .list-panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 0.8rem;
    align-items: start;
  }

  .list-panel {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
    padding: 0.7rem 0.75rem;
  }

  .list-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    margin-bottom: 0.4rem;
  }

  .list-panel-header .heatmap-section-title {
    margin: 0;
  }

  .list-toggle-btn {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.28rem 0.55rem;
    cursor: pointer;
  }

  .list-toggle-btn:hover {
    background: #f1f5f9;
  }

  .list-panel-body.collapsed {
    display: none;
  }

  @media (max-width: 980px) {
    .list-panels {
      grid-template-columns: 1fr;
    }
  }
</style>

```js
const data = await FileAttachment("./data/flights.json").json();
```

```js
// Render live summary, busyness chart and auto-refresh (1 hour)
// Use Observable Framework's npm import syntax so D3 is bundled correctly.
let d3;
try {
  d3 = await import("npm:d3@7");
} catch (err) {
  console.warn("Primary D3 bundle failed to load, falling back to CDN:", err);
  d3 = await import("https://cdn.jsdelivr.net/npm/d3@7/+esm");
}

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
    active: createMetricCard('', '—', 'metric-active-card'),
    delayed: createMetricCard('', '—', 'metric-delayed-card'),
    scheduled: createMetricCard('', '—', 'metric-scheduled-card'),
    total: createMetricCard('', '—', 'metric-total-card')
  };
  Object.values(metrics).forEach(c => summaryPanel.appendChild(c.card));

  const snapshotTotals = document.createElement('div');
  snapshotTotals.className = 'snapshot-totals';
  snapshotTotals.textContent = 'Snapshot totals (all loaded dates) — Total: — · Departures: — · Arrivals: —';
  summaryPanel.appendChild(snapshotTotals);

  const departureInsightBox = document.createElement('div');
  departureInsightBox.className = 'staff-insight-box staff-state-upcoming';
  departureInsightBox.innerHTML = '<h4>🛫 Departure Staffing Advisory</h4><div class="staff-insight-badge">⏳ Upcoming — Prep window</div><div>Loading departure staffing insight…</div>';

  const arrivalInsightBox = document.createElement('div');
  arrivalInsightBox.className = 'staff-insight-box staff-state-upcoming';
  arrivalInsightBox.innerHTML = '<h4>🛬 Arrival Staffing Advisory</h4><div class="staff-insight-badge">⏳ Upcoming — Prep window</div><div>Loading arrival staffing insight…</div>';

  // Chart title
  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = '';

  // Selected date heading
  const dateHeading = document.createElement('div');
  dateHeading.className = 'date-heading';

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'chart-sub';
  sub.textContent = 'Departures and arrivals heatmaps of YYZ flights for yesterday, today, and tomorrow.';

  const depHeatmapTitle = document.createElement('div');
  depHeatmapTitle.className = 'heatmap-section-title';
  depHeatmapTitle.textContent = 'Departures by Hour (All Available Dates, ET · Live)';

  const depHeatmapContainer = document.createElement('div');
  depHeatmapContainer.className = 'heatmap-container';
  depHeatmapContainer.style.marginBottom = '0.55rem';

  const depHeatmapSvg = d3
    .select(depHeatmapContainer)
    .append('svg')
    .attr('class', 'heatmap-svg');

  const arrHeatmapTitle = document.createElement('div');
  arrHeatmapTitle.className = 'heatmap-section-title';
  arrHeatmapTitle.textContent = 'Arrivals by Hour (All Available Dates, ET · Live)';

  const arrHeatmapContainer = document.createElement('div');
  arrHeatmapContainer.className = 'heatmap-container';
  arrHeatmapContainer.style.marginBottom = '0.65rem';

  const arrHeatmapSvg = d3
    .select(arrHeatmapContainer)
    .append('svg')
    .attr('class', 'heatmap-svg');

  // Heatmap legend (flight-count thresholds)
  const heatmapLegend = document.createElement('div');
  heatmapLegend.className = 'heatmap-legend';
  heatmapLegend.innerHTML = `
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#f5f5f5" title="Quiet / 0 flights"></span>
      <span class="heatmap-legend-name">Quiet</span>
      <span class="heatmap-legend-range">0 flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fee5d9" title="Low / 1–20 flights"></span>
      <span class="heatmap-legend-name">Low</span>
      <span class="heatmap-legend-range">1–20 flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fcae91" title="Moderate / 21–50 flights"></span>
      <span class="heatmap-legend-name">Moderate</span>
      <span class="heatmap-legend-range">21–50 flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fb6a4a" title="Busy / 51–80 flights"></span>
      <span class="heatmap-legend-name">Busy</span>
      <span class="heatmap-legend-range">51–80 flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#cb181d" title="Peak / 81+ flights"></span>
      <span class="heatmap-legend-name">Peak</span>
      <span class="heatmap-legend-range">81+ flights</span>
    </span>`;

  // Tooltip for bars
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip hidden';

  chartCard.appendChild(title);
  chartCard.appendChild(dateHeading);
  chartCard.appendChild(sub);
  chartCard.appendChild(depHeatmapTitle);
  chartCard.appendChild(depHeatmapContainer);
  chartCard.appendChild(departureInsightBox);
  chartCard.appendChild(arrHeatmapTitle);
  chartCard.appendChild(arrHeatmapContainer);
  chartCard.appendChild(arrivalInsightBox);
  chartCard.appendChild(heatmapLegend);
  chartCard.appendChild(tooltip);

  wrapper.appendChild(chartCard);

  // Container for the flight table below the top row
  const tableContainer = document.createElement('div');
  tableContainer.style.marginTop = '1.25rem';

  return {
    wrapper,
    summaryPanel,
  snapshotTotals,
    departureInsightBox,
    arrivalInsightBox,
    metrics,
    chartCard,
    dateHeading,
    depHeatmapSvg,
    depHeatmapContainer,
    arrHeatmapSvg,
    arrHeatmapContainer,
    heatmapLegend,
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
  snapshotTotals,
  departureInsightBox,
  arrivalInsightBox,
  metrics,
  chartCard,
  dateHeading,
  depHeatmapSvg,
  depHeatmapContainer,
  arrHeatmapSvg,
  arrHeatmapContainer,
  heatmapLegend,
  tooltip,
  tableContainer
} = buildUI();

display(wrapper);
display(tableContainer);

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
  return formatClock12(h, 0);
}

function torontoHourMinute(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

function torontoMinutesNow() {
  const { hour, minute } = torontoHourMinute(new Date());
  return hour * 60 + minute;
}

function formatClock12(hour24, minute = 0) {
  const normalizedHour = ((Math.floor(hour24) % 24) + 24) % 24;
  const normalizedMinute = ((Math.floor(minute) % 60) + 60) % 60;
  const period = normalizedHour >= 12 ? 'PM' : 'AM';
  const hour12 = normalizedHour % 12 || 12;
  return `${hour12}:${String(normalizedMinute).padStart(2, '0')} ${period}`;
}

function formatClockFromMinutes(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalized = ((Math.floor(totalMinutes) % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return formatClock12(hour, minute);
}

const LOW_DEMAND_MAX_FLIGHTS = 20;
const HIGH_DEMAND_MIN_FLIGHTS = 81;

function getPeakHourForToday(flights, mode) {
  const todayDateKey = torontoDateKey(new Date());
  const hourlyTotals = Array.from({ length: 24 }, () => 0);

  flights.forEach((f) => {
    if (mode === 'departures' && !isYYZDeparture(f)) return;
    if (mode === 'arrivals' && !isYYZArrival(f)) return;

    const when = toLocalDate(f.scheduledTime);
    if (!when) return;
    if (torontoDateKey(when) !== todayDateKey) return;

    const hour = torontoHour(when);
    if (hour < 0 || hour > 23) return;
    hourlyTotals[hour] += 1;
  });

  let peakHour = 0;
  let peakTotal = hourlyTotals[0] || 0;
  for (let hour = 1; hour < 24; hour++) {
    if (hourlyTotals[hour] > peakTotal) {
      peakTotal = hourlyTotals[hour];
      peakHour = hour;
    }
  }

  return { peakHour, peakTotal };
}

function applyInsightState(box, state, html) {
  box.className = `staff-insight-box ${state}`;
  box.innerHTML = html;
}

function renderDepartureInsightBox(box, flights) {
  const { peakHour, peakTotal } = getPeakHourForToday(flights, 'departures');
  if (peakTotal <= LOW_DEMAND_MAX_FLIGHTS) {
    applyInsightState(
      box,
      'staff-state-low',
      `
        <h4>🛫 Departure Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>✓ Low Demand — Standard staffing</strong></div>
      `
    );
    return;
  }

  if (peakTotal < HIGH_DEMAND_MIN_FLIGHTS) {
    applyInsightState(
      box,
      'staff-state-upcoming',
      `
        <h4>🛫 Departure Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>ℹ Moderate Demand — Monitor staffing</strong></div>
      `
    );
    return;
  }

  const nowMinutes = torontoMinutesNow();
  const peakStart = peakHour * 60;
  const prepStart = peakStart - 210;
  const prepEnd = peakStart - 30;
  const deployBy = peakStart - 180;

  if (nowMinutes >= peakStart + 60) {
    applyInsightState(
      box,
      'staff-state-passed',
      `
        <h4>🛫 Departure Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>✓ Peak Passed — Monitor tomorrow</strong></div>
      `
    );
    return;
  }

  const isActive = nowMinutes >= prepStart && nowMinutes < peakStart;
  const stateClass = isActive ? 'staff-state-active-departure' : 'staff-state-upcoming';
  const badgeLabel = isActive
    ? '⚠ Active Now — Deploy Staff'
    : '⏳ Upcoming — Prep window';

  const peakHourLabel = formatClockFromMinutes(peakStart);
  const prepStartLabel = formatClockFromMinutes(prepStart);
  const prepEndLabel = formatClockFromMinutes(prepEnd);
  const deployByLabel = formatClockFromMinutes(deployBy);

  applyInsightState(
    box,
    stateClass,
    `
      <h4>🛫 Departure Staffing Advisory</h4>
      <div class="staff-insight-badge"><strong>${badgeLabel}</strong></div>
      <ul>
        <li>TSA Screening — <strong>Staff up ${prepStartLabel}–${prepEndLabel}</strong> (<strong>${peakTotal}</strong> flights at <strong>${peakHourLabel}</strong> peak)</li>
        <li>Gate & Ground Crew — <strong>Deploy by ${deployByLabel}</strong> for <strong>${peakTotal}</strong> departures</li>
        <li>Check-in Counters — <strong>Open ${prepStartLabel}–${peakHourLabel}</strong> for peak flow (<strong>${peakTotal}</strong> flights)</li>
      </ul>
    `
  );
}

function renderArrivalInsightBox(box, flights) {
  const { peakHour, peakTotal } = getPeakHourForToday(flights, 'arrivals');
  if (peakTotal <= LOW_DEMAND_MAX_FLIGHTS) {
    applyInsightState(
      box,
      'staff-state-low',
      `
        <h4>🛬 Arrival Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>✓ Low Demand — Standard staffing</strong></div>
      `
    );
    return;
  }

  if (peakTotal < HIGH_DEMAND_MIN_FLIGHTS) {
    applyInsightState(
      box,
      'staff-state-upcoming',
      `
        <h4>🛬 Arrival Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>ℹ Moderate Demand — Monitor staffing</strong></div>
      `
    );
    return;
  }

  const nowMinutes = torontoMinutesNow();
  const peakStart = peakHour * 60;
  const coverageEnd = peakStart + 210;
  const borderEnd = peakStart + 150;
  const exitStart = peakStart + 30;

  if (nowMinutes > coverageEnd) {
    applyInsightState(
      box,
      'staff-state-passed',
      `
        <h4>🛬 Arrival Staffing Advisory</h4>
        <div class="staff-insight-badge"><strong>✓ Peak Passed — Monitor tomorrow</strong></div>
      `
    );
    return;
  }

  const isActive = nowMinutes >= peakStart && nowMinutes <= coverageEnd;
  const stateClass = isActive ? 'staff-state-active-arrival' : 'staff-state-upcoming';
  const badgeLabel = isActive
    ? '⚠ Active Now — Deploy Staff'
    : '⏳ Upcoming — Prep window';

  const peakHourLabel = formatClockFromMinutes(peakStart);
  const coverageEndLabel = formatClockFromMinutes(coverageEnd);
  const borderEndLabel = formatClockFromMinutes(borderEnd);
  const exitStartLabel = formatClockFromMinutes(exitStart);

  applyInsightState(
    box,
    stateClass,
    `
      <h4>🛬 Arrival Staffing Advisory</h4>
      <div class="staff-insight-badge"><strong>${badgeLabel}</strong></div>
      <ul>
        <li>Baggage Claim — <strong>Staff up ${peakHourLabel}–${coverageEndLabel}</strong> (<strong>${peakTotal}</strong> flights at <strong>${peakHourLabel}</strong> peak)</li>
        <li>Immigration — <strong>Increase ${peakHourLabel}–${borderEndLabel}</strong> for incoming flow</li>
        <li>Customs & Exit Lanes — <strong>Maintain ${exitStartLabel}–${coverageEndLabel}</strong> for arrivals clearing</li>
      </ul>
    `
  );
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

function buildHeatmapBands(peakMax) {
  const peak = Math.max(1, Number(peakMax) || 1);
  let q1 = Math.ceil(peak * 0.25);
  let q2 = Math.ceil(peak * 0.5);
  let q3 = Math.ceil(peak * 0.75);

  q1 = Math.max(1, q1);
  q2 = Math.max(q1 + 1, q2);
  q3 = Math.max(q2 + 1, q3);

  return {
    domain: [1, q1 + 1, q2 + 1, q3 + 1],
    lowMax: q1,
    moderateMin: q1 + 1,
    moderateMax: q2,
    busyMin: q2 + 1,
    busyMax: q3,
    peakMin: q3 + 1
  };
}

let currentHeatmapBands = buildHeatmapBands(81);

function updateHeatmapLegendFromBands(legendEl, bands) {
  legendEl.innerHTML = `
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#f5f5f5" title="Quiet / 0 flights"></span>
      <span class="heatmap-legend-name">Quiet</span>
      <span class="heatmap-legend-range">0 flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fee5d9" title="Low / 1–${bands.lowMax} flights"></span>
      <span class="heatmap-legend-name">Low</span>
      <span class="heatmap-legend-range">1–${bands.lowMax} flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fcae91" title="Moderate / ${bands.moderateMin}–${bands.moderateMax} flights"></span>
      <span class="heatmap-legend-name">Moderate</span>
      <span class="heatmap-legend-range">${bands.moderateMin}–${bands.moderateMax} flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#fb6a4a" title="Busy / ${bands.busyMin}–${bands.busyMax} flights"></span>
      <span class="heatmap-legend-name">Busy</span>
      <span class="heatmap-legend-range">${bands.busyMin}–${bands.busyMax} flights</span>
    </span>
    <span class="heatmap-legend-item">
      <span class="heatmap-swatch" style="background:#cb181d" title="Peak / ${bands.peakMin}+ flights"></span>
      <span class="heatmap-legend-name">Peak</span>
      <span class="heatmap-legend-range">${bands.peakMin}+ flights</span>
    </span>`;
}

function heatmapColor(total) {
  const heatmapColorScale = d3
    .scaleThreshold()
    .domain(currentHeatmapBands.domain)
    .range(['#f5f5f5', '#fee5d9', '#fcae91', '#fb6a4a', '#cb181d']);
  return heatmapColorScale(total);
}

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
  const loaderDates = loadedDates || {};
  const loaded = [loaderDates.yesterday, loaderDates.today, loaderDates.tomorrow]
    .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (loaded.length === 3) return loaded;

  const todayKey = torontoDateKey(new Date());
  return [
    shiftDateKey(todayKey, -1),
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
  const effectiveDateKeys = [...dateKeys];
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
    .style('font-size', (d) => (d === todayKey ? '1rem' : '0.72rem'))
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
    .attr('fill', (d) => heatmapColor(d.total))
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
let lastFetchedAtIso = data.fetchedAt || null;
let loadedDates = data?.dates || {};
let dataWarnings = Array.isArray(data?.warnings) ? data.warnings : [];
let availableDateKeys = [];
let currentDateKey = null;
let currentStatusFilter = 'all';
let currentTablePage = 1;
const ROWS_PER_PAGE = 25;

let metaRow = null;
let metaBaseSpan = null;
let countdownSpan = null;

const REFRESH_MS = 60 * 60 * 1000;
let nextRefreshAt = Date.now() + REFRESH_MS;
let isPageActive = typeof document === 'undefined' ? true : document.visibilityState === 'visible';

function recomputeDateOptions() {
  const todayDateKey = torontoDateKey(new Date());
  const keysSet = new Set();
  allFlights.forEach(f => {
    const d = toLocalDate(f.scheduledTime);
    if (!d) return;
    keysSet.add(torontoDateKey(d));
  });
  availableDateKeys = Array.from(keysSet).sort();
  if (!currentDateKey) {
    currentDateKey = availableDateKeys.includes(todayDateKey)
      ? todayDateKey
      : availableDateKeys[0] || todayDateKey;
  } else if (!availableDateKeys.includes(currentDateKey) && availableDateKeys.length) {
    currentDateKey = availableDateKeys[0];
  }
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

function updateMeta(selectedDateCount, totalLoadedCount) {
  if (!fetchedAt) return;
  ensureMetaRow();
  const baseText = `Last updated: ${fetchedAt.toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })} ET  ·  ${selectedDateCount} flight${selectedDateCount !== 1 ? 's' : ''} on selected date · ${totalLoadedCount} total loaded · Auto-refresh every 1 hour`;
  metaBaseSpan.textContent = baseText;
}

function updateCountdown() {
  if (!countdownSpan || !nextRefreshAt) return;

  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    countdownSpan.textContent = ' · Auto-refresh paused while tab inactive';
    return;
  }

  const now = Date.now();
  const remainingMs = Math.max(0, nextRefreshAt - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  countdownSpan.textContent = ` · Refresh in ${hh}:${mm}:${ss}`;
}

const countdownTimer = setInterval(updateCountdown, 1000);

function updateSnapshotTotals(srcData) {
  const flights = Array.isArray(srcData?.flights) ? srcData.flights : [];
  const total = flights.length;
  const departures = Number.isFinite(srcData?.totalDepartures)
    ? srcData.totalDepartures
    : flights.filter((f) => f.type === 'departure').length;
  const arrivals = Number.isFinite(srcData?.totalArrivals)
    ? srcData.totalArrivals
    : flights.filter((f) => f.type === 'arrival').length;
  const warnings = Array.isArray(srcData?.warnings) ? srcData.warnings : [];
  dataWarnings = warnings;

  const warningSuffix = warnings.length
    ? ` · ⚠ Partial API data (${warnings.length} day${warnings.length > 1 ? 's' : ''} degraded)`
    : '';
  snapshotTotals.textContent = `Snapshot totals (all loaded dates) — Total: ${total} · Departures: ${departures} · Arrivals: ${arrivals}${warningSuffix}`;
}

function renderTable(flightsForDate) {
  tableContainer.innerHTML = '';
  const filtered = flightsForDate.filter(f =>
    currentStatusFilter === 'all' ? true : f.resolvedStatus === currentStatusFilter
  );

  const tableSection = document.createElement('div');
  tableSection.className = 'table-section';

  const controlsRow = document.createElement('div');
  controlsRow.className = 'control-row';
  const statusGroup = document.createElement('div');
  statusGroup.className = 'control-group';
  const statusLabelEl = document.createElement('label');
  statusLabelEl.textContent = 'Status';
  const statusSelect = document.createElement('select');
  statusSelect.innerHTML = `
    <option value="all">All</option>
    <option value="active">Active</option>
    <option value="delayed">Delayed</option>
    <option value="landed">Landed</option>
    <option value="cancelled">Cancelled</option>
    <option value="scheduled">Scheduled</option>
  `;
  statusSelect.value = currentStatusFilter;
  statusSelect.addEventListener('change', () => {
    currentStatusFilter = statusSelect.value;
    currentTablePage = 1;
    renderForSelection();
  });
  statusGroup.appendChild(statusLabelEl);
  statusGroup.appendChild(statusSelect);
  controlsRow.appendChild(statusGroup);
  tableSection.appendChild(controlsRow);

  const totalFlights = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFlights / ROWS_PER_PAGE));
  currentTablePage = Math.min(Math.max(1, currentTablePage), totalPages);
  const startIndex = totalFlights === 0 ? 0 : (currentTablePage - 1) * ROWS_PER_PAGE;
  const endIndex = totalFlights === 0 ? 0 : Math.min(startIndex + ROWS_PER_PAGE, totalFlights);
  const pageRows = filtered.slice(startIndex, endIndex);

  const summary = document.createElement('div');
  summary.className = 'table-summary';
  summary.textContent = `Showing ${totalFlights === 0 ? 0 : startIndex + 1} to ${endIndex} of ${totalFlights} flights`;
  tableSection.appendChild(summary);

  if (totalFlights === 0) {
    const box = document.createElement('div');
    box.className = 'empty-box';
    box.textContent = 'No flights found for this date and filters.';
    tableSection.appendChild(box);
    tableContainer.appendChild(tableSection);
    return;
  }

  const tableScroll = document.createElement('div');
  tableScroll.className = 'table-scroll';

  const table = document.createElement('table');
  table.className = 'flight-board';

  const rows = pageRows.map((f) => {
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

  tableScroll.appendChild(table);
  tableSection.appendChild(tableScroll);

  const pagination = document.createElement('div');
  pagination.className = 'table-pagination';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentTablePage <= 1;
  prevBtn.addEventListener('click', () => {
    if (currentTablePage <= 1) return;
    currentTablePage -= 1;
    renderForSelection();
  });

  const pageInfo = document.createElement('div');
  pageInfo.className = 'pagination-info';
  pageInfo.textContent = `Page ${currentTablePage} of ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentTablePage >= totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentTablePage >= totalPages) return;
    currentTablePage += 1;
    renderForSelection();
  });

  pagination.appendChild(prevBtn);
  pagination.appendChild(pageInfo);
  pagination.appendChild(nextBtn);
  tableSection.appendChild(pagination);

  tableContainer.appendChild(tableSection);
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

  const heatmapDateKeys = getHeatmapDateKeys();
  const depHeatmapData = buildDirectionalHeatmapData(allFlights, heatmapDateKeys, 'departures');
  const arrHeatmapData = buildDirectionalHeatmapData(allFlights, heatmapDateKeys, 'arrivals');
  const sharedMax = Math.max(depHeatmapData.maxTotal, arrHeatmapData.maxTotal);
  currentHeatmapBands = buildHeatmapBands(sharedMax);
  updateHeatmapLegendFromBands(heatmapLegend, currentHeatmapBands);

  drawDirectionalHeatmap(depHeatmapSvg, depHeatmapContainer, depHeatmapData, sharedMax);
  drawDirectionalHeatmap(arrHeatmapSvg, arrHeatmapContainer, arrHeatmapData, sharedMax);

  // selected date heading + current Toronto time
  const d = parseDateKey(currentDateKey);
  const dateText = d.toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const currentTimeEt = new Date().toLocaleTimeString('en-CA', {
    timeZone: 'America/Toronto',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  dateHeading.textContent = `${dateText} · ${currentTimeEt} ET`;

  renderDepartureInsightBox(departureInsightBox, allFlights);
  renderArrivalInsightBox(arrivalInsightBox, allFlights);

  renderTable(flightsForDate);
  updateMeta(flightsForDate.length, allFlights.length);
}

function applyNewData(srcData) {
  allFlights = srcData.flights ?? [];
  fetchedAt = srcData.fetchedAt ? new Date(srcData.fetchedAt) : null;
  lastFetchedAtIso = srcData.fetchedAt || lastFetchedAtIso;
  loadedDates = srcData?.dates || loadedDates;
  dataWarnings = Array.isArray(srcData?.warnings) ? srcData.warnings : dataWarnings;
  currentTablePage = 1;
  updateSnapshotTotals(srcData);
  recomputeDateOptions();
  renderForSelection();
}

async function fetchLatestFlightsData() {
  // Use stable path first to avoid stale-hash 404s when users return after a redeploy.
  const stableUrl = `./data/flights.json?_=${Date.now()}`;
  const stableResp = await fetch(stableUrl, { cache: 'no-store' });
  if (stableResp.ok) {
    return await stableResp.json();
  }
  if (stableResp.status !== 404) {
    throw new Error(`Refresh request failed with HTTP ${stableResp.status}`);
  }

  // Fallback for local preview/dev cases where stable path is absent.
  const attachmentUrl = await FileAttachment("./data/flights.json").url();
  const attachmentFetchUrl = attachmentUrl.includes('?')
    ? `${attachmentUrl}&_=${Date.now()}`
    : `${attachmentUrl}?_=${Date.now()}`;

  const attachmentResp = await fetch(attachmentFetchUrl, { cache: 'no-store' });
  if (attachmentResp.status === 404) {
    return null;
  }
  if (!attachmentResp.ok) {
    throw new Error(`Refresh request failed with HTTP ${attachmentResp.status}`);
  }
  return await attachmentResp.json();
}

// initial render
try {
  applyNewData(data);
} catch (e) {
  console.warn('Could not render chart initially', e);
}

async function runRefreshCycle() {
  if (!isPageActive) return;

  try {
    const json = await fetchLatestFlightsData();
    if (!json) {
      return;
    }
    const incomingFetchedAt = json?.fetchedAt || null;

    // Re-render if payload changed or timestamp is newer.
    if (
      !lastFetchedAtIso ||
      !incomingFetchedAt ||
      incomingFetchedAt !== lastFetchedAtIso ||
      (json?.flights?.length ?? 0) !== allFlights.length
    ) {
      applyNewData(json);
    }
  } catch (e) {
    // fallback: do nothing; keep showing current snapshot
    console.warn('Auto-refresh failed:', e);
  } finally {
    nextRefreshAt = Date.now() + REFRESH_MS;
  }
}

// Auto-refresh every 1 hour when page is active.
const refreshTimer = setInterval(() => {
  void runRefreshCycle();
}, REFRESH_MS);

let onVisibilityChangeHandler = null;
let beforeUnloadHandler = null;
let onScrollHandler = null;
let backToTopBtn = null;

// Clean up on notebook disposal (if runtime provides a hook)
if (typeof window !== 'undefined') {
  backToTopBtn = document.createElement('button');
  backToTopBtn.type = 'button';
  backToTopBtn.className = 'back-to-top-btn';
  backToTopBtn.textContent = 'Back to top';
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(backToTopBtn);

  onScrollHandler = () => {
    if (!backToTopBtn) return;
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', onScrollHandler, { passive: true });

  onVisibilityChangeHandler = () => {
    isPageActive = document.visibilityState === 'visible';
    if (isPageActive) {
      nextRefreshAt = Date.now() + REFRESH_MS;
      void runRefreshCycle();
    }
  };

  beforeUnloadHandler = () => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    if (onScrollHandler) {
      window.removeEventListener('scroll', onScrollHandler);
    }
    if (backToTopBtn) {
      backToTopBtn.remove();
      backToTopBtn = null;
    }
    if (onVisibilityChangeHandler) {
      window.removeEventListener('visibilitychange', onVisibilityChangeHandler);
    }
  };

  window.addEventListener('visibilitychange', onVisibilityChangeHandler);
  window.addEventListener('beforeunload', beforeUnloadHandler);
}

// Observable runtime cleanup on cell re-evaluation (prevents duplicate stale timers / 404 fetches).
if (typeof invalidation !== 'undefined') {
  invalidation.then(() => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    if (typeof window !== 'undefined') {
      if (onScrollHandler) {
        window.removeEventListener('scroll', onScrollHandler);
      }
      if (backToTopBtn) {
        backToTopBtn.remove();
        backToTopBtn = null;
      }
      if (onVisibilityChangeHandler) {
        window.removeEventListener('visibilitychange', onVisibilityChangeHandler);
      }
      if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    }
  });
}

```
```js
if (data.error) {
  const msg = `Failed to load flight data: ${data.error}`;
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `⚠️ ${msg}`;
  display(box);
}
```

```js
const flights = data.flights ?? [];

function torontoDateKeyForList(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

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

const departuresAll = flights
  .filter((f) => {
    if (f.type !== "departure") return false;
    const when = new Date(f.scheduledTime);
    if (Number.isNaN(when.getTime())) return false;
    return true;
  })
  .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

const arrivalsAll = flights
  .filter((f) => {
    if (f.type !== "arrival") return false;
    const when = new Date(f.scheduledTime);
    if (Number.isNaN(when.getTime())) return false;
    return true;
  })
  .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

const listsWrap = document.createElement("div");
listsWrap.className = "list-panels";

function createFlightListPanel({
  title,
  flights,
  flightLabel,
  typeBadge,
  locationHeader,
  emptyText,
  includeHint = false,
}) {
  const panel = document.createElement("section");
  panel.className = "list-panel";

  const header = document.createElement("div");
  header.className = "list-panel-header";

  const heading = document.createElement("div");
  heading.className = "heatmap-section-title";
  heading.textContent = title;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "list-toggle-btn";
  toggleBtn.textContent = "Show list";

  header.appendChild(heading);
  header.appendChild(toggleBtn);

  const body = document.createElement("div");
  body.className = "list-panel-body";
  body.classList.add("collapsed");

  if (data.fetchedAt) {
    const panelMeta = document.createElement("div");
    panelMeta.className = "meta";
    panelMeta.style.marginTop = "0";
    panelMeta.textContent = `Last updated: ${new Date(data.fetchedAt).toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "medium",
      timeStyle: "short",
    })} ET  ·  ${flights.length} ${flightLabel} flight${flights.length !== 1 ? "s" : ""} shown`;
    body.appendChild(panelMeta);
  }

  if (includeHint) {
    const hint = document.createElement("div");
    hint.className = "meta";
    hint.style.marginTop = "0.35rem";
    hint.textContent = "This list shows all flights currently available in the feed. Check constantly for new flight updates";
    body.appendChild(hint);
  }

  if (flights.length === 0 && !data.error) {
    const box = document.createElement("div");
    box.className = "empty-box";
    box.textContent = emptyText;
    body.appendChild(box);
  } else if (flights.length > 0) {
    const rows = flights.map((f) => {
      const airport = f.otherAirportCode
        ? `${f.otherAirport} (${f.otherAirportCode})`
        : f.otherAirport;
      return `
      <tr class="${rowClass(f.resolvedStatus)}">
        <td><span class="badge badge-${typeBadge}">${typeBadge.toUpperCase()}</span></td>
        <td><strong>${f.flightNumber}</strong></td>
        <td>${f.airline}</td>
        <td>${airport}</td>
        <td>${formatTime(f.scheduledTime)}</td>
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
        <th>${locationHeader}</th>
        <th>Scheduled (ET)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>`;
    body.appendChild(table);
  }

  toggleBtn.addEventListener("click", () => {
    const isCollapsed = body.classList.toggle("collapsed");
    toggleBtn.textContent = isCollapsed ? "Show list" : "Hide list";
  });

  panel.appendChild(header);
  panel.appendChild(body);
  return panel;
}

listsWrap.appendChild(
  createFlightListPanel({
    title: "Departure List (All Available Flights, ET)",
    flights: departuresAll,
    flightLabel: "departure",
    typeBadge: "dep",
    locationHeader: "Destination",
    emptyText: "No departure flights currently available in the API feed.",
    includeHint: true,
  })
);

listsWrap.appendChild(
  createFlightListPanel({
    title: "Arrival List (All Available Flights, ET)",
    flights: arrivalsAll,
    flightLabel: "arrival",
    typeBadge: "arr",
    locationHeader: "Origin",
    emptyText: "No arrival flights currently available in the API feed.",
    includeHint: true,
  })
);

display(listsWrap);
```
