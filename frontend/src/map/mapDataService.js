/**
 * mapDataService.js
 * 
 * Reusable data transformation & API service for Supplychainer Map Routing.
 * Isolated module: handles API fetching, hub coordinate indexing, corridor extraction,
 * and safe translation of route recommendation legs into geospatial coordinates.
 */

export const MODE_COLORS = {
  AIR: '#38bdf8',      // Sky Cyan
  SEA: '#3b82f6',      // Cobalt Blue
  RAIL: '#f59e0b',     // Amber
  ROAD: '#10b981',     // Emerald
  TRANSFER: '#a855f7', // Purple
  DEFAULT: '#94a3b8'   // Slate
};

export const HUB_TYPE_META = {
  airport: {
    label: 'Airport',
    color: '#38bdf8',
    symbol: '✈',
    badgeClass: 'hub-badge-airport'
  },
  port: {
    label: 'Seaport',
    color: '#0284c7',
    symbol: '⚓',
    badgeClass: 'hub-badge-port'
  },
  rail_terminal: {
    label: 'Rail Terminal',
    color: '#f59e0b',
    symbol: '🚆',
    badgeClass: 'hub-badge-rail'
  },
  distribution_hub: {
    label: 'Distribution Hub',
    color: '#10b981',
    symbol: '🏢',
    badgeClass: 'hub-badge-dc'
  },
  choke_point: {
    label: 'Strategic Chokepoint',
    color: '#ef4444',
    symbol: '⚠',
    badgeClass: 'hub-badge-choke'
  },
  default: {
    label: 'Logistics Hub',
    color: '#64748b',
    symbol: '●',
    badgeClass: 'hub-badge-default'
  }
};

/**
 * Validates if coordinates are well-formed numbers within valid WGS84 ranges.
 */
export function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Fetches canonical hubs from existing backend endpoint.
 * @returns {Promise<Array>} Array of canonical hub objects.
 */
export async function fetchHubs() {
  const res = await fetch('/api/hubs');
  if (!res.ok) {
    throw new Error(`Failed to fetch canonical hubs: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Indexes hubs by their physical ID for O(1) lookup.
 * Safely filters and parses latitude and longitude.
 * @param {Array} hubs 
 * @returns {Record<string, Object>} Hub lookup dictionary keyed by ID.
 */
export function indexHubsById(hubs = []) {
  const index = {};
  for (const hub of hubs) {
    if (!hub || !hub.id) continue;
    
    const lat = typeof hub.lat === 'number' ? hub.lat : parseFloat(hub.lat);
    const lon = typeof hub.lon === 'number' ? hub.lon : parseFloat(hub.lon);

    if (isValidCoordinate(lat, lon)) {
      index[hub.id] = {
        ...hub,
        lat,
        lon,
        modes: Array.isArray(hub.modes) ? hub.modes : [],
        connections: Array.isArray(hub.connections) ? hub.connections : []
      };
    }
  }
  return index;
}

/**
 * Fetches scenarios from existing backend endpoint.
 * @returns {Promise<Array>} Array of disruption scenarios.
 */
export async function fetchScenarios() {
  try {
    const res = await fetch('/api/scenarios');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[MapDataService] Scenarios unavailable:', err.message);
    return [];
  }
}

/**
 * Extracts all unique background transit corridors from canonical hub connections.
 * Deduplicates bidirectional paths and skips unresolvable/invalid coordinates.
 * @param {Array} hubs 
 * @param {Record<string, Object>} hubIndex 
 * @returns {Array<Object>} List of corridor objects.
 */
export function extractCorridors(hubs = [], hubIndex = {}) {
  const corridors = [];
  const seen = new Set();

  for (const hub of hubs) {
    if (!hub || !hub.id) continue;
    const fromHub = hubIndex[hub.id];
    if (!fromHub) continue;

    const conns = Array.isArray(hub.connections) ? hub.connections : [];
    for (const conn of conns) {
      if (!conn || !conn.to) continue;
      const toHub = hubIndex[conn.to];
      if (!toHub) continue;

      // Unique corridor key regardless of direction to avoid over-drawing lines
      const pairKey = [hub.id, conn.to].sort().join('<->') + `:${conn.mode || 'any'}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      corridors.push({
        id: pairKey,
        fromId: hub.id,
        toId: conn.to,
        fromCoords: [fromHub.lat, fromHub.lon],
        toCoords: [toHub.lat, toHub.lon],
        mode: (conn.mode || 'road').toUpperCase()
      });
    }
  }

  return corridors;
}

