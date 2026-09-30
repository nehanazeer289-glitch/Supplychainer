import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, ZoomControl, useMap 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Globe, ArrowLeft, ShieldCheck, BarChart3, Database, 
  Search, RotateCcw, AlertTriangle, Layers, Plane, Ship, 
  Train, Truck, Navigation, Activity, X, MapPin, ChevronRight, 
  RefreshCw, Radio, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';

// Fix default Leaflet marker assets if needed
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Spatial type configuration and color tokens
const HUB_CONFIG = {
  airport: {
    label: 'Airport',
    color: '#3b82f6',
    border: '#60a5fa',
    icon: Plane,
    bgBadge: 'rgba(59, 130, 246, 0.15)'
  },
  port: {
    label: 'Maritime Port',
    color: '#06b6d4',
    border: '#22d3ee',
    icon: Ship,
    bgBadge: 'rgba(6, 182, 212, 0.15)'
  },
  choke_point: {
    label: 'Strategic Chokepoint',
    color: '#ef4444',
    border: '#f87171',
    icon: AlertTriangle,
    bgBadge: 'rgba(239, 68, 68, 0.15)'
  },
  rail_terminal: {
    label: 'Rail Terminal',
    color: '#a855f7',
    border: '#c084fc',
    icon: Train,
    bgBadge: 'rgba(168, 85, 247, 0.15)'
  },
  distribution_hub: {
    label: 'Distribution Hub',
    color: '#10b981',
    border: '#34d399',
    icon: Truck,
    bgBadge: 'rgba(16, 185, 129, 0.15)'
  }
};

const MODE_ICONS = {
  air: Plane,
  sea: Ship,
  rail: Train,
  road: Truck
};

// Safe coordinate validation
function isValidCoordinate(hub) {
  return (
    hub &&
    typeof hub.lat === 'number' &&
    typeof hub.lon === 'number' &&
    !isNaN(hub.lat) &&
    !isNaN(hub.lon) &&
    hub.lat >= -90 &&
    hub.lat <= 90 &&
    hub.lon >= -180 &&
    hub.lon <= 180
  );
}

