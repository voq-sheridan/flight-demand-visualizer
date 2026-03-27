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
    flex: 1 1 320px;
  }
  .metric-card {
    background: #ffffff;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 140px;
  }
  .metric-num {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }
  .metric-label {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .chart-card {
    background: #ffffff;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    flex: 2 1 640px;
    min-width: 360px;
  }
  .chart-title {
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #111827;
  }
  .chart-sub {
    font-size: 0.82rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }
  .flight-board {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    margin-top: 1rem;
  }
  .flight-board thead tr {
    background: #1a1a2e;
    color: #e0e0e0;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }
  .flight-board th,
  .flight-board td {
    padding: 0.55rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid #e8e8e8;
    white-space: nowrap;
  }
  .flight-board tbody tr:hover {
    filter: brightness(0.95);
  }

  /* Status colour bands */
  .status-active   { background: #e6f9ee; color: #1a7a40; }
  .status-delayed  { background: #fff4e0; color: #b35a00; }
  .status-landed   { background: #f2f2f2; color: #6b6b6b; }
  .status-cancelled { background: #f2f2f2; color: #6b6b6b; }
  .status-scheduled { background: #ffffff; color: #222222; }

  .badge {
    display: inline-block;
    padding: 0.15em 0.55em;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .badge-dep { background: #dbeafe; color: #1d4ed8; }
  .badge-arr { background: #fce7f3; color: #9d174d; }

  .status-pill {
    display: inline-block;
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
const d3 = await import("https://cdn.jsdelivr.net/npm/d3@7?module");

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
    active: createMetricCard('Active', '—'),
    delayed: createMetricCard('Delayed', '—'),
    scheduled: createMetricCard('Scheduled', '—')
  };

  Object.values(metrics).forEach(c => summaryPanel.appendChild(c.card));

  // Chart title & subtitle
  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = 'Flight volume by hour — next 24 hours';
  const sub = document.createElement('div');
  sub.className = 'chart-sub';
  sub.textContent = 'Grouped by departures and arrivals. Bars colored by overall busyness (low, moderate, high).';

  // SVG container
  const svgContainer = document.createElement('div');
  svgContainer.style.width = '100%';
  svgContainer.style.overflow = 'hidden';
  const svg = d3.select(svgContainer).append('svg');

  // Busyness legend
  const busLegend = document.createElement('div');
  busLegend.className = 'busyness-legend';
  busLegend.innerHTML = `<span class="busyness-swatch bus-low"></span><span style="color:#374151">Low</span>
                         <span class="busyness-swatch bus-med"></span><span style="color:#374151">Moderate</span>
                         <span class="busyness-swatch bus-high"></span><span style="color:#374151">High</span>`;

  chartCard.appendChild(title);
  chartCard.appendChild(sub);
  chartCard.appendChild(svgContainer);
  chartCard.appendChild(busLegend);

  wrapper.appendChild(summaryPanel);
  wrapper.appendChild(chartCard);

  return {wrapper, metrics, svg, svgContainer};
}

function createMetricCard(label, num) {
  const card = document.createElement('div');
  card.className = 'metric-card';
  const n = document.createElement('div'); n.className = 'metric-num'; n.textContent = num;
  const l = document.createElement('div'); l.className = 'metric-label'; l.textContent = label;
  card.appendChild(n); card.appendChild(l);
  return {card, set: (v) => n.textContent = v};
}

function computeHourlyBins(flights) {
  const now = new Date();
  // start from current hour (rounded down)
  const start = new Date(now);
  start.setMinutes(0,0,0);
  const bins = [];
  for (let i=0;i<24;i++) {
    const s = new Date(start.getTime() + i*60*60*1000);
    const label = s.toLocaleTimeString('en-CA', {timeZone: 'America/Toronto', hour: '2-digit', hour12: false});
    bins.push({index:i, start:s, label, departures:0, arrivals:0, total:0});
  }

  flights.forEach(f => {
    const when = toLocalDate(f.scheduledTime);
    if (!when) return;
    const diff = Math.floor((when - start)/ (60*60*1000));
    if (diff >=0 && diff < 24) {
      const bin = bins[diff];
      if (f.type === 'departure') bin.departures++;
      else bin.arrivals++;
      bin.total = bin.departures + bin.arrivals;
    }
  });
  return bins;
}

function colorByBusyness(total, tertiles) {
  if (total <= tertiles[0]) return '#bbf7d0'; // low
  if (total <= tertiles[1]) return '#fde68a'; // med
  return '#fecaca'; // high
}

function drawChart(svg, svgContainer, bins) {
  const margin = {top: 18, right: 12, bottom: 34, left: 36};
  const width = svgContainer.clientWidth || 800;
  const height = 260;
  svg.attr('width', width).attr('height', height);
  svg.selectAll('*').remove();
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const x0 = d3.scaleBand().domain(bins.map(d=>d.label)).range([0,w]).paddingInner(0.15);
  const x1 = d3.scaleBand().domain(['departures','arrivals']).range([0,x0.bandwidth()]).padding(0.05);
  const y = d3.scaleLinear().domain([0, d3.max(bins, d=>Math.max(d.departures,d.arrivals)) || 1]).nice().range([h,0]);

  // compute tertiles for busyness across totals
  const totals = bins.map(d=>d.total).sort((a,b)=>a-b);
  const t1 = totals[Math.floor(totals.length/3)] ?? 0;
  const t2 = totals[Math.floor((totals.length*2)/3)] ?? 0;

  const groups = g.selectAll('.hour').data(bins).join('g').attr('class','hour').attr('transform', d=>`translate(${x0(d.label)},0)`);

  groups.selectAll('rect').data(d => [
    {key:'departures', value:d.departures, total:d.total},
    {key:'arrivals', value:d.arrivals, total:d.total}
  ]).join('rect')
    .attr('x', (d)=> x1(d.key))
    .attr('y', d=> y(d.value))
    .attr('width', x1.bandwidth())
    .attr('height', d=> Math.max(0, h - y(d.value)))
    .attr('fill', d => colorByBusyness(d.total, [t1,t2]))
    .attr('stroke', '#00000000');

  // axes
  const xAxis = d3.axisBottom(x0).tickValues(bins.filter((_,i)=> i%3===0).map(d=>d.label));
  const yAxis = d3.axisLeft(y).ticks(4).tickFormat(d3.format('d'));
  g.append('g').attr('transform', `translate(0,${h})`).call(xAxis).selectAll('text').style('font-size','11px');
  g.append('g').call(yAxis).selectAll('text').style('font-size','11px');

  // little color markers for dep/arr
  const legend = svg.append('g').attr('transform', `translate(${width - 160},8)`);
  legend.append('rect').attr('width',12).attr('height',12).attr('fill','#dbeafe');
  legend.append('text').attr('x',16).attr('y',10).text('Departures').style('font-size','11px');
  legend.append('rect').attr('x',0).attr('y',16).attr('width',12).attr('height',12).attr('fill','#fce7f3');
  legend.append('text').attr('x',16).attr('y',26).text('Arrivals').style('font-size','11px');
}

// Build UI and attach
const {wrapper, metrics, svg, svgContainer} = buildUI();
display(wrapper);

// status & table area will follow below; render chart and metrics now
async function renderFromSource(srcData) {
  const flights = srcData.flights ?? [];
  // metrics
  const totalActive = flights.filter(f=> f.resolvedStatus === 'active').length;
  const totalDelayed = flights.filter(f=> f.resolvedStatus === 'delayed').length;
  const totalScheduled = flights.filter(f=> f.resolvedStatus === 'scheduled').length;
  metrics.active.set(totalActive);
  metrics.delayed.set(totalDelayed);
  metrics.scheduled.set(totalScheduled);

  // bins and chart
  const bins = computeHourlyBins(flights);
  drawChart(svg, svgContainer, bins);

  // show/update a small last-updated row beneath the chart card
  if (srcData.fetchedAt) {
    let metaRow = document.getElementById('visual-meta-row');
    if (!metaRow) {
      metaRow = document.createElement('div');
      metaRow.id = 'visual-meta-row';
      metaRow.className = 'meta';
      wrapper.appendChild(metaRow);
    }
    metaRow.textContent = `Last updated: ${new Date(srcData.fetchedAt).toLocaleString('en-CA', {timeZone:'America/Toronto', dateStyle:'medium', timeStyle:'short'})} ET`;
  }
}

// initial render
try {
  await renderFromSource(data);
} catch (e) {
  console.warn('Could not render chart initially', e);
}

// Auto-refresh every 10 minutes: attempt to fetch the JSON file and re-render if successful.
const REFRESH_MS = 10 * 60 * 1000;
const refreshTimer = setInterval(async ()=>{
  try {
    const resp = await fetch('data/flights.json');
    if (!resp.ok) return;
    const json = await resp.json();
    await renderFromSource(json);
  } catch (e) {
    // fallback: do nothing; keep showing current snapshot
    console.warn('Auto-refresh failed:', e);
  }
}, REFRESH_MS);

// Clean up on notebook disposal (if runtime provides a hook)
if (typeof window !== 'undefined') {
  const beforeUnload = ()=> clearInterval(refreshTimer);
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
