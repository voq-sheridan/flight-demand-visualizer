// Data loader: fetches departures and arrivals for Toronto Pearson (YYZ)
// from AviationStack and returns flights scheduled within the next 24 hours.
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

let flights = [];

try {
  const [depData, arrData] = await Promise.all([
    fetchFlights({ dep_iata: "YYZ" }),
    fetchFlights({ arr_iata: "YYZ" }),
  ]);

  const departures = (depData.data || [])
    .filter((f) => withinNext24Hours(f.departure?.scheduled))
    .map((f) => ({
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
    }));

  const arrivals = (arrData.data || [])
    .filter((f) => withinNext24Hours(f.arrival?.scheduled))
    .map((f) => ({
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
    }));

  flights = [...departures, ...arrivals].sort(
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