/**
 * Converts recommendation route legs into geographic coordinate paths.
 * Robust against unknown hub IDs or invalid coordinates.
 * 
 * @param {Array} legs Recommendation legs returned by /api/recommend
 * @param {Record<string, Object>} hubIndex Hub lookup dictionary
 * @returns {Object} { segments, transferPoints, waypoints, bounds }
 */
export function convertRouteLegsToCoordinates(legs = [], hubIndex = {}) {
  const segments = [];
  const transferPoints = [];
  const waypoints = [];

  if (!Array.isArray(legs) || legs.length === 0) {
    return { segments, transferPoints, waypoints, bounds: null };
  }

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (!leg) continue;

    const fromId = leg.from;
    const toId = leg.to;

    const fromHub = hubIndex[fromId];
    const toHub = hubIndex[toId];

    const isTransfer = leg.type === 'transfer' || fromId === toId;

    if (isTransfer) {
      // Handoff within the same hub or co-located facility
      const hub = toHub || fromHub;
      if (hub) {
        transferPoints.push({
          index: i,
          hubId: hub.id,
          name: leg.to_name || hub.display_name,
          coords: [hub.lat, hub.lon],
          mode: (leg.mode || 'TRANSFER').toUpperCase(),
          eta: leg.eta,
          cost: leg.cost,
          reason: leg.reason,
          intelSource: leg.intel_source
        });
        waypoints.push([hub.lat, hub.lon]);
      }
      continue;
    }

    // Standard transit leg between two hubs
    if (fromHub && toHub) {
      const mode = (leg.mode || 'ROAD').toUpperCase();
      segments.push({
        index: i,
        fromId,
        fromName: fromHub.display_name,
        toId,
        toName: leg.to_name || toHub.display_name,
        coords: [
          [fromHub.lat, fromHub.lon],
          [toHub.lat, toHub.lon]
        ],
        mode,
        color: MODE_COLORS[mode] || MODE_COLORS.DEFAULT,
        eta: leg.eta,
        cost: leg.cost,
        threat: leg.threat,
        reason: leg.reason,
        intelSource: leg.intel_source,
        type: leg.type || 'transit'
      });

      waypoints.push([fromHub.lat, fromHub.lon]);
      waypoints.push([toHub.lat, toHub.lon]);
    }
  }

  // Calculate bounding box if coordinates exist
  let bounds = null;
  if (waypoints.length > 0) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    for (const [lat, lon] of waypoints) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    bounds = [
      [minLat, minLon],
      [maxLat, maxLon]
    ];
  }

  return { segments, transferPoints, waypoints, bounds };
}

/**
 * Builds a map of affected hub disruptions from an active scenario object.
 * @param {Object} scenario 
 * @returns {Record<string, Object>} Map of hubId -> disruption details
 */
export function getAffectedHubDisruptions(scenario) {
  if (!scenario || !Array.isArray(scenario.affected_nodes)) {
    return {};
  }
  const disruptions = {};
  for (const nodeId of scenario.affected_nodes) {
    disruptions[nodeId] = {
      scenarioName: scenario.name,
      threatLevel: scenario.threat_level,
      delayHours: scenario.delay_hours,
      reason: scenario.reason,
      mode: scenario.mode
    };
  }
  return disruptions;
}

/**
 * Helper to request route recommendations from existing /api/recommend endpoint.
 */
export async function fetchRouteRecommendation(params) {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    throw new Error(`Recommendation failed: HTTP ${res.status}`);
  }
  return await res.json();
}
