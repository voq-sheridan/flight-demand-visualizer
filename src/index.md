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
    ````
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

  /* Busyness legend swatches */
  .busyness-legend { display:flex; gap:0.6rem; align-items:center; margin-top:0.5rem }
  .busyness-swatch { width:18px; height:12px; border-radius:3px; display:inline-block }
  .bus-low { background: #bbf7d0 }
  .bus-med { background: #fde68a }
  .bus-high{ background: #fecaca }

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
  sub.textContent = 'Separate hourly views for departures and arrivals. Bars colored by overall busyness (low, moderate, high).';

  // SVG containers for departures and arrivals
  const svgDepContainer = document.createElement('div');
  svgDepContainer.style.width = '100%';
  svgDepContainer.style.overflowX = 'auto';
  svgDepContainer.style.overflowY = 'visible';
  svgDepContainer.style.marginBottom = '0.75rem';

  const depLabel = document.createElement('div');
  depLabel.className = 'chart-sub';
  depLabel.style.marginBottom = '0.1rem';
  depLabel.textContent = 'Departures by hour';

  const svgDep = d3.select(svgDepContainer).append('svg');

  const svgArrContainer = document.createElement('div');
  svgArrContainer.style.width = '100%';
  svgArrContainer.style.overflowX = 'auto';
  svgArrContainer.style.overflowY = 'visible';

  const arrLabel = document.createElement('div');
  arrLabel.className = 'chart-sub';
  arrLabel.style.marginTop = '0.4rem';
  arrLabel.style.marginBottom = '0.1rem';
  arrLabel.textContent = 'Arrivals by hour';

  const svgArr = d3.select(svgArrContainer).append('svg');

  // Busyness legend
  const busLegend = document.createElement('div');
  busLegend.className = 'busyness-legend';
  busLegend.innerHTML = `<span class="busyness-swatch bus-low"></span><span style="color:#374151">Low</span>
                         <span class="busyness-swatch bus-med"></span><span style="color:#374151">Moderate</span>
                         <span class="busyness-swatch bus-high"></span><span style="color:#374151">High</span>`;

  // Tooltip for bars
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip hidden';

  chartCard.appendChild(title);
  chartCard.appendChild(controlRow);
  chartCard.appendChild(dateHeading);
  chartCard.appendChild(sub);
  chartCard.appendChild(depLabel);
  chartCard.appendChild(svgDepContainer);
  chartCard.appendChild(arrLabel);
  chartCard.appendChild(svgArrContainer);
  chartCard.appendChild(busLegend);
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
    svgDep,
    svgArr,
    svgDepContainer,
    svgArrContainer,
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
  svgDep,
  svgArr,
  svgDepContainer,
  svgArrContainer,
  tooltip,
  tableContainer
} = buildUI();

display(wrapper);

// Time helpers in Toronto timezone
function torontoDateKey(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
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

function colorByBusyness(total, tertiles) {
  if (total <= tertiles[0]) return '#bbf7d0'; // low
  if (total <= tertiles[1]) return '#fde68a'; // med
  return '#fecaca'; // high
}

// Map resolvedStatus to dot colours used on the timeline
function statusColor(resolvedStatus) {
  switch (resolvedStatus) {
    case 'active':
      return '#22c55e'; // green
    case 'delayed':
      return '#f97316'; // orange
    case 'landed':
    case 'cancelled':
      return '#9ca3af'; // gray
    case 'scheduled':
    default:
      return '#6366f1'; // blue
  }
}
// Convert a Date in Toronto time to minutes since midnight
function minutesSinceMidnight(date) {
  const parts = date.toLocaleTimeString('en-CA', {
    timeZone: 'America/Toronto',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return h * 60 + m;
}

function minutesLabel(m) {
  const h = Math.round(m / 60);
  return hourLabelFromIndex(h);
}

function drawChart(svg, svgContainer, bins, key, currentMinutes) {
  const margin = { top: 24, right: 16, bottom: 40, left: 40 };
  const baseWidth = svgContainer.clientWidth || 800;
  const width = baseWidth;
  const height = 240;

  svg.attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const hours = bins.map(d => d.hour);

  const x0 = d3
    .scaleBand()
    .domain(hours)
    .range([0, innerWidth])
    .paddingInner(0.15);

  const maxFlights =
    d3.max(bins, d =>
      key === "departures" ? d.flightsDep.length : d.flightsArr.length
    ) || 0;

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(1, maxFlights)])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3
    .axisBottom(x0)
    .tickValues(hours)
    .tickFormat(h => hourLabelFromIndex(h));

  g
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .call(g => g.selectAll(".tick line").attr("opacity", 0.3))
    .call(g => g.select(".domain").attr("opacity", 0.4));

  const yAxis = d3
    .axisLeft(y)
    .ticks(Math.min(4, maxFlights))
    .tickFormat(d => (d === 0 ? "" : d));

  g
    .append("g")
    .call(yAxis)
    .call(g => g.selectAll(".tick line").attr("opacity", 0.15))
    .call(g => g.select(".domain").attr("opacity", 0.4));

  // Horizontal grid lines.
  g
    .append("g")
    .attr("class", "grid-lines")
    .selectAll("line")
    .data(y.ticks(Math.min(4, maxFlights)))
    .join("line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 0.7)
    .attr("stroke-dasharray", "2,2");

  // Current time marker if viewing "today".
  if (currentMinutes != null) {
    const hourIndex = Math.floor(currentMinutes / 60);
    const minuteInHour = currentMinutes % 60;
    const bandX = x0(hourIndex);
    if (bandX != null) {
      const bandWidth = x0.bandwidth();
      const frac = minuteInHour / 60;
      const xNow = bandX + bandWidth * frac;
      g
        .append("line")
        .attr("x1", xNow)
        .attr("x2", xNow)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#ff4d4f")
        .attr("stroke-dasharray", "4,3")
        .attr("stroke-width", 1.2);
    }
  }

  const tooltipSel = d3.select(tooltip);

  const bandWidth = x0.bandwidth();
  const barWidth = bandWidth * 0.6;

  const hourGroups = g
    .selectAll(".hour-group")
    .data(bins)
    .join("g")
    .attr("class", "hour-group")
    .attr("transform", d => `translate(${x0(d.hour)},0)`);

  hourGroups.each(function (bin) {
    const flights = key === "departures" ? bin.flightsDep : bin.flightsArr;
    const group = d3.select(this);

    flights.forEach((f, i) => {
      const yBottom = y(i);
      const yTop = y(i + 1);

      group
        .append("rect")
        .attr("x", (bandWidth - barWidth) / 2)
        .attr("y", yTop)
        .attr("width", barWidth)
        .attr("height", Math.max(0, yBottom - yTop))
        .attr("rx", 2)
        .attr("fill", statusColor(f.resolvedStatus))
        .style("cursor", "pointer")
        .on("mousemove", (event) => {
          const local = toLocalDate(f.scheduledTime);
          const timeStr = local.toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit"
          });
          const kind = f.type === "departure" ? "Departs" : "Arrives";

          const html = `
            <div><strong>${f.flightNumber}</strong> · ${f.airline}</div>
            <div>${kind} ${f.type === "departure" ? "to" : "from"} ${
              f.otherAirport
            } (${f.otherAirportCode})</div>
            <div>${timeStr} · ${statusLabel(f.resolvedStatus)}</div>
          `;

          tooltipSel
            .html(html)
            .classed("hidden", false)
            .style("left", `${event.clientX + 12}px`)
            .style("top", `${event.clientY + 12}px`);
        })
        .on("mouseleave", () => {
          tooltipSel.classed("hidden", true);
        });
    });
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

setInterval(updateCountdown, 1000);

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

  // current hour marker only if viewing today
  let currentHourIndex = null;
  const now = new Date();
  if (torontoDateKey(now) === currentDateKey) {
    currentHourIndex = torontoHour(now);
  }

  // peak bin across total flights
  peakBinGlobal = null;
  bins.forEach(b => {
    if (!peakBinGlobal || b.total > peakBinGlobal.total) {
      peakBinGlobal = b;
    }
  });

    let currentMinutes = null;
    if (torontoDateKey(now) === currentDateKey) {
      const nowLocal = new Date(
        now.toLocaleString('en-CA', { timeZone: 'America/Toronto' })
      );
      currentMinutes = minutesSinceMidnight(nowLocal);
    }

    drawChart(svgDep, svgDepContainer, bins, 'departures', currentMinutes);
    drawChart(svgArr, svgArrContainer, bins, 'arrivals', currentMinutes);

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
    const resp = await fetch('data/flights.json');
    if (!resp.ok) return;
    const json = await resp.json();
    applyNewData(json);
    nextRefreshAt = Date.now() + REFRESH_MS;
  } catch (e) {
    // fallback: do nothing; keep showing current snapshot
    console.warn('Auto-refresh failed:', e);
  }
}, REFRESH_MS);

// Clean up on notebook disposal (if runtime provides a hook)
if (typeof window !== 'undefined') {
  const beforeUnload = () => clearInterval(refreshTimer);
  window.addEventListener('beforeunload', beforeUnload);
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
