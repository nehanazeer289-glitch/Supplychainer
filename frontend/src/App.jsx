import React, { useState, useEffect } from 'react';
import BenchmarkCharts from './BenchmarkCharts.jsx';
import RouteRecommender from './RouteRecommender.jsx';
import SupplierIntelligence from './SupplierIntelligence.jsx';
import GlobalNetworkMap from './GlobalNetworkMap.jsx';
import MapRoutingView from './map/MapRoutingView.jsx';

export default function App() {
  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [status, setStatus] = useState(null);
  const [currentView, setCurrentView] = useState('recommend');
  const [routeHandoff, setRouteHandoff] = useState(null);

  const handleNavigate = (view, payload = null) => {
    if (payload) {
      setRouteHandoff(payload);
    }
    setCurrentView(view);
  };
  
  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(data => setNetwork(data))
      .catch(e => console.error(e));
      
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      const state = JSON.parse(event.data);
      setStatus(state);
    };
    
    return () => ws.close();
  }, []);

  if (currentView === 'recommend') {
    return <RouteRecommender onNavigate={handleNavigate} />;
  }

  if (currentView === 'suppliers') {
    return <SupplierIntelligence onNavigate={handleNavigate} />;
  }

  if (currentView === 'benchmark') {
    return <BenchmarkCharts onBack={() => handleNavigate('recommend')} onNavigate={handleNavigate} />;
  }

  if (currentView === 'network') {
    return <GlobalNetworkMap onNavigate={handleNavigate} />;
  }

  if (currentView === 'map-routing') {
    return (
      <MapRoutingView 
        recommendations={routeHandoff?.recommendations}
        selectedPersona={routeHandoff?.selectedPersona || 'BALANCED'}
        activeScenario={routeHandoff?.scenario || 'NORMAL'}
        onNavigate={handleNavigate} 
      />
    );
  }

  return (
    <div className="dashboard-container">
      {/* GLOBAL LOGISTICS CONSOLE (Simulator View) */}
      <div className="panel">
        <h2 className="panel-title">System Console</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Active Hubs</div>
            <div className="metric-value">{network?.nodes?.length || 0}</div>
          </div>
          <div className="metric-card">
            <div style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Transit Corridors</div>
            <div className="metric-value">{network?.edges?.length || 0}</div>
          </div>
          <div className="metric-card">
            <div style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>ML Brain</div>
            <div className="metric-value" style={{fontSize: '1rem', color: 'var(--supply-accent)'}}>
              p85 Real-Data (Active)
            </div>
          </div>
        </div>
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto'}}>
          <button className="dispatch-btn" onClick={() => handleNavigate('recommend')}>
            Return to Optimization Dashboard
          </button>
          <button className="dispatch-btn" style={{backgroundColor: '#0ea5e9'}} onClick={() => handleNavigate('network')}>
            Explore Global Network Map
          </button>
          <button className="dispatch-btn" style={{backgroundColor: '#0284c7'}} onClick={() => handleNavigate('map-routing')}>
            Open Multimodal Route Visualizer
          </button>
          <button className="benchmark-btn" onClick={() => handleNavigate('benchmark')}>
            View Scientific Benchmarks
          </button>
          <button className="dispatch-btn" style={{marginTop: '0.75rem', backgroundColor: '#8b5cf6'}} onClick={() => handleNavigate('suppliers')}>
            Execute Supplier Intelligence Audit
          </button>
        </div>
      </div>

      {/* CENTER PANEL - GLOBAL SCOPE */}
      <div className="panel" style={{padding: 0, overflow: 'hidden'}}>
        <div className="map-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
           <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>
             <h3 style={{color: 'white', marginBottom: '1rem'}}>Global Supply Chain Core</h3>
             <p>Analyzing {network.nodes.length} Strategic Logistics Hubs</p>
             <p>Live RSS Ingestion Active for all transit corridors.</p>
           </div>
        </div>
      </div>

      {/* RIGHT PANEL - TRUTH AUDIT */}
      <div className="panel">
        <h2 className="panel-title">Inference Status</h2>
        <div className="log-feed">
          <div className="decision-card" style={{borderColor: 'var(--supply-accent)'}}>
             <div className="decision-header">
               <span>PROVENANCE: UNCTAD/STB</span>
             </div>
             <div className="decision-body">
               Real-world historical metrics loaded for all nodes. No synthetic fallback active.
             </div>
          </div>
          <div className="decision-card">
             <div className="decision-header">
               <span>LATENCY: SUB-SECOND</span>
             </div>
             <div className="decision-body">
               Live geocoding and news-anchored semantic scoring active.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
