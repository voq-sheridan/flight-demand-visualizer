---
title: Toronto Pearson Airport — Flight Activity
---

# ✈ Toronto Pearson International Airport — Flight Activity

Live and upcoming flights for the next 24 hours (departures and arrivals).  
Data sourced from [AviationStack](https://aviationstack.com/).

<style>
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
