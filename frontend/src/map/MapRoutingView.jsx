/**
 * MapRoutingView.jsx
 * 
 * Standalone Master Map Routing View for Supplychainer.
 * - Works completely independently with its own interactive controls.
 * - Also accepts external recommendation props for seamless parent embedding.
 * - Visualizes hubs, corridors, multimodal routes, transfer points, and disruption threats.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, Navigation, AlertTriangle, Layers, Zap, Clock, DollarSign,
  ShieldCheck, RefreshCw, Filter, ChevronRight, Activity, ArrowRightLeft,
  Plane, Ship, Train, Truck
} from 'lucide-react';

import LeafletMap from './LeafletMap.jsx';
import { 
  fetchHubs, 
  indexHubsById, 
  extractCorridors, 
  fetchScenarios, 
  convertRouteLegsToCoordinates,
  getAffectedHubDisruptions,
  fetchRouteRecommendation,
  MODE_COLORS,
  HUB_TYPE_META
} from './mapDataService.js';
import './mapRouting.css';

export default function MapRoutingView({
  recommendations: externalRecs = null,
  selectedPersona: externalPersona = 'BALANCED',
  activeScenario: externalScenario = null,
  onNavigate = null
}) {
  // Data state
  const [hubs, setHubs] = useState([]);
  const [hubIndex, setHubIndex] = useState({});
  const [corridors, setCorridors] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  
  // Loading & error state
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState(null);

  // Standalone interaction state (when not driven by parent props)
  const [internalRecs, setInternalRecs] = useState([]);
  const [persona, setPersona] = useState(externalPersona || 'BALANCED');
  const [activeScenarioId, setActiveScenarioId] = useState(externalScenario || 'NORMAL');
  const [originId, setOriginId] = useState('HUB-SFO');
  const [destinationId, setDestinationId] = useState('PORT-ROTTERDAM');
  const [transportMode, setTransportMode] = useState('any');

  // Layer visibility toggles
  const [showCorridors, setShowCorridors] = useState(true);
  const [showHubs, setShowHubs] = useState(true);
  const [activeLeg, setActiveLeg] = useState(null);

  // Determine active recommendations (external props take precedence)
  const activeRecommendations = externalRecs || internalRecs;

  // 1. Initial Data Fetch: Hubs & Scenarios
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingHubs(true);
      setError(null);
      try {
        const [hubsData, scenariosData] = await Promise.all([
          fetchHubs(),
          fetchScenarios()
        ]);

        if (!isMounted) return;

        const indexed = indexHubsById(hubsData);
        const extractedCorrs = extractCorridors(hubsData, indexed);

        setHubs(hubsData);
        setHubIndex(indexed);
        setCorridors(extractedCorrs);
        setScenarios(scenariosData);

        // Pre-select valid default origin/dest if available in index
        const hubKeys = Object.keys(indexed);
        if (hubKeys.length > 1) {
          if (!indexed['HUB-SFO'] && hubKeys[0]) setOriginId(hubKeys[0]);
          if (!indexed['PORT-ROTTERDAM'] && hubKeys[1]) setDestinationId(hubKeys[1]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[MapRoutingView] Initialization error:', err);
          setError(`Data Loading Failed: ${err.message}. Ensure backend is running.`);
        }
      } finally {
        if (isMounted) setLoadingHubs(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Update persona / scenario if parent prop updates
  useEffect(() => {
    if (externalPersona) setPersona(externalPersona);
  }, [externalPersona]);

  useEffect(() => {
    if (externalScenario) setActiveScenarioId(externalScenario);
  }, [externalScenario]);

  // 2. Fetch standalone route recommendation
  const handleGenerateRoute = async () => {
    if (!originId || !destinationId) return;
    setLoadingRoute(true);
    setError(null);
    try {
      const data = await fetchRouteRecommendation({
        source: originId,
        destination: destinationId,
        transport_preference: transportMode,
        routing_policy: 'STRICT',
        scenario: activeScenarioId !== 'NORMAL' ? activeScenarioId : null
      });

      if (data.error) {
        setError(data.error);
        setInternalRecs([]);
      } else {
        setInternalRecs(data.recommendations || []);
        setActiveLeg(null);
      }
    } catch (err) {
      console.error('[MapRoutingView] Routing request error:', err);
      setError('Route generation failed. Check backend connection.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // 3. Find current selected recommendation
  const currentRecommendation = useMemo(() => {
    if (!activeRecommendations || activeRecommendations.length === 0) return null;
    const match = activeRecommendations.find(r => r.persona === persona);
    return match || activeRecommendations[0];
  }, [activeRecommendations, persona]);

  // 4. Map recommendation legs into geographic coordinates
  const activeRouteData = useMemo(() => {
    if (!currentRecommendation || !currentRecommendation.legs) return null;
    return convertRouteLegsToCoordinates(currentRecommendation.legs, hubIndex);
  }, [currentRecommendation, hubIndex]);

  // 5. Build disruption dictionary from active scenario
  const activeDisruptions = useMemo(() => {
    if (!activeScenarioId || activeScenarioId === 'NORMAL') return {};
    const scenario = scenarios.find(s => s.id === activeScenarioId);
    return scenario ? getAffectedHubDisruptions(scenario) : {};
  }, [activeScenarioId, scenarios]);

  const activeScenarioObj = scenarios.find(s => s.id === activeScenarioId);

  // Mode Icon Helper
  const renderModeIcon = (mode) => {
    switch ((mode || '').toLowerCase()) {
      case 'air': return <Plane size={12} color={MODE_COLORS.AIR} />;
      case 'sea': return <Ship size={12} color={MODE_COLORS.SEA} />;
      case 'rail': return <Train size={12} color={MODE_COLORS.RAIL} />;
      case 'road': return <Truck size={12} color={MODE_COLORS.ROAD} />;
      case 'transfer': return <ArrowRightLeft size={12} color={MODE_COLORS.TRANSFER} />;
      default: return <Navigation size={12} color="#94a3b8" />;
    }
  };

  return (
    <div className="sc-map-root">
      {/* Top Bar */}
      <header className="sc-map-topbar">
        <div className="sc-map-title-group">
          <Globe size={24} color="#3b82f6" />
          <div>
            <h2 className="sc-map-title">Geospatial Multimodal Router</h2>
            <p className="sc-map-subtitle">Global Physical Topology & Active Corridors</p>
          </div>
        </div>

        <div className="sc-map-stats-strip">
          <div className="sc-map-stat-pill">
            <span>HUBS:</span>
            <span className="sc-map-stat-value">{hubs.length}</span>
          </div>
          <div className="sc-map-stat-pill">
            <span>CORRIDORS:</span>
            <span className="sc-map-stat-value">{corridors.length}</span>
          </div>

          {activeScenarioObj && (
            <div className="sc-map-threat-alert">
              <AlertTriangle size={14} />
              <span>{activeScenarioObj.name} ACTIVE</span>
            </div>
          )}

          {onNavigate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                className="sc-map-toggle-btn"
                onClick={() => onNavigate('network')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: '#3b82f6', color: '#38bdf8' }}
                title="Switch to Global Network Topology View"
              >
                <Globe size={13} />
                <span>Global Topology</span>
              </button>
              <button 
                className="sc-map-toggle-btn"
                onClick={() => onNavigate('recommend')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                title="Return to Route Command Console"
              >
                <span>Command Console</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Control Toolbar */}
      <div className="sc-map-controls-bar">
        <div className="sc-map-controls-group">
          <label style={{ color: '#94a3b8', fontWeight: 600 }}>Origin:</label>
          <select 
            className="sc-map-select"
            value={originId} 
            onChange={e => setOriginId(e.target.value)}
            disabled={loadingRoute}
          >
            {hubs.map(h => (
              <option key={`orig-${h.id}`} value={h.id}>
                {h.display_name} ({h.id})
              </option>
            ))}
          </select>

          <label style={{ color: '#94a3b8', fontWeight: 600, marginLeft: '0.4rem' }}>Destination:</label>
          <select 
            className="sc-map-select"
            value={destinationId} 
            onChange={e => setDestinationId(e.target.value)}
            disabled={loadingRoute}
          >
            {hubs.map(h => (
              <option key={`dest-${h.id}`} value={h.id}>
                {h.display_name} ({h.id})
              </option>
            ))}
          </select>

          <select 
            className="sc-map-select"
            value={transportMode}
            onChange={e => setTransportMode(e.target.value)}
            disabled={loadingRoute}
          >
            <option value="any">Mode: All</option>
            <option value="sea">Mode: Sea</option>
            <option value="air">Mode: Air</option>
            <option value="rail">Mode: Rail</option>
            <option value="road">Mode: Road</option>
          </select>

          <select 
            className="sc-map-select"
            value={activeScenarioId}
            onChange={e => setActiveScenarioId(e.target.value)}
            disabled={loadingRoute}
            style={{ borderColor: activeScenarioId !== 'NORMAL' ? '#ef4444' : '#1e293b' }}
          >
            <option value="NORMAL">Operational Normal</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
            ))}
          </select>

          <button 
            className="sc-map-btn" 
            onClick={handleGenerateRoute}
            disabled={loadingRoute || loadingHubs}
          >
            {loadingRoute ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
            <span>SOLVE ROUTE</span>
          </button>
        </div>

        {/* View toggles */}
        <div className="sc-map-controls-group">
          <button 
            className={`sc-map-toggle-btn ${showCorridors ? 'active' : ''}`}
            onClick={() => setShowCorridors(!showCorridors)}
          >
            Corridors
          </button>
          <button 
            className={`sc-map-toggle-btn ${showHubs ? 'active' : ''}`}
            onClick={() => setShowHubs(!showHubs)}
          >
            Hub Markers
          </button>
        </div>
      </div>

      {/* Main Canvas & Overlays */}
      <div className="sc-map-main-wrapper">
        <LeafletMap 
          hubs={hubs}
          hubIndex={hubIndex}
          corridors={corridors}
          routeData={activeRouteData}
          activeDisruptions={activeDisruptions}
          showCorridors={showCorridors}
          showHubs={showHubs}
          onSelectOrigin={(hub) => setOriginId(hub.id)}
          onSelectDestination={(hub) => setDestinationId(hub.id)}
          onSelectLeg={(leg) => setActiveLeg(leg)}
        />

        {/* Legend Overlay */}
        <div className="sc-map-legend-card">
          <div className="sc-map-legend-title">Hub Types</div>
          <div className="sc-map-legend-grid" style={{ marginBottom: '0.6rem' }}>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: HUB_TYPE_META.airport.color }} />
              <span>Airport</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: HUB_TYPE_META.port.color }} />
              <span>Seaport</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: HUB_TYPE_META.rail_terminal.color }} />
              <span>Rail Terminal</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: HUB_TYPE_META.distribution_hub.color }} />
              <span>DC / Logistics</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: HUB_TYPE_META.choke_point.color }} />
              <span>Chokepoint</span>
            </div>
          </div>

          <div className="sc-map-legend-title">Transport Modes</div>
          <div className="sc-map-legend-grid">
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-line" style={{ background: MODE_COLORS.AIR }} />
              <span>Air Transit</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-line" style={{ background: MODE_COLORS.SEA }} />
              <span>Sea Corridor</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-line" style={{ background: MODE_COLORS.RAIL }} />
              <span>Rail Freight</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-line" style={{ background: MODE_COLORS.ROAD }} />
              <span>Road Delivery</span>
            </div>
            <div className="sc-map-legend-item">
              <span className="sc-map-legend-dot" style={{ background: MODE_COLORS.TRANSFER }} />
              <span>Handoff</span>
            </div>
          </div>
        </div>

        {/* Route Details Drawer */}
        {currentRecommendation && (
          <aside className="sc-map-route-drawer">
            <div className="sc-map-route-header">
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['BALANCED', 'FASTEST', 'SAFEST'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPersona(p)}
                    className={`sc-map-persona-pill ${
                      persona === p 
                        ? p === 'FASTEST' ? 'sc-persona-fastest' : p === 'SAFEST' ? 'sc-persona-safest' : 'sc-persona-balanced'
                        : 'sc-map-toggle-btn'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="sc-map-route-kpis">
              <div className="sc-map-route-kpi-col">
                <span className="sc-map-route-kpi-label">TOTAL ETA</span>
                <span className="sc-map-route-kpi-val" style={{ color: '#f59e0b' }}>
                  {currentRecommendation.adjusted_eta}h
                </span>
              </div>
              <div className="sc-map-route-kpi-col">
                <span className="sc-map-route-kpi-label">LANDED COST</span>
                <span className="sc-map-route-kpi-val" style={{ color: '#10b981' }}>
                  ${currentRecommendation.total_cost?.toLocaleString()}
                </span>
              </div>
              <div className="sc-map-route-kpi-col">
                <span className="sc-map-route-kpi-label">THREAT EXP.</span>
                <span className="sc-map-route-kpi-val" style={{ color: '#3b82f6' }}>
                  {Math.round((currentRecommendation.threat_level || 0) * 100)}%
                </span>
              </div>
            </div>

            <div style={{ padding: '0.75rem 1.1rem', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
              {currentRecommendation.explanation}
            </div>

            <div className="sc-map-legs-list">
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Multi-Modal Sequence ({currentRecommendation.legs?.length || 0} Segments)
              </div>
              
              {currentRecommendation.legs?.map((leg, idx) => {
                const isTransfer = leg.type === 'transfer' || leg.from === leg.to;
                const isSelected = activeLeg && activeLeg.index === idx;

                return (
                  <div 
                    key={`leg-${idx}`} 
                    className={`sc-map-leg-item ${isSelected ? 'active' : ''}`}
                    style={{ borderLeftColor: isTransfer ? MODE_COLORS.TRANSFER : MODE_COLORS[leg.mode] || '#3b82f6' }}
                    onClick={() => setActiveLeg({ ...leg, index: idx })}
                  >
                    <div className="sc-map-leg-header">
                      <span className="sc-map-leg-mode" style={{ color: isTransfer ? '#a855f7' : MODE_COLORS[leg.mode] || '#38bdf8' }}>
                        {renderModeIcon(leg.mode)}
                        <span style={{ marginLeft: '4px' }}>
                          {isTransfer ? 'STRATEGIC HANDOFF' : `${leg.mode} TRANSIT`}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#94a3b8' }}>
                        +{leg.eta}h
                      </span>
                    </div>

                    <div className="sc-map-leg-dest">
                      {isTransfer ? `Facility: ${leg.to_name || leg.to}` : `Destination: ${leg.to_name || leg.to}`}
                    </div>

                    <div className="sc-map-leg-footer">
                      <span>Cost: ${leg.cost?.toLocaleString() || 0}</span>
                      {leg.threat > 0 && <span style={{ color: '#ef4444' }}>Threat: {Math.round(leg.threat * 100)}%</span>}
                    </div>

                    {leg.reason && (
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                        {leg.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Global Error Banner */}
        {error && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            zIndex: 30,
            maxWidth: '400px'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
