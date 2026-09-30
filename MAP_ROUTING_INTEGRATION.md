# Supplychainer Map Routing Component — Integration Guide

> **Branch:** `map-routing`  
> **Status:** Completely Isolated Module (Zero Breaking Changes to Shared Files)  
> **Dependencies Added to `package.json`:** **None (0)** — Uses dynamic CDN loader for Leaflet.

---

## 1. Files Created

All map-routing logic is quarantined inside `frontend/src/map/` and this documentation file:

```
Supplychainer/
├── MAP_ROUTING_INTEGRATION.md            # This integration documentation
└── frontend/src/map/
    ├── MapRoutingView.jsx                # Master standalone Map Routing View
    ├── LeafletMap.jsx                    # CDN-loaded Leaflet map & layer manager
    ├── mapDataService.js                 # API fetching, hub spatial indexing & coordinate transformations
    └── mapRouting.css                    # Scoped dark executive CSS styles
```

**Untouched Files (0 Merge Conflicts Guarantee):**
- `backend/main.py` (Unchanged)
- `backend/engine/*` (Unchanged)
- `frontend/App.jsx` (Unchanged)
- `frontend/RouteRecommender.jsx` (Unchanged)
- `frontend/package.json` (Unchanged)
- `frontend/package-lock.json` (Unchanged)
- `frontend/index.css` (Unchanged)

---

## 2. Capabilities & Features

1. **Zero-NPM Leaflet Engine**:
   - Injects Leaflet JS & CSS dynamically from `unpkg.com` at runtime.
   - Guarded against duplicate injections, hot-reload multi-instances, and memory leaks.
   - Cleans up Leaflet map instance on component unmount.
2. **Geospatial Hub Registry**:
   - Fetches and maps all 300+ canonical hubs from `/api/hubs`.
   - Distinct color-coded visual markers for:
     - ✈ **Airport** (`#38bdf8`)
     - ⚓ **Seaport** (`#0284c7`)
     - 🚆 **Rail Terminal** (`#f59e0b`)
     - 🏢 **Distribution Hub** (`#10b981`)
     - ⚠ **Strategic Chokepoint** (`#ef4444`)
   - Interactive popups with supported modes and quick origin/destination selection.
3. **Background Corridor Grid**:
   - Renders actual canonical network connections extracted directly from `hub.connections`.
   - Mode-differentiated line dash arrays (Air, Sea, Rail, Road).
4. **Multimodal Route Visualization**:
   - Converts multi-leg recommendations from `/api/recommend` into geographic polylines and transfer points.
   - Distinct visual line styles:
     - **Air**: Cyan dashed line
     - **Sea**: Deep blue wide dashed corridor
     - **Rail**: Amber solid/dashed line
     - **Road**: Emerald solid transit line
     - **Transfer**: Glowing purple modal handoff waypoint
   - Hover and click inspection showing mode, ETA, landed cost, and threat provenance.
5. **Threat & Scenario Intelligence**:
   - Pulls active disruptions from `/api/scenarios`.
   - Overlays pulsating threat warning halos over disrupted hubs and chokepoints (e.g. Suez, Red Sea, Port of LA).
6. **Graceful Fallbacks**:
   - Missing/malformed coordinates are automatically skipped without crashing the view.
   - Network or CDN failure produces informative dark-themed error cards.

---

## 3. Required Backend Endpoints

The component relies exclusively on existing backend endpoints without any backend changes:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/hubs` | `GET` | Fetches full canonical hub list with `lat`, `lon`, and `connections`. |
| `/api/scenarios` | `GET` | Fetches disruption scenarios and affected nodes. |
| `/api/recommend` | `POST` | Calculates multimodal routes (used in standalone mode). |

---

## 4. Teammate Import & Quick Start

A teammate on the `frontend` branch can import the component with a single import statement:

```javascript
import MapRoutingView from './map/MapRoutingView.jsx';
```

---

## 5. Usage Modes

### Mode A: Standalone View (Zero Configuration)
`MapRoutingView` can render with zero props. It will automatically fetch hubs, scenarios, and provide its own origin/destination/scenario selector toolbar to query `/api/recommend`:

```jsx
import React from 'react';
import MapRoutingView from './map/MapRoutingView.jsx';

export default function MyDashboard() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapRoutingView />
    </div>
  );
}
```

---

### Mode B: Controlled Mode (Driven by External Recommendations)
When embedding alongside `RouteRecommender.jsx` or a central state store, pass the recommendation data directly:

```jsx
import React, { useState } from 'react';
import MapRoutingView from './map/MapRoutingView.jsx';

export default function RecommenderWithMap() {
  const [recommendations, setRecommendations] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('BALANCED');
  const [activeScenario, setActiveScenario] = useState('SUEZ_BLOCK');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', height: '100vh' }}>
      {/* Existing command sidebar or recommendation cards */}
      <aside>...</aside>

      {/* Interactive Map */}
      <MapRoutingView 
        recommendations={recommendations}
        selectedPersona={selectedPersona}
        activeScenario={activeScenario}
      />
    </div>
  );
}
```

---

## 6. Route Recommendation Prop Schema

The component expects standard `recommendations` output from `/api/recommend`:

```json
[
  {
    "persona": "FASTEST",
    "adjusted_eta": 42.5,
    "total_cost": 8450.0,
    "threat_level": 0.05,
    "explanation": "Velocity-optimized. Mode handoffs applied...",
    "legs": [
      {
        "from": "HUB-SFO",
        "to": "AIR-SFO",
        "to_name": "San Francisco International Airport",
        "mode": "ROAD",
        "type": "transit",
        "eta": 0.5,
        "cost": 45.0
      },
      {
        "from": "AIR-SFO",
        "to": "AIR-SFO",
        "to_name": "San Francisco International Airport",
        "mode": "TRANSFER",
        "type": "transfer",
        "eta": 6.0,
        "cost": 150.0
      },
      {
        "from": "AIR-SFO",
        "to": "AIR-CHANGI",
        "to_name": "Singapore Changi Airport",
        "mode": "AIR",
        "type": "transit",
        "eta": 16.2,
        "cost": 7500.0
      }
    ]
  }
]
```

---

## 7. How to Mount in `App.jsx` Later

When the team is ready to merge `map-routing` into `main`, teammates can integrate the map in either of two straightforward ways:

### Option 1: As a Dedicated View in `App.jsx`
In `App.jsx`:
```jsx
// 1. Add import
import MapRoutingView from './map/MapRoutingView.jsx';

// 2. Add navigation option
// In view switcher:
if (currentView === 'map') {
  return <MapRoutingView onNavigate={setCurrentView} />;
}
```

### Option 2: Replacing the Placeholder in `App.jsx` Simulator View
Replace lines 76–84 of `App.jsx`:
```jsx
{/* BEFORE (Placeholder): */}
<div className="panel" style={{padding: 0, overflow: 'hidden'}}>
  <div className="map-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>
      <h3 style={{color: 'white', marginBottom: '1rem'}}>Global Supply Chain Core</h3>
      <p>Analyzing {network.nodes.length} Strategic Logistics Hubs</p>
      <p>Live RSS Ingestion Active for all transit corridors.</p>
    </div>
  </div>
</div>

{/* AFTER: */}
<div className="panel" style={{padding: 0, overflow: 'hidden', height: '100%', minHeight: '500px'}}>
  <MapRoutingView />
</div>
```
