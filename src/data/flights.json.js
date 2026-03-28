const OPEN_SKY_BASE = "https://opensky-network.org/api";

function deriveAirlineName(callsign) {
  const prefix = callsign.replace(/[0-9]/g, '').trim().toUpperCase();
  const airlines = {
    'ACA': 'Air Canada',
    'WJA': 'WestJet',
    'UAL': 'United Airlines',
    'AAL': 'American Airlines',
    'DAL': 'Delta Air Lines',
    'BAW': 'British Airways',
    'DLH': 'Lufthansa',
    'AFR': 'Air France',
    'KLM': 'KLM',
    'UAE': 'Emirates',
    'ETD': 'Etihad Airways',
    'TSC': 'Air Transat',
    'POE': 'Porter Airlines',
    'ROU': 'Air Canada Rouge',
    'JZA': 'Jazz Aviation',
    'FLE': 'Flair Airlines',
    'CPA': 'Cathay Pacific',
    'EVA': 'EVA Air',
    'RPA': 'Republic Airways',
    'ENY': 'Envoy Air',
    'EDV': 'Endeavor Air',
    'GTR': 'Global Air Charter',
    'SYB': 'Sunwing Airlines',
    'ASP': 'Aerospatiale',
    'DWI': 'Dynamic Airways',
    'LXJ': 'Flexjet',
    'HRT': 'Harbour Air'
  };
  for (const [key, value] of Object.entries(airlines)) {
    if (prefix.startsWith(key)) return value;
  }
  return callsign.trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIso(ts) {
  if (!Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

async function fetchEndpoint(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      process.stderr.write(`OpenSky ${label} request failed with HTTP ${res.status}\n`);
      return [];
    }
    const json = await res.json();
    return safeArray(json);
  } catch (err) {
    process.stderr.write(`OpenSky ${label} request error: ${err.message}\n`);
    return [];
  }
}

function mapDeparture(raw) {
  const callsign = (raw?.callsign || '').trim();
  const firstSeenIso = toIso(raw?.firstSeen);
  const lastSeenIso = toIso(raw?.lastSeen);
  if (!callsign || !firstSeenIso) return null;

  return {
    dedupeKey: `${raw?.icao24 || 'unknown'}|${raw?.firstSeen || 'unknown'}`,
    flight: {
      type: 'departure',
      flightNumber: callsign,
      airline: deriveAirlineName(callsign),
      otherAirport: raw?.estArrivalAirport || 'Unknown',
      otherAirportCode: raw?.estArrivalAirport || 'N/A',
      scheduledTime: firstSeenIso,
      lastSeen: lastSeenIso,
      icao24: raw?.icao24 || '',
      delay: 0,
      status: 'active',
      resolvedStatus: 'active'
    }
  };
}

function mapArrival(raw) {
  const callsign = (raw?.callsign || '').trim();
  const firstSeenIso = toIso(raw?.firstSeen);
  const lastSeenIso = toIso(raw?.lastSeen);
  if (!callsign || !lastSeenIso) return null;

  return {
    dedupeKey: `${raw?.icao24 || 'unknown'}|${raw?.firstSeen || 'unknown'}`,
    flight: {
      type: 'arrival',
      flightNumber: callsign,
      airline: deriveAirlineName(callsign),
      otherAirport: raw?.estDepartureAirport || 'Unknown',
      otherAirportCode: raw?.estDepartureAirport || 'N/A',
      scheduledTime: lastSeenIso,
      firstSeen: firstSeenIso,
      icao24: raw?.icao24 || '',
      delay: 0,
      status: 'active',
      resolvedStatus: 'active'
    }
  };
}

const unixNow = Math.floor(Date.now() / 1000);
const unix24hAgo = unixNow - 86400;

const departuresUrl = `${OPEN_SKY_BASE}/flights/departure?airport=CYYZ&begin=${unix24hAgo}&end=${unixNow}`;
const arrivalsUrl = `${OPEN_SKY_BASE}/flights/arrival?airport=CYYZ&begin=${unix24hAgo}&end=${unixNow}`;

const [departuresRaw, arrivalsRaw] = await Promise.all([
  fetchEndpoint(departuresUrl, 'departures'),
  fetchEndpoint(arrivalsUrl, 'arrivals')
]);

const mappedDepartures = safeArray(departuresRaw)
  .map(mapDeparture)
  .filter(Boolean);

const mappedArrivals = safeArray(arrivalsRaw)
  .map(mapArrival)
  .filter(Boolean);

const dedupe = new Map();
for (const item of [...mappedDepartures, ...mappedArrivals]) {
  if (!dedupe.has(item.dedupeKey)) {
    dedupe.set(item.dedupeKey, item.flight);
  }
}

const flights = Array.from(dedupe.values()).sort(
  (a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)
);

const totalDepartures = flights.filter((f) => f.type === 'departure').length;
const totalArrivals = flights.filter((f) => f.type === 'arrival').length;

process.stdout.write(
  JSON.stringify({
    flights,
    fetchedAt: new Date().toISOString(),
    totalDepartures,
    totalArrivals
  })
);
