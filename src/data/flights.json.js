// Data loader: fetches departures and arrivals for Toronto Pearson (CYYZ)
// from OpenSky Network for the next 24 hours and outputs the same schema
// used by the dashboard visualizations.

const OPEN_SKY_BASE = "https://opensky-network.org/api";
const YYZ_BBOX = {
  lamin: 43.4,
  lomin: -79.9,
  lamax: 44.1,
  lomax: -78.9
};
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

function buildWindowCandidates() {
  const now = Math.floor(Date.now() / 1000);
  return [
    // Requested forward window (now -> +24h)
    { begin: now, end: now + 86400, label: "forward-24h" },
    // Fallback for endpoints that only expose recent historical windows
    { begin: now - 86400, end: now, label: "recent-24h" }
  ];
}

function buildEndpointCandidates(type, begin, end) {
  if (type === "departure") {
    return [
      `${OPEN_SKY_BASE}/departures/airport?airport=CYYZ&begin=${begin}&end=${end}`,
      `${OPEN_SKY_BASE}/flights/departure?airport=CYYZ&begin=${begin}&end=${end}`
    ];
  }

  return [
    `${OPEN_SKY_BASE}/arrivals/airport?airport=CYYZ&begin=${begin}&end=${end}`,
    `${OPEN_SKY_BASE}/flights/arrival?airport=CYYZ&begin=${begin}&end=${end}`
  ];
}

async function fetchWithFallback(type) {
  const windows = buildWindowCandidates();
  let lastError = null;

  for (const window of windows) {
    const urls = buildEndpointCandidates(type, window.begin, window.end);
    for (const url of urls) {
      try {
        const rows = await fetchOpenSkyArray(url);
        if (rows.length > 0) {
          return rows;
        }
      } catch (err) {
        lastError = err;
        process.stderr.write(`Warning: ${type} fetch failed (${window.label}): ${err.message}\n`);
      }
    }
  }

  if (lastError) {
    process.stderr.write(`Warning: falling back to empty ${type} data after retries/fallbacks.\n`);
  }
  return [];
}

function inferTypeFromStateVector(state) {
  const onGround = Boolean(state?.[8]);
  if (onGround) return null;

  const verticalRate = state?.[11];
  if (Number.isFinite(verticalRate)) {
    if (verticalRate < -0.5) return "arrival";
    if (verticalRate > 0.5) return "departure";
  }

  const trueTrack = state?.[10];
  if (Number.isFinite(trueTrack)) {
    return trueTrack >= 180 ? "arrival" : "departure";
  }

  return "departure";
}

function normalizeStateVectorFlight(state, snapshotUnix) {
  const icao24 = String(state?.[0] || "").trim();
  const callsign = String(state?.[1] || "").trim();
  const type = inferTypeFromStateVector(state);
  if (!type) return null;

  const observedUnix = state?.[3] || state?.[4] || snapshotUnix;
  const scheduledTime = toIsoFromUnixSeconds(observedUnix);
  if (!scheduledTime) return null;

  const flightNumber = callsign || icao24.toUpperCase() || "N/A";

  return {
    type,
    departureIata: type === "departure" ? "YYZ" : "",
    arrivalIata: type === "arrival" ? "YYZ" : "",
    flightNumber,
    airline: deriveAirlineName(callsign || flightNumber),
    otherAirport: "Unknown",
    otherAirportCode: "",
    scheduledTime,
    delay: 0,
    status: "active",
    resolvedStatus: "active"
  };
}

async function fetchNearbyStatesFlights() {
  const params = new URLSearchParams({
    lamin: String(YYZ_BBOX.lamin),
    lomin: String(YYZ_BBOX.lomin),
    lamax: String(YYZ_BBOX.lamax),
    lomax: String(YYZ_BBOX.lomax)
  });

  const url = `${OPEN_SKY_BASE}/states/all?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    process.stderr.write(`Warning: states fallback failed with HTTP ${res.status}.\n`);
    return [];
  }

  const json = await res.json();
  const snapshotUnix = Number(json?.time) || Math.floor(Date.now() / 1000);
  const states = safeArray(json?.states);

  return states
    .map((state) => normalizeStateVectorFlight(state, snapshotUnix))
    .filter(Boolean);
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
  const [departuresRaw, arrivalsRaw] = await Promise.all([
    fetchWithFallback("departure"),
    fetchWithFallback("arrival")
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

  if (flights.length === 0) {
    const statesFallbackFlights = await fetchNearbyStatesFlights();
    flights = dedupeFlights(statesFallbackFlights).sort(
      (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
  }
} catch (err) {
  process.stderr.write(`Error fetching flights: ${err.message}\n`);
  process.stdout.write(
    JSON.stringify({ flights: [], fetchedAt: new Date().toISOString() })
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ flights, fetchedAt: new Date().toISOString() }));