// Controller component to smoothly fly map to selected hub
function MapFlyController({ targetHub }) {
  const map = useMap();
  useEffect(() => {
    if (targetHub && isValidCoordinate(targetHub)) {
      map.flyTo([targetHub.lat, targetHub.lon], 5.5, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [targetHub, map]);
  return null;
}

// Helper to handle Leaflet resize / viewport invalidation on view switch
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

export default function GlobalNetworkMap({ onNavigate }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedHub, setSelectedHub] = useState(null);
  // Requirement 3: Default state of global corridors is OFF to eliminate visual clutter
  const [showCorridors, setShowCorridors] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const fetchHubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hubs');
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected hub data format received.');
      }
      setHubs(data);
    } catch (err) {
      console.error('Failed to load global hubs:', err);
      setError(err.message || 'Unable to connect to logistics engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  // Filter only valid coordinates
  const validHubs = useMemo(() => {
    return hubs.filter(isValidCoordinate);
  }, [hubs]);

  // Fast ID lookup map for transit corridor resolution
  const hubLookup = useMemo(() => {
    const lookup = new Map();
    validHubs.forEach(h => lookup.set(h.id, h));
    return lookup;
  }, [validHubs]);

  // Filter hubs based on search, type, and mode
  const filteredHubs = useMemo(() => {
    return validHubs.filter(h => {
      if (selectedType !== 'all' && h.type !== selectedType) {
        return false;
      }
      if (selectedMode !== 'all' && (!h.modes || !h.modes.includes(selectedMode))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = h.display_name?.toLowerCase().includes(q);
        const matchCountry = h.country?.toLowerCase().includes(q);
        const matchCity = h.parent_city?.toLowerCase().includes(q);
        const matchId = h.id?.toLowerCase().includes(q);
        const matchAliases = Array.isArray(h.aliases) && h.aliases.some(a => a.toLowerCase().includes(q));
        if (!matchName && !matchCountry && !matchCity && !matchId && !matchAliases) {
          return false;
        }
      }
      return true;
    });
  }, [validHubs, selectedType, selectedMode, searchQuery]);

  // Global transit corridors (rendered only when user toggles showCorridors ON)
  const globalCorridors = useMemo(() => {
    if (!showCorridors) return [];
    const lines = [];
    const seen = new Set();

    filteredHubs.forEach(h => {
      if (Array.isArray(h.connections)) {
        h.connections.forEach(conn => {
          const target = hubLookup.get(conn.to);
          if (target && isValidCoordinate(target)) {
            const key = [h.id, target.id].sort().join('--');
            if (!seen.has(key)) {
              seen.add(key);
              let color = '#3b82f6';
              if (conn.mode === 'sea') color = '#06b6d4';
              else if (conn.mode === 'rail') color = '#a855f7';
              else if (conn.mode === 'road') color = '#10b981';

              lines.push({
                key,
                positions: [
                  [h.lat, h.lon],
                  [target.lat, target.lon]
                ],
                mode: conn.mode,
                color
              });
            }
          }
        });
      }
    });

    return lines;
  }, [filteredHubs, hubLookup, showCorridors]);

  // Context-sensitive corridors: ALWAYS illuminate direct corridors for the selected hub
  const focusedCorridors = useMemo(() => {
    if (!selectedHub || !Array.isArray(selectedHub.connections)) return [];
    const lines = [];
    selectedHub.connections.forEach((conn) => {
      const target = hubLookup.get(conn.to);
      if (target && isValidCoordinate(target)) {
        let color = '#38bdf8';
        if (conn.mode === 'sea') color = '#22d3ee';
        else if (conn.mode === 'air') color = '#60a5fa';
        else if (conn.mode === 'rail') color = '#c084fc';
        else if (conn.mode === 'road') color = '#34d399';

        lines.push({
          key: `focus-${selectedHub.id}-${target.id}-${conn.mode}`,
          positions: [
            [selectedHub.lat, selectedHub.lon],
            [target.lat, target.lon]
          ],
          mode: conn.mode,
          color,
          targetId: target.id,
          targetName: target.display_name
        });
      }
    });
    return lines;
  }, [selectedHub, hubLookup]);

  // Set of target hub IDs directly connected to the selected hub
  const connectedTargetIds = useMemo(() => {
    if (!selectedHub || !Array.isArray(selectedHub.connections)) return new Set();
    return new Set(selectedHub.connections.map(c => c.to));
  }, [selectedHub]);

  // Statistics summaries
  const stats = useMemo(() => {
    const chokeCount = validHubs.filter(h => h.type === 'choke_point').length;
    const countries = new Set(validHubs.map(h => h.country).filter(Boolean)).size;
    return {
      total: validHubs.length,
      filtered: filteredHubs.length,
      chokepoints: chokeCount,
      countries
    };
  }, [validHubs, filteredHubs]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedMode('all');
  };

  return (
    <div className="map-view-layout">
      {/* Top Header */}
      <header className="map-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="sc-badge-active" 
            onClick={() => onNavigate('recommend')}
            style={{ cursor: 'pointer', borderColor: 'var(--border-slate)' }}
            title="Return to Route Optimization Console"
          >
            <ArrowLeft size={14} /> COMMAND CONSOLE
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="map-header-icon-box">
              <Globe size={22} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>
                Global Logistics Network Map
              </h1>
              <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                CANONICAL TOPOLOGY · MULTIMODAL CORRIDORS · VERIFIED CHOKEPOINTS
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            className="sc-badge-active" 
            onClick={() => onNavigate('suppliers')} 
            style={{ cursor: 'pointer', borderColor: '#8b5cf6', color: '#8b5cf6' }}
            title="Open Supplier Intelligence Audit"
          >
            <ShieldCheck size={14} /> SUPPLIER INTELLIGENCE
          </button>
          <button 
            className="sc-badge-active" 
            onClick={() => onNavigate('benchmark')} 
            style={{ cursor: 'pointer', borderColor: '#10b981', color: '#10b981' }}
            title="Open Scientific Decision Benchmarks"
          >
            <BarChart3 size={14} /> BENCHMARKS
          </button>
        </div>
      </header>

      {/* Control Strip & Metrics Bar */}
      <div className="map-control-bar">
        {/* Search Input */}
        <div className="map-search-wrapper">
          <Search size={15} className="map-search-icon" />
          <input 
            type="text"
            className="map-search-input"
            placeholder="Search hubs by name, country, city, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="map-search-clear" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Hub Type Filter */}
        <div className="map-filter-group">
          <label className="map-filter-label">HUB TYPE</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="map-select"
          >
            <option value="all">All Hub Types ({stats.total})</option>
            <option value="airport">Airports</option>
            <option value="port">Maritime Ports</option>
            <option value="choke_point">Strategic Chokepoints</option>
            <option value="rail_terminal">Rail Terminals</option>
            <option value="distribution_hub">Distribution Hubs</option>
          </select>
        </div>

        {/* Transport Mode Filter */}
        <div className="map-filter-group">
          <label className="map-filter-label">MODAL CORRIDOR</label>
          <select 
            value={selectedMode} 
            onChange={(e) => setSelectedMode(e.target.value)}
            className="map-select"
          >
            <option value="all">All Modes</option>
            <option value="air">Air Cargo</option>
            <option value="sea">Maritime Sea</option>
            <option value="rail">Freight Rail</option>
            <option value="road">Highway Road</option>
          </select>
        </div>

        {/* Corridor Toggle (Default OFF for readability; context corridors still illuminate on selection) */}
        <button 
          className={`map-toggle-btn ${showCorridors ? 'active' : ''}`}
          onClick={() => setShowCorridors(prev => !prev)}
          title="Toggle global network background mesh"
        >
          {showCorridors ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>Global Mesh {showCorridors ? 'ON' : 'OFF'}</span>
        </button>

        {/* Reset button if filtered */}
        {(searchQuery || selectedType !== 'all' || selectedMode !== 'all') && (
          <button className="map-reset-btn" onClick={resetFilters}>
            <RotateCcw size={13} /> Reset
          </button>
        )}

        {/* Live Metrics Pill */}
        <div className="map-status-pill">
          <div className="map-status-dot animate-pulse"></div>
          <span>
            <strong>{stats.filtered}</strong> of {stats.total} Hubs
          </span>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: '#ef4444' }}>
            <strong>{stats.chokepoints}</strong> Chokepoints
          </span>
          <span style={{ color: '#475569' }}>·</span>
          <span>
            <strong>{stats.countries}</strong> Countries
          </span>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="map-canvas-container">
        {/* Loading Overlay */}
        {loading && (
          <div className="map-overlay-center">
            <div className="map-modal-card">
              <RefreshCw className="animate-spin" size={32} color="#3b82f6" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                  Loading Global Logistics Topology...
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Synchronizing canonical hub coordinates and transit corridors
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {!loading && error && (
          <div className="map-overlay-center">
            <div className="map-modal-card" style={{ borderColor: '#ef4444' }}>
              <AlertTriangle size={32} color="#ef4444" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>
                  Engine Connection Failed
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  {error}
                </p>
                <button className="sc-btn-execute" style={{ padding: '0.5rem 1rem' }} onClick={fetchHubs}>
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State Overlay */}
        {!loading && !error && filteredHubs.length === 0 && (
          <div className="map-empty-banner">
            <AlertTriangle size={18} color="#f59e0b" />
            <span>No hubs match the active filters or search terms.</span>
            <button className="map-link-btn" onClick={resetFilters}>Reset Filters</button>
          </div>
        )}

        {/* Interactive Leaflet Map */}
        <MapContainer
          center={[22, 12]}
          zoom={2.5}
          minZoom={2}
          maxZoom={14}
          maxBounds={[[-85, -200], [85, 200]]}
          maxBoundsViscosity={0.7}
          scrollWheelZoom={true}
          zoomControl={false}
          className="leaflet-map-root"
        >
          <ZoomControl position="bottomright" />
          <MapFlyController targetHub={selectedHub} />
          <MapResizeHandler />

          {/* 
            FIX: Reliable Leaflet-compatible dark tile provider that does NOT require an API key.
            Esri World Dark Gray Canvas provides a clean, dark executive aesthetic without 
            the repeated "API KEY REQUIRED" watermarks caused by CartoDB's recent token restrictions.
          */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            minZoom={2}
          />
          {/* Subtle reference overlay for boundary and geopolitical context */}
          <TileLayer
            attribution=""
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            minZoom={2}
            opacity={0.45}
          />

          {/* 
            Global Corridors: Rendered only when user toggles showCorridors ON.
            Uses restrained opacity (0.15) and light stroke (1px) so markers remain crisp.
          */}
          {showCorridors && globalCorridors.map((c) => (
            <Polyline
              key={c.key}
              positions={c.positions}
              pathOptions={{
                color: c.color,
                weight: 1,
                opacity: 0.15,
                dashArray: c.mode === 'air' ? '3, 5' : undefined
              }}
            />
          ))}

          {/* 
            Focused Context-Sensitive Corridors:
            When a hub is selected, its direct outbound connections illuminate brightly
            even when global corridors are OFF.
          */}
          {focusedCorridors.map((c) => (
            <Polyline
              key={c.key}
              positions={c.positions}
              pathOptions={{
                color: c.color,
                weight: 2.5,
                opacity: 0.85,
                dashArray: c.mode === 'air' ? '6, 6' : undefined
              }}
            />
          ))}

          {/* Hub Markers */}
          {filteredHubs.map((hub) => {
            const config = HUB_CONFIG[hub.type] || HUB_CONFIG.distribution_hub;
            const isSelected = selectedHub?.id === hub.id;
            const isConnectedTarget = connectedTargetIds.has(hub.id);
            const isChoke = hub.type === 'choke_point';
            const radius = isSelected ? 12 : isConnectedTarget ? 9 : isChoke ? 8 : Math.max(5, Math.min(9, (hub.importance || 5) * 0.9));

            return (
              <React.Fragment key={hub.id}>
                {/* Visual pulse halo for selected hub */}
                {isSelected && (
                  <CircleMarker
                    center={[hub.lat, hub.lon]}
                    radius={19}
                    pathOptions={{
                      color: '#38bdf8',
                      fillColor: 'transparent',
                      weight: 1.5,
                      dashArray: '4, 4',
                      opacity: 0.9
                    }}
                  />
                )}

                <CircleMarker
                  center={[hub.lat, hub.lon]}
                  radius={radius}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : isConnectedTarget ? '#38bdf8' : config.color,
                    fillColor: isSelected ? '#38bdf8' : config.color,
                    fillOpacity: isSelected ? 1 : isConnectedTarget ? 0.9 : (isChoke ? 0.88 : 0.72),
                    weight: isSelected ? 3 : isConnectedTarget ? 2 : (isChoke ? 2 : 1.2)
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedHub(hub);
                    }
                  }}
                >
                  {/* Hover Tooltip */}
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95} className="cyber-map-tooltip">
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#f8fafc' }}>
                      {hub.display_name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isConnectedTarget ? '#38bdf8' : '#94a3b8' }}>
                      {isConnectedTarget ? `Direct Corridor Destination · ${hub.country}` : `${hub.country} · ${config.label}`}
                    </div>
                  </Tooltip>

                  {/* Rich Dark Cyber Popup */}
                  <Popup className="cyber-map-popup" maxWidth={320} minWidth={260}>
                    <div className="map-popup-body">
                      {/* Header: Type and Importance Badges */}
                      <div className="map-popup-top">
                        <span 
                          className="map-popup-type-tag" 
                          style={{ 
                            backgroundColor: config.bgBadge, 
                            color: config.color, 
                            borderColor: config.color 
                          }}
                        >
                          {config.label.toUpperCase()}
                        </span>
                        <span className="map-popup-score-tag">
                          PRIORITY {hub.importance || 5}/10
                        </span>
                      </div>

                      {/* Hub Title and Codes */}
                      <h3 className="map-popup-title">
                        {hub.display_name}
                      </h3>
                      <div className="map-popup-location">
                        <MapPin size={12} color="#3b82f6" />
                        <span>{hub.parent_city ? `${hub.parent_city}, ` : ''}{hub.country}</span>
                        <span className="map-popup-code">ID: {hub.id}</span>
                      </div>

                      {/* Strategic Role / Overview */}
                      {hub.strategic_role && (
                        <div className="map-popup-strategic-role">
                          {hub.strategic_role}
                        </div>
                      )}

                      {/* Supported Modes */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className="map-popup-subhead">SUPPORTED MODES</div>
                        <div className="map-popup-modes">
                          {Array.isArray(hub.modes) && hub.modes.map((m) => {
                            const IconComp = MODE_ICONS[m] || Navigation;
                            return (
                              <span key={m} className="map-popup-mode-badge">
                                <IconComp size={11} /> {m.toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Direct Corridors Summary */}
                      {Array.isArray(hub.connections) && hub.connections.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div className="map-popup-subhead">
                            DIRECT CORRIDORS ({hub.connections.length})
                          </div>
                          <div className="map-popup-connections">
                            {hub.connections.slice(0, 4).map((conn, idx) => (
                              <span key={idx} className="map-popup-connection-pill">
                                &rarr; {conn.to} ({conn.mode})
                              </span>
                            ))}
                            {hub.connections.length > 4 && (
                              <span className="map-popup-connection-more">
                                +{hub.connections.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Coordinates Anchor */}
                      <div className="map-popup-coordinates">
                        <span>LAT: {hub.lat.toFixed(4)}°</span>
                        <span>LON: {hub.lon.toFixed(4)}°</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Floating Glassmorphic Legend (Bottom Left - Collapsible) */}
        <div className={`map-floating-legend ${legendCollapsed ? 'collapsed' : ''}`}>
          <div className="map-legend-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} color="#94a3b8" />
              <span>TOPOLOGY CLASSIFICATION</span>
            </div>
            <button 
              className="map-legend-toggle"
              onClick={() => setLegendCollapsed(prev => !prev)}
              title={legendCollapsed ? 'Expand Legend' : 'Collapse Legend'}
            >
              {legendCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {!legendCollapsed && (
            <div className="map-legend-grid">
              {Object.entries(HUB_CONFIG).map(([key, item]) => {
                const Icon = item.icon;
                const count = validHubs.filter(h => h.type === key).length;
                return (
                  <div 
                    key={key} 
                    className={`map-legend-row ${selectedType === key ? 'active' : ''}`}
                    onClick={() => setSelectedType(selectedType === key ? 'all' : key)}
                    title={`Filter by ${item.label}`}
                  >
                    <div className="map-legend-indicator" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}66` }}></div>
                    <Icon size={12} color={item.color} />
                    <span className="map-legend-name">{item.label}</span>
                    <span className="map-legend-count">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Hub Inspector Card (Top Right Drawer) */}
        {selectedHub && (
          <aside className="map-inspector-card animate-slide-in">
            <div className="map-inspector-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={14} color="#3b82f6" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                  HUB INSPECTOR
                </span>
              </div>
              <button 
                className="map-inspector-close"
                onClick={() => setSelectedHub(null)}
                title="Close Inspector"
              >
                <X size={15} />
              </button>
            </div>

            <div className="map-inspector-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span 
                  className="map-popup-type-tag" 
                  style={{ 
                    backgroundColor: (HUB_CONFIG[selectedHub.type]?.bgBadge || 'rgba(59,130,246,0.15)'), 
                    color: (HUB_CONFIG[selectedHub.type]?.color || '#3b82f6'),
                    borderColor: (HUB_CONFIG[selectedHub.type]?.color || '#3b82f6')
                  }}
                >
                  {(HUB_CONFIG[selectedHub.type]?.label || selectedHub.type).toUpperCase()}
                </span>
                <span className="map-popup-score-tag">
                  PRIORITY {selectedHub.importance || 5}/10
                </span>
              </div>

              <h2 className="map-inspector-title">{selectedHub.display_name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                <MapPin size={13} color="#3b82f6" />
                <span>{selectedHub.parent_city ? `${selectedHub.parent_city}, ` : ''}{selectedHub.country}</span>
                <span style={{ color: '#475569' }}>·</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>{selectedHub.id}</span>
              </div>

              {selectedHub.strategic_role && (
                <div className="map-popup-strategic-role" style={{ marginBottom: '1rem' }}>
                  {selectedHub.strategic_role}
                </div>
              )}

              <div className="map-inspector-section">
                <span className="map-popup-subhead">GEOGRAPHIC ANCHOR</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#cbd5e1', background: '#020617', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <span>LAT: {selectedHub.lat.toFixed(4)}°</span>
                  <span>LON: {selectedHub.lon.toFixed(4)}°</span>
                </div>
              </div>

              <div className="map-inspector-section">
                <span className="map-popup-subhead">MODAL CAPABILITIES</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Array.isArray(selectedHub.modes) && selectedHub.modes.map(m => {
                    const IconComp = MODE_ICONS[m] || Navigation;
                    return (
                      <span key={m} className="map-popup-mode-badge">
                        <IconComp size={11} /> {m.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              </div>

              {Array.isArray(selectedHub.connections) && selectedHub.connections.length > 0 && (
                <div className="map-inspector-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="map-popup-subhead">
                      ACTIVE OUTBOUND CORRIDORS ({selectedHub.connections.length})
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700 }}>
                      Click to jump
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                    {selectedHub.connections.map((c, i) => {
                      const target = hubLookup.get(c.to);
                      return (
                        <div 
                          key={i} 
                          className="map-inspector-corridor-row"
                          onClick={() => {
                            if (target) setSelectedHub(target);
                          }}
                          title={target ? `Jump to ${target.display_name}` : c.to}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono', color: '#f8fafc', fontWeight: 600 }}>{c.to}</span>
                            {target && (
                              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                                ({target.country})
                              </span>
                            )}
                          </div>
                          <span style={{ textTransform: 'uppercase', color: '#38bdf8', fontSize: '0.65rem', fontWeight: 700 }}>
                            {c.mode} &rarr;
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="sc-btn-execute" 
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => onNavigate('recommend')}
                >
                  <Navigation size={13} />
                  <span>Configure Route from this Hub</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
