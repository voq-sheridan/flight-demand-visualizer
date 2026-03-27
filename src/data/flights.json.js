// Data loader: fetches departures and arrivals for Toronto Pearson (YYZ)
// from AviationStack and returns realtime flights for the next 24 hours,
// plus yesterday's flights when historical access is available.
// Requires the AVIATIONSTACK_API_KEY environment variable to be set.

const ACCESS_KEY = process.env.AVIATIONSTACK_API_KEY;
const BASE_URL = "http://api.aviationstack.com/v1/flights";

if (!ACCESS_KEY) {
  process.stderr.write("Error: AVIATIONSTACK_API_KEY environment variable is not set.\n");
  process.stdout.write(JSON.stringify({ error: "missing_api_key", flights: [], fetchedAt: new Date().toISOString() }));
  process.exit(0);
}

async function fetchFlights(params) {
  const qs = new URLSearchParams({ access_key: ACCESS_KEY, limit: "100", ...params });
  const res = await fetch(`${BASE_URL}?${qs}`);
  if (!res.ok) {
    throw new Error(`AviationStack API responded with HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`AviationStack API error: ${json.error.info || JSON.stringify(json.error)}`);
  }
  return json;
}

async function fetchFlightsOptional(params, tag) {
  try {
    return await fetchFlights(params);
  } catch (err) {
    process.stderr.write(`Warning: optional ${tag} fetch failed: ${err.message}\n`);
    return { data: [] };
  }
}

const now = new Date();
const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

function withinNext24Hours(isoString) {
  if (!isoString) return false;
  const t = new Date(isoString);
  return t >= now && t <= in24h;
}

// Maps AviationStack flight_status + delay value to a display category.
function resolveStatus(flightStatus, delayMinutes) {
  const s = (flightStatus || "").toLowerCase();
  if (s === "active") return "active";
  if (s === "landed") return "landed";
  if (s === "cancelled") return "cancelled";
  if (s === "incident" || s === "diverted") return "delayed";
  if (s === "delayed" || (s === "scheduled" && delayMinutes > 0)) return "delayed";
  return "scheduled";
}

function normalizeDeparture(f) {
  return {
    type: "departure",
    departureIata: f.departure?.iata || "",
    arrivalIata: f.arrival?.iata || "",
    flightNumber: f.flight?.iata || f.flight?.icao || "N/A",
    airline: f.airline?.name || "Unknown Airline",
    otherAirport: f.arrival?.airport || "Unknown",
    otherAirportCode: f.arrival?.iata || "",
    scheduledTime: f.departure?.scheduled,
    delay: f.departure?.delay ?? 0,
    status: f.flight_status,
    resolvedStatus: resolveStatus(f.flight_status, f.departure?.delay),
  };
}

function normalizeArrival(f) {
  return {
    type: "arrival",
    departureIata: f.departure?.iata || "",
    arrivalIata: f.arrival?.iata || "",
    flightNumber: f.flight?.iata || f.flight?.icao || "N/A",
    airline: f.airline?.name || "Unknown Airline",
    otherAirport: f.departure?.airport || "Unknown",
    otherAirportCode: f.departure?.iata || "",
    scheduledTime: f.arrival?.scheduled,
    delay: f.arrival?.delay ?? 0,
    status: f.flight_status,
    resolvedStatus: resolveStatus(f.flight_status, f.arrival?.delay),
  };
}

function dedupeFlights(items) {
  const seen = new Set();
  return items.filter((f) => {
    const key = `${f.type}|${f.flightNumber}|${f.scheduledTime}|${f.otherAirportCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

let flights = [];

try {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const [depData, arrData] = await Promise.all([
    fetchFlights({ dep_iata: "YYZ" }),
    fetchFlights({ arr_iata: "YYZ" }),
  ]);

  const [depHistoricalData, arrHistoricalData] = await Promise.all([
    fetchFlightsOptional(
      { dep_iata: "YYZ", flight_date: yesterdayKey },
      `historical departures (${yesterdayKey})`
    ),
    fetchFlightsOptional(
      { arr_iata: "YYZ", flight_date: yesterdayKey },
      `historical arrivals (${yesterdayKey})`
    ),
  ]);

  const departuresRealtime = (depData.data || [])
    .filter((f) => withinNext24Hours(f.departure?.scheduled))
    .map(normalizeDeparture);

  const arrivalsRealtime = (arrData.data || [])
    .filter((f) => withinNext24Hours(f.arrival?.scheduled))
    .map(normalizeArrival);

  const departuresHistorical = (depHistoricalData.data || [])
    .filter((f) => !!f.departure?.scheduled)
    .map(normalizeDeparture);

  const arrivalsHistorical = (arrHistoricalData.data || [])
    .filter((f) => !!f.arrival?.scheduled)
    .map(normalizeArrival);

  flights = dedupeFlights([
    ...departuresRealtime,
    ...arrivalsRealtime,
    ...departuresHistorical,
    ...arrivalsHistorical,
  ]).sort(
    (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
  );
} catch (err) {
  process.stderr.write(`Error fetching flights: ${err.message}\n`);
  process.stdout.write(
    JSON.stringify({ error: err.message, flights: [], fetchedAt: new Date().toISOString() })
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({ flights, fetchedAt: new Date().toISOString() })
);
