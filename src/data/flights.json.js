// Data loader: fetches departures and arrivals for Toronto Pearson (CYYZ)
// from OpenSky Network for the next 24 hours and outputs the same schema
// used by the dashboard visualizations.

const OPEN_SKY_BASE = "https://opensky-network.org/api";
const AIRLINE_BY_PREFIX = {
  ACA: "Air Canada",
  WJA: "WestJet",
  UAL: "United Airlines",
  AAL: "American Airlines",
  DAL: "Delta Air Lines",
  BAW: "British Airways",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM",
  UAE: "Emirates",
  ETH: "Ethiopian Airlines",
  TSC: "Air Transat",
  POE: "Porter Airlines"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function deriveAirlineName(callsign) {
  const normalized = (callsign || "").trim().toUpperCase();
  const prefix = normalized.match(/^[A-Z]{3}/)?.[0] || "";
  return AIRLINE_BY_PREFIX[prefix] || (callsign || "Unknown Airline").trim() || "Unknown Airline";
}

async function fetchOpenSkyArray(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url);

    if ((res.status === 404 || res.status === 503) && attempt === 0) {
      await sleep(2000);
      continue;
    }

    if (!res.ok) {
      throw new Error(`OpenSky API responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    return safeArray(json);
  }

  return [];
}

function toIsoFromUnixSeconds(ts) {
  if (!Number.isFinite(ts)) return null;
  const iso = new Date(ts * 1000).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function normalizeOpenSkyFlight(raw, type) {
  const callsign = (raw?.callsign || "").trim();
  const flightNumber = callsign || (raw?.icao24 || "N/A").toUpperCase();
  const scheduledTime = toIsoFromUnixSeconds(raw?.firstSeen);
  if (!scheduledTime) return null;

  const otherAirportCode = type === "departure"
    ? (raw?.estArrivalAirport || "")
    : (raw?.estDepartureAirport || "");

  return {
    type,
    departureIata: type === "departure" ? "YYZ" : "",
    arrivalIata: type === "arrival" ? "YYZ" : "",
    flightNumber,
    airline: deriveAirlineName(callsign || flightNumber),
    otherAirport: otherAirportCode || "Unknown",
    otherAirportCode: otherAirportCode || "",
    scheduledTime,
    delay: 0,
    status: "active",
    resolvedStatus: "active"
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
  const unixStart = Math.floor(Date.now() / 1000);
  const unixEnd = unixStart + 86400;

  const departuresUrl = `${OPEN_SKY_BASE}/departures/airport?airport=CYYZ&begin=${unixStart}&end=${unixEnd}`;
  const arrivalsUrl = `${OPEN_SKY_BASE}/arrivals/airport?airport=CYYZ&begin=${unixStart}&end=${unixEnd}`;

  const [departuresRaw, arrivalsRaw] = await Promise.all([
    fetchOpenSkyArray(departuresUrl),
    fetchOpenSkyArray(arrivalsUrl)
  ]);

  const departures = safeArray(departuresRaw)
    .map((f) => normalizeOpenSkyFlight(f, "departure"))
    .filter(Boolean);

  const arrivals = safeArray(arrivalsRaw)
    .map((f) => normalizeOpenSkyFlight(f, "arrival"))
    .filter(Boolean);

  flights = dedupeFlights([...departures, ...arrivals]).sort(
    (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
  );
} catch (err) {
  process.stderr.write(`Error fetching flights: ${err.message}\n`);
  process.stdout.write(
    JSON.stringify({ error: err.message, flights: [], fetchedAt: new Date().toISOString() })
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ flights, fetchedAt: new Date().toISOString() }));
