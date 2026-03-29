const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const AERODATABOX_BASE = `https://${AERODATABOX_HOST}`;
const AERODATABOX_API_KEY = process.env.AERODATABOX_API_KEY || "";

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function mapStatus(status) {
  if (!status) return "scheduled";
  const s = String(status).toLowerCase();
  if (s.includes("departed") || s.includes("arrived") || s.includes("landed")) return "landed";
  if (s.includes("active") || s.includes("en route") || s.includes("airborne")) return "active";
  if (s.includes("delay") || s.includes("late")) return "delayed";
  if (s.includes("cancel")) return "cancelled";
  return "scheduled";
}

function toScheduledIso(value) {
  if (!value) return null;
  const normalized = String(value).replace(" ", "T");
  const dt = new Date(normalized);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt.toISOString();
}

function buildHeaders() {
  return {
    "x-rapidapi-host": AERODATABOX_HOST,
    "x-rapidapi-key": AERODATABOX_API_KEY
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return n * 1000;
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return null;
  return Math.max(0, dt.getTime() - Date.now());
}

async function fetchJsonWithRetry(url, headers, maxAttempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        return await res.json();
      }

      const status = res.status;
      const retryable = status === 429 || status >= 500;
      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));

      if (!retryable || attempt === maxAttempts) {
        const error = new Error(`HTTP ${status}`);
        error.status = status;
        throw error;
      }

      const backoffMs = retryAfterMs ?? Math.min(8000, 700 * 2 ** (attempt - 1));
      const jitterMs = Math.floor(Math.random() * 220);
      await sleep(backoffMs + jitterMs);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const jitterMs = Math.floor(Math.random() * 220);
      await sleep(Math.min(8000, 700 * 2 ** (attempt - 1)) + jitterMs);
    }
  }

  throw lastError || new Error("Request failed");
}

const DAY_WINDOWS = [
  { from: "00:00", to: "11:59" },
  { from: "12:00", to: "23:59" }
];

function buildDateTimeCandidates(dateText, fromHHMM, toHHMM) {
  return [
    { from: `${dateText}T${fromHHMM}`, to: `${dateText}T${toHHMM}` },
    { from: `${dateText}T${fromHHMM}:00`, to: `${dateText}T${toHHMM}:59` },
    { from: `${dateText}T${fromHHMM}:00Z`, to: `${dateText}T${toHHMM}:59Z` }
  ];
}

function isFutureDate(targetDate) {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

async function fetchFlightsForDate(targetDate) {
  const dateText = formatDate(targetDate);
  const headers = buildHeaders();
  const departures = [];
  const arrivals = [];
  const windowErrors = [];

  for (const window of DAY_WINDOWS) {
    const candidates = buildDateTimeCandidates(dateText, window.from, window.to);
    let windowJson = null;
    let lastWindowError = null;

    for (const candidate of candidates) {
      const url = `${AERODATABOX_BASE}/flights/airports/iata/YYZ/${candidate.from}/${candidate.to}`;
      try {
        windowJson = await fetchJsonWithRetry(url, headers, 3);
        break;
      } catch (err) {
        lastWindowError = err;
      }
    }

    if (!windowJson) {
      windowErrors.push(lastWindowError || new Error("No valid response"));
      continue;
    }

    departures.push(...(Array.isArray(windowJson?.departures) ? windowJson.departures : []));
    arrivals.push(...(Array.isArray(windowJson?.arrivals) ? windowJson.arrivals : []));
    await sleep(350);
  }

  try {
    if (windowErrors.length === DAY_WINDOWS.length) {
      throw windowErrors[0];
    }

    const mappedDepartures = departures
      .map((flight) => ({
        type: "departure",
        flightNumber: flight?.number || "N/A",
        airline: flight?.airline?.name || flight?.number || "Unknown",
        otherAirport: flight?.movement?.airport?.name || "Unknown",
        otherAirportCode: flight?.movement?.airport?.iata || "N/A",
        departureIata: "YYZ",
        arrivalIata: flight?.movement?.airport?.iata || "",
        scheduledTime: toScheduledIso(flight?.movement?.scheduledTime?.utc) || toScheduledIso(flight?.movement?.scheduledTime?.local),
        status: mapStatus(flight?.status),
        resolvedStatus: mapStatus(flight?.status),
        date: dateText
      }))
      .filter((f) => f.scheduledTime);

    const mappedArrivals = arrivals
      .map((flight) => ({
        type: "arrival",
        flightNumber: flight?.number || "N/A",
        airline: flight?.airline?.name || flight?.number || "Unknown",
        otherAirport: flight?.movement?.airport?.name || "Unknown",
        otherAirportCode: flight?.movement?.airport?.iata || "N/A",
        departureIata: flight?.movement?.airport?.iata || "",
        arrivalIata: "YYZ",
        scheduledTime: toScheduledIso(flight?.movement?.scheduledTime?.utc) || toScheduledIso(flight?.movement?.scheduledTime?.local),
        status: mapStatus(flight?.status),
        resolvedStatus: mapStatus(flight?.status),
        date: dateText
      }))
      .filter((f) => f.scheduledTime);

    return { flights: [...mappedDepartures, ...mappedArrivals], error: null };
  } catch (err) {
    if (err?.status === 400 && isFutureDate(targetDate)) {
      const msg = `No schedule returned for ${dateText} (future day may not be available on current API plan)`;
      process.stderr.write(`AeroDataBox request skipped for ${dateText}: ${msg}\n`);
      return { flights: [], error: msg };
    }
    process.stderr.write(`AeroDataBox request failed for ${dateText}: ${err.message}\n`);
    return { flights: [], error: `Failed for ${dateText}: ${err.message}` };
  }
}

const dates = {
  yesterday: formatDate(yesterday),
  today: formatDate(now),
  tomorrow: formatDate(tomorrow)
};

if (!AERODATABOX_API_KEY) {
  process.stderr.write("AERODATABOX_API_KEY is not set. Returning empty flights.\n");
  process.stdout.write(
    JSON.stringify({
      flights: [],
      fetchedAt: new Date().toISOString(),
      dates,
      error: "AERODATABOX_API_KEY is not set"
    })
  );
} else {
  const targets = [yesterday, now, tomorrow];
  const results = [];

  for (const [idx, target] of targets.entries()) {
    const result = await fetchFlightsForDate(target);
    results.push(result);
    if (idx < targets.length - 1) {
      await sleep(1200);
    }
  }

  const warnings = results.map((r) => r.error).filter(Boolean);

  const flights = results
    .flatMap((r) => r.flights)
    .sort(
    (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
  );

  process.stdout.write(
    JSON.stringify({
      flights,
      fetchedAt: new Date().toISOString(),
      dates,
      warnings
    })
  );
}
