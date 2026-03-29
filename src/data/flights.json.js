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
        throw new Error(`HTTP ${status}`);
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

function buildDateTimeCandidates(dateText) {
  return [
    { from: `${dateText}T00:00`, to: `${dateText}T23:59` },
    { from: `${dateText}T00:00:00`, to: `${dateText}T23:59:59` },
    { from: `${dateText}T00:00Z`, to: `${dateText}T23:59Z` }
  ];
}

async function fetchFlightsForDate(targetDate) {
  const dateText = formatDate(targetDate);
  const headers = buildHeaders();
  const candidates = buildDateTimeCandidates(dateText);

  let json = null;
  let lastError = null;

  for (const candidate of candidates) {
    const url = `${AERODATABOX_BASE}/flights/airports/iata/YYZ/${candidate.from}/${candidate.to}`;
    try {
      json = await fetchJsonWithRetry(url, headers, 3);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  try {
    if (!json) {
      throw lastError || new Error("No valid response");
    }
    const departures = Array.isArray(json?.departures) ? json.departures : [];
    const arrivals = Array.isArray(json?.arrivals) ? json.arrivals : [];

    const mappedDepartures = departures
      .map((flight) => ({
        type: "departure",
        flightNumber: flight?.number || "N/A",
        airline: flight?.airline?.name || flight?.number || "Unknown",
        otherAirport: flight?.arrival?.airport?.name || "Unknown",
        otherAirportCode: flight?.arrival?.airport?.iata || "N/A",
        departureIata: "YYZ",
        arrivalIata: flight?.arrival?.airport?.iata || "",
        scheduledTime: toScheduledIso(flight?.departure?.scheduledTime?.utc) || toScheduledIso(flight?.departure?.scheduledTime?.local),
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
        otherAirport: flight?.departure?.airport?.name || "Unknown",
        otherAirportCode: flight?.departure?.airport?.iata || "N/A",
        departureIata: flight?.departure?.airport?.iata || "",
        arrivalIata: "YYZ",
        scheduledTime: toScheduledIso(flight?.arrival?.scheduledTime?.utc) || toScheduledIso(flight?.arrival?.scheduledTime?.local),
        status: mapStatus(flight?.status),
        resolvedStatus: mapStatus(flight?.status),
        date: dateText
      }))
      .filter((f) => f.scheduledTime);

    return { flights: [...mappedDepartures, ...mappedArrivals], error: null };
  } catch (err) {
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
  const [yesterdayResult, todayResult, tomorrowResult] = await Promise.all([
    fetchFlightsForDate(yesterday),
    fetchFlightsForDate(now),
    fetchFlightsForDate(tomorrow)
  ]);

  const results = [yesterdayResult, todayResult, tomorrowResult];
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
