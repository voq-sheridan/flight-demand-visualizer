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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIso(ts) {
  if (!Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

function inferTypeFromState(state) {
  const onGround = Boolean(state?.[8]);
  if (onGround) return null;

  const verticalRate = state?.[11];
  if (Number.isFinite(verticalRate)) {
    if (verticalRate < -0.5) return 'arrival';
    if (verticalRate > 0.5) return 'departure';
  }

  const trueTrack = state?.[10];
  if (Number.isFinite(trueTrack)) {
    return trueTrack >= 180 ? 'arrival' : 'departure';
  }

  return 'departure';
}

async function fetchStatesFallback(unixNow) {
  const bbox = new URLSearchParams({
    lamin: '43.4',
    lomin: '-79.9',
    lamax: '44.1',
    lomax: '-78.9'
  });

  const url = `${OPEN_SKY_BASE}/states/all?${bbox}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      process.stderr.write(`OpenSky states fallback failed with HTTP ${res.status}\n`);
      return [];
    }
    const json = await res.json();
  const snapshotTs = Number(json?.time) || unixNow;
    const states = safeArray(json?.states);

    return states
      .map((s) => {
        const type = inferTypeFromState(s);
        if (!type) return null;

        const callsign = String(s?.[1] || '').trim();
        const icao24 = String(s?.[0] || '').trim();
        const projectedTs = type === 'departure'
          ? snapshotTs + 45 * 60
          : snapshotTs + 30 * 60;
        const scheduledTime = toIso(projectedTs);
        if (!scheduledTime) return null;

        const flightNumber = callsign || icao24.toUpperCase() || 'N/A';
        return {
          dedupeKey: `${icao24 || 'unknown'}|${projectedTs || 'unknown'}`,
          flight: {
            type,
            flightNumber,
            airline: deriveAirlineName(flightNumber),
            otherAirport: 'Unknown',
            otherAirportCode: 'N/A',
            scheduledTime,
            icao24,
            delay: 0,
            status: 'active',
            resolvedStatus: 'active'
          }
        };
      })
      .filter(Boolean);
  } catch (err) {
    process.stderr.write(`OpenSky states fallback error: ${err.message}\n`);
    return [];
  }
}

async function fetchEndpoint(url, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if ((res.status === 429 || res.status === 503) && attempt < 2) {
          await sleep((attempt + 1) * 1200);
          continue;
        }
        process.stderr.write(`OpenSky ${label} request failed with HTTP ${res.status}\n`);
        return [];
      }
      const json = await res.json();
      return safeArray(json);
    } catch (err) {
      if (attempt < 2) {
        await sleep((attempt + 1) * 1200);
        continue;
      }
      process.stderr.write(`OpenSky ${label} request error: ${err.message}\n`);
      return [];
    }
  }

  return [];
}

async function fetchAirportFlightsWithWindowFallback(endpoint, label, unixNow) {
  const endpointName = endpoint === 'departure' ? 'departures' : 'arrivals';
  const horizonsSec = [24, 48, 72].map((h) => h * 3600);
  const candidates = horizonsSec.flatMap((horizon) => {
    const end = unixNow + horizon;
    return [
      `${OPEN_SKY_BASE}/${endpointName}/airport?airport=CYYZ&begin=${unixNow}&end=${end}`,
      `${OPEN_SKY_BASE}/flights/${endpoint}?airport=CYYZ&begin=${unixNow}&end=${end}`
    ];
  });

  const merged = [];
  const seenRaw = new Set();

  for (let i = 0; i < candidates.length; i++) {
    const rows = await fetchEndpoint(candidates[i], `${label} (candidate ${i + 1})`);
    for (const row of rows) {
      const rawKey = `${row?.icao24 || 'unknown'}|${row?.firstSeen || 'na'}|${row?.lastSeen || 'na'}|${(row?.callsign || '').trim()}`;
      if (seenRaw.has(rawKey)) continue;
      seenRaw.add(rawKey);
      merged.push(row);
    }
  }

  return merged;
}

function keepFutureFlights(flights, unixNow) {
  const nowMs = unixNow * 1000;
  return flights.filter((f) => {
    const ts = Date.parse(f.scheduledTime);
    return Number.isFinite(ts) && ts >= nowMs;
  });
}

function mapDeparture(raw) {
  const callsign = (raw?.callsign || '').trim();
  const baseTs = Number.isFinite(raw?.firstSeen) ? raw.firstSeen : raw?.lastSeen;
  const firstSeenIso = toIso(baseTs);
  const lastSeenIso = toIso(raw?.lastSeen);
  if (!callsign || !firstSeenIso) return null;

  return {
    dedupeKey: `${raw?.icao24 || 'unknown'}|${baseTs || 'unknown'}`,
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
  const baseTs = Number.isFinite(raw?.lastSeen) ? raw.lastSeen : raw?.firstSeen;
  const lastSeenIso = toIso(baseTs);
  if (!callsign || !lastSeenIso) return null;

  return {
    dedupeKey: `${raw?.icao24 || 'unknown'}|${raw?.firstSeen || baseTs || 'unknown'}`,
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

const [departuresRaw, arrivalsRaw] = await Promise.all([
  fetchAirportFlightsWithWindowFallback('departure', 'departures', unixNow),
  fetchAirportFlightsWithWindowFallback('arrival', 'arrivals', unixNow)
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

const fallbackFlights = await fetchStatesFallback(unixNow);
for (const item of fallbackFlights) {
  if (!dedupe.has(item.dedupeKey)) {
    dedupe.set(item.dedupeKey, item.flight);
  }
}

const flights = keepFutureFlights(Array.from(dedupe.values()), unixNow).sort(
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
