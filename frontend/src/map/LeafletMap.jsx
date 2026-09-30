/**
 * LeafletMap.jsx
 * 
 * Standalone Leaflet map component with reliable local npm bundling.
 * Uses Esri Dark Gray Canvas tiles (no API key required).
 * Handles lifecycle cleanly: prevents duplicate initializations and cleans up on unmount.
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HUB_TYPE_META, MODE_COLORS, isValidCoordinate } from './mapDataService.js';

// Configure Leaflet standard default icon assets safely
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LeafletMap({
  hubs = [],
  hubIndex = {},
  corridors = [],
  routeData = null,
  activeDisruptions = {},
  showCorridors = true,
  showHubs = true,
  onSelectOrigin = null,
  onSelectDestination = null,
  onSelectLeg = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Layer groups refs to easily add/remove objects without tearing down the map
  const corridorsLayerRef = useRef(null);
  const hubsLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const threatsLayerRef = useRef(null);

  const [initError, setInitError] = useState(null);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate map initialization on hot reloads / re-renders
    if (mapInstanceRef.current || mapContainerRef.current._leaflet_id) {
      return;
    }

    try {
      // Initialize map with neutral dark world view
      const map = L.map(mapContainerRef.current, {
        center: [22, 12],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        zoomControl: false
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Reliable Leaflet-compatible dark tile provider that does NOT require an API key
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
        minZoom: 2
      }).addTo(map);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 16,
        minZoom: 2,
        opacity: 0.45
      }).addTo(map);

      // Create managed layer groups
      corridorsLayerRef.current = L.layerGroup().addTo(map);
      hubsLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      threatsLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size once DOM stabilizes
      const resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', handleResize);
      };
    } catch (err) {
      console.error('[LeafletMap] Map creation error:', err);
      setInitError(err.message);
    }

    // Cleanup when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('[LeafletMap] Error during map teardown:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Corridors Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !corridorsLayerRef.current) return;

    corridorsLayerRef.current.clearLayers();

    if (!showCorridors || !Array.isArray(corridors)) return;

    for (const corridor of corridors) {
      const { fromCoords, toCoords, mode } = corridor;
      if (!isValidCoordinate(fromCoords[0], fromCoords[1]) || !isValidCoordinate(toCoords[0], toCoords[1])) {
        continue;
      }

      // Mode-specific line styling for background corridors
      let dashArray = '3, 4';
      let weight = 1.2;
      let opacity = 0.22;
      let color = '#475569'; // Slate default

      if (mode === 'SEA') {
        color = '#0284c7'; // Sea Cyan/Blue
        dashArray = '5, 5';
        opacity = 0.3;
      } else if (mode === 'AIR') {
        color = '#38bdf8'; // Sky
        dashArray = '2, 6';
        opacity = 0.25;
      } else if (mode === 'RAIL') {
        color = '#b45309'; // Amber
        dashArray = '4, 4';
      }

      const polyline = L.polyline([fromCoords, toCoords], {
        color,
        weight,
        opacity,
        dashArray,
        interactive: false
      });

      corridorsLayerRef.current.addLayer(polyline);
    }
  }, [corridors, showCorridors]);

  // 3. Render Hubs & Threat Indicators
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hubsLayerRef.current || !threatsLayerRef.current) return;

    hubsLayerRef.current.clearLayers();
    threatsLayerRef.current.clearLayers();

    if (!showHubs || !Array.isArray(hubs) || hubs.length === 0) return;

    const validLatLngs = [];

    for (const hub of hubs) {
      if (!isValidCoordinate(hub.lat, hub.lon)) continue;

      const coords = [hub.lat, hub.lon];
      validLatLngs.push(coords);

      const typeMeta = HUB_TYPE_META[hub.type] || HUB_TYPE_META.default;
      const isDisrupted = Boolean(activeDisruptions[hub.id]);
      const disruption = activeDisruptions[hub.id];

      // If disrupted, add pulsing threat halo
      if (isDisrupted) {
        const threatMarker = L.circleMarker(coords, {
          radius: 14,
          fillColor: '#ef4444',
          fillOpacity: 0.25,
          color: '#ef4444',
          weight: 2,
          className: 'sc-marker-pulse'
        });

        threatMarker.bindTooltip(`⚠ DISRUPTION: ${disruption?.reason || 'Threat Active'}`, {
          className: 'sc-threat-tooltip',
          direction: 'top'
        });

        threatsLayerRef.current.addLayer(threatMarker);
      }

      // Radius and styling based on importance and type
      const radius = hub.type === 'choke_point' ? 7 : hub.importance >= 8 ? 6 : 4.5;
      const markerColor = isDisrupted ? '#ef4444' : typeMeta.color;

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: markerColor,
        fillOpacity: isDisrupted ? 0.95 : 0.85,
        color: isDisrupted ? '#ffffff' : '#0f172a',
        weight: 1.5
      });

      // Quick hover tooltip
      marker.bindTooltip(`<strong>${hub.display_name}</strong><br/><span style="color:#94a3b8">${typeMeta.label} · ${hub.country || ''}</span>`, {
        direction: 'top',
        opacity: 0.95
      });

      // Detailed click popup
      const supportedModes = (hub.modes || [])
        .map(m => `<span class="sc-popup-mode-tag">${m}</span>`)
        .join(' ');

      const popupContent = `
        <div class="sc-popup-card">
          <h4 class="sc-popup-title">${hub.display_name}</h4>
          <div class="sc-popup-badge-row">
            <span class="sc-popup-badge ${typeMeta.badgeClass}">${typeMeta.label}</span>
            <span style="color: #94a3b8; font-size: 0.7rem;">${hub.country || 'Global'} (${hub.id})</span>
          </div>
          ${isDisrupted ? `
            <div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; padding: 6px; border-radius: 4px; color: #fca5a5; font-size: 0.7rem; margin-top: 4px;">
              <strong>DISRUPTION ACTIVE</strong>: ${disruption.reason || 'Restricted corridor'}<br/>
              Delay: +${disruption.delayHours || 0}h · Threat: ${Math.round((disruption.threatLevel || 0) * 100)}%
            </div>
          ` : ''}
          <div style="margin-top: 6px; font-size: 0.7rem; color: #94a3b8;">
            <div>Modes:</div>
            <div class="sc-popup-modes">${supportedModes || 'Standard'}</div>
          </div>
          <div class="sc-popup-actions">
            <button class="sc-popup-btn" id="sc-btn-origin-${hub.id}">Set as Origin</button>
            <button class="sc-popup-btn" id="sc-btn-dest-${hub.id}">Set as Destination</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { minWidth: 220 });

      // Attach DOM event listeners when popup opens
      marker.on('popupopen', () => {
        const originBtn = document.getElementById(`sc-btn-origin-${hub.id}`);
        const destBtn = document.getElementById(`sc-btn-dest-${hub.id}`);

        if (originBtn && onSelectOrigin) {
          originBtn.onclick = () => {
            onSelectOrigin(hub);
            marker.closePopup();
          };
        }
        if (destBtn && onSelectDestination) {
          destBtn.onclick = () => {
            onSelectDestination(hub);
            marker.closePopup();
          };
        }
      });

      hubsLayerRef.current.addLayer(marker);
    }

    // Auto-fit bounds on initial hub load if no active route bounds exist
    if (!routeData?.bounds && validLatLngs.length > 0 && map) {
      try {
        const bounds = L.latLngBounds(validLatLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
      } catch (e) {
        console.warn('[LeafletMap] fitBounds error:', e);
      }
    }
  }, [hubs, activeDisruptions, showHubs, onSelectOrigin, onSelectDestination]);

  // 4. Render Active Route Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeLayerRef.current) return;

    routeLayerRef.current.clearLayers();

    if (!routeData) return;

    const { segments = [], transferPoints = [], bounds } = routeData;

    // A. Draw Transit Leg Polylines
    for (const seg of segments) {
      const { coords, mode, color, fromName, toName, eta, cost } = seg;
      if (!isValidCoordinate(coords[0][0], coords[0][1]) || !isValidCoordinate(coords[1][0], coords[1][1])) {
        continue;
      }

      // Outer glow line for visual pop in dark theme
      const glowLine = L.polyline(coords, {
        color: color || '#3b82f6',
        weight: 8,
        opacity: 0.35,
        interactive: false
      });
      routeLayerRef.current.addLayer(glowLine);

      // Core solid transit line
      const mainLine = L.polyline(coords, {
        color: color || '#3b82f6',
        weight: 4,
        opacity: 0.95,
        dashArray: mode === 'SEA' ? '6, 6' : mode === 'AIR' ? '8, 8' : null,
        interactive: true
      });

      mainLine.bindTooltip(`
        <strong>${mode} TRANSIT</strong><br/>
        ${fromName} &rarr; ${toName}<br/>
        ETA: ${eta}h · Cost: $${cost ? cost.toLocaleString() : 0}
      `, { sticky: true, opacity: 0.95 });

      mainLine.on('click', () => {
        if (onSelectLeg) onSelectLeg(seg);
      });

      routeLayerRef.current.addLayer(mainLine);
    }

    // B. Draw Transfer Points (Modal Handoffs)
    for (const tp of transferPoints) {
      const { coords, name, eta, cost } = tp;
      if (!isValidCoordinate(coords[0], coords[1])) continue;

      const transferMarker = L.circleMarker(coords, {
        radius: 9,
        fillColor: MODE_COLORS.TRANSFER,
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: 2,
        className: 'sc-transfer-pulse'
      });

      transferMarker.bindPopup(`
        <div class="sc-popup-card">
          <div style="font-weight: 800; color: #a855f7; font-size: 0.75rem;">STRATEGIC HANDOFF</div>
          <h4 class="sc-popup-title">${name}</h4>
          <div style="font-size: 0.7rem; color: #cbd5e1; margin-top: 4px;">
            Processing Time: +${eta}h<br/>
            Transfer Cost: $${cost ? cost.toLocaleString() : 0}
          </div>
        </div>
      `);

      transferMarker.on('click', () => {
        if (onSelectLeg) onSelectLeg({ ...tp, type: 'transfer' });
      });

      routeLayerRef.current.addLayer(transferMarker);
    }

    // Fit map view to active route bounds with comfortable padding
    if (bounds && map) {
      try {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 9 });
      } catch (e) {
        console.warn('[LeafletMap] Route fitBounds error:', e);
      }
    }
  }, [routeData, onSelectLeg]);

  // Loading / Error states
  if (initError) {
    return (
      <div className="sc-map-overlay-center">
        <div className="sc-map-error-card">
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#f87171' }}>Map Initialization Error</h3>
          <p>{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-map-main-wrapper">
      <div ref={mapContainerRef} className="sc-map-container" style={{ width: '100%', height: '100%', minHeight: '480px' }} />
    </div>
  );
}
