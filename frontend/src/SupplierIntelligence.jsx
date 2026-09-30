import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Clock, TrendingUp, Info, 
  BarChart3, Package, Truck, Database, Activity, CheckCircle2, ShieldAlert, Zap, Globe, RefreshCw, Navigation
} from 'lucide-react';

export default function SupplierIntelligence({ onNavigate }) {
  const [suppliers, setSuppliers] = useState([]);
  const [advice, setAdvice] = useState(null);
  const [inventory, setInventory] = useState(1000);
  const [safetyStock, setSafetyStock] = useState(1500);
  const [forecast, setForecast] = useState(800);
  const [category, setCategory] = useState('Electronics');
  const [scenario, setScenario] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await fetch('/api/scenarios');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setScenarios(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load scenarios in SupplierIntelligence:', e);
      }
    };
    fetchScenarios();
  }, []);

  useEffect(() => {
    fetchSourcingData();
  }, [category, scenario, inventory, safetyStock, forecast]);

  const fetchSourcingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          current_inventory: typeof inventory === 'number' && !isNaN(inventory) ? inventory : 1000,
          safety_stock: typeof safetyStock === 'number' && !isNaN(safetyStock) ? safetyStock : 1500,
          demand_forecast: typeof forecast === 'number' && !isNaN(forecast) ? forecast : 800,
          scenario: scenario || null
        })
      });
      if (!res.ok) {
        throw new Error(`Engine returned HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
      setAdvice(data.advice || null);
    } catch (e) {
      console.error('Failed to fetch sourcing data:', e);
      setError(e.message || 'Unable to connect to supplier intelligence engine.');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNumericInput = (setter) => (e) => {
    const val = parseInt(e.target.value, 10);
    setter(isNaN(val) ? 0 : val);
  };

  return (
    <div className="sc-layout animate-fade-in">
      <div className="sc-header">
        <div className="sc-title-group">
          <h2>
            <Database color="#8b5cf6" />
            Supplier Intelligence
          </h2>
          <p className="sc-subtitle">Strategic Sourcing Decision Matrix · Real Backend Provenance</p>
        </div>
        <div style={{display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <button 
            className="sc-badge-active" 
            style={{cursor: 'pointer', borderColor: '#3b82f6', color: '#3b82f6'}} 
            onClick={() => onNavigate('network')}
            title="Open Interactive Global Network Map"
          >
            <Globe size={14} /> Global Network Map
          </button>
          <button 
            className="sc-badge-active" 
            style={{cursor: 'pointer', borderColor: '#0284c7', color: '#38bdf8'}} 
            onClick={() => onNavigate('map-routing')}
            title="Open Interactive Multimodal Route Visualizer"
          >
            <Navigation size={14} /> Route Visualizer
          </button>
          <button 
            className="sc-badge-active" 
            style={{cursor: 'pointer', borderColor: '#10b981', color: '#10b981'}} 
            onClick={() => onNavigate('benchmark')}
            title="Open Scientific Decision Benchmarks"
          >
            <BarChart3 size={14} /> Benchmarks
          </button>
          <button 
            className="sc-badge-active" 
            style={{cursor: 'pointer', borderColor: 'var(--border-slate)', color: 'var(--text-main)'}} 
            onClick={() => onNavigate('recommend')}
            title="Return to Route Optimization Console"
          >
            Command Console
          </button>
        </div>
      </div>

      <div className="sc-command-panel">
        <div className="sc-input-group">
          <label className="sc-label">Product Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="sc-select">
            <option value="Electronics">Electronics (4 Suppliers)</option>
            <option value="Raw Materials">Raw Materials (2 Suppliers)</option>
            <option value="Chemicals">Chemicals (1 Supplier)</option>
          </select>
        </div>

        <div className="sc-input-group">
          <label className="sc-label">Inventory & Safety Target (Units)</label>
          <div className="sc-select-grid">
            <input 
              type="number" 
              value={inventory} 
              onChange={handleNumericInput(setInventory)} 
              className="sc-input" 
              style={{paddingLeft: '1rem'}} 
              placeholder="Inventory" 
            />
            <input 
              type="number" 
              value={safetyStock} 
              onChange={handleNumericInput(setSafetyStock)} 
              className="sc-input" 
              style={{paddingLeft: '1rem'}} 
              placeholder="Safety Target" 
            />
          </div>
        </div>

        <div className="sc-input-group">
          <label className="sc-label">Global Disruption Scenario</label>
          <select 
            value={scenario || ''} 
            onChange={e => setScenario(e.target.value || null)} 
            className="sc-select"
            style={{ borderColor: scenario ? '#ef4444' : '#1e293b' }}
          >
            <option value="">Operational Normal</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444', 
          borderRadius: '8px', 
          padding: '0.75rem 1.25rem', 
          color: '#ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '1rem'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button 
            onClick={fetchSourcingData} 
            style={{
              marginLeft: 'auto', 
              background: '#ef4444', 
              border: 'none', 
              color: 'white', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="sc-results-grid" style={{gridTemplateColumns: '1fr 2fr'}}>
        {/* Advice Card */}
        {advice ? (
          <div className="sc-path-card" style={{borderColor: advice.urgency_level === 'CRITICAL' ? '#ef4444' : '#8b5cf6'}}>
            <div className="sc-card-header" style={{background: advice.urgency_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: advice.urgency_level === 'CRITICAL' ? '#ef4444' : '#8b5cf6'}}>
                <ShieldAlert size={20} />
                <span style={{fontWeight: 800, fontSize: '12px'}}>{advice.urgency_level} STATUS</span>
              </div>
            </div>
            <div className="sc-card-body">
              <h3 style={{fontSize: '18px', fontWeight: 800, marginBottom: '1rem'}}>{advice.recommendation}</h3>
              <p style={{fontSize: '14px', color: '#94a3b8', lineHeight: 1.6}}>
                Status: {advice.status.replace(/_/g, ' ')} · Projected inventory: {advice.projected_inventory} units
                {advice.shortage_quantity > 0 && ` · Shortfall vs. safety stock: ${advice.shortage_quantity} units`}
              </p>
              {scenario && (
                <div style={{
                  marginTop: '1rem', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '6px', 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  fontSize: '0.75rem'
                }}>
                  <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Active Disruption <strong>{scenario}</strong> factored into supplier lead times & stability indices.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="sc-path-card" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', color: '#64748b'}}>
            {loading ? <RefreshCw className="animate-spin" size={24} color="#8b5cf6" /> : 'Awaiting procurement calculation...'}
          </div>
        )}

        {/* Suppliers Table */}
        <div className="sc-path-card">
          <div className="sc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{fontSize: '14px', fontWeight: 700}}>Qualified Global Suppliers</h3>
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#a855f7', 
              background: 'rgba(168, 85, 247, 0.15)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              fontFamily: 'JetBrains Mono'
            }}>
              {suppliers.length} active in {category}
            </span>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #1e293b', textAlign: 'left'}}>
                  <th style={{padding: '16px', color: '#94a3b8'}}>Supplier</th>
                  <th style={{padding: '16px', color: '#94a3b8'}}>Unit Cost</th>
                  <th style={{padding: '16px', color: '#94a3b8'}}>Effective Lead Time</th>
                  <th style={{padding: '16px', color: '#94a3b8'}}>Decision Score</th>
                  <th style={{padding: '16px', color: '#94a3b8'}}>Disruption Risk</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" style={{padding: '36px', textAlign: 'center', color: '#94a3b8'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                        <RefreshCw className="animate-spin" size={16} color="#8b5cf6" />
                        <span>Querying deterministic ranking engine for {category}...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{padding: '36px', textAlign: 'center', color: '#64748b'}}>
                      No qualified suppliers available for {category}.
                    </td>
                  </tr>
                )}

                {!loading && suppliers.map(s => {
                  // decision_score (0-1) is the backend ranking metric.
                  // Derive risk score inverse (0-100%).
                  const riskPct = Math.round((1 - (s.decision_score || 0)) * 100);
                  const stabilityPct = s.audit_trace?.effective_metrics?.stability_index || Math.round((s.historical_reliability || 0) * 100);

                  return (
                    <tr key={s.id} style={{borderBottom: '1px solid #0f172a'}}>
                      <td style={{padding: '16px'}}>
                        <div style={{fontWeight: 700, color: '#f8fafc'}}>{s.name}</div>
                        <div style={{fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px'}}>
                          <span style={{ color: '#38bdf8' }}>{s.location_hub}</span>
                          <span>·</span>
                          <span>Rank #{s.rank || 1}</span>
                        </div>
                      </td>
                      <td style={{padding: '16px', fontFamily: 'JetBrains Mono', color: '#10b981'}}>
                        ${s.unit_cost?.toLocaleString() || '--'}
                      </td>
                      <td style={{padding: '16px', fontFamily: 'JetBrains Mono'}}>
                        <span style={{ color: s.effective_lead_time > s.base_lead_time_days ? '#ef4444' : '#f8fafc' }}>
                          {s.effective_lead_time} days
                        </span>
                        {s.effective_lead_time > s.base_lead_time_days && (
                          <div style={{ fontSize: '10px', color: '#ef4444' }}>
                            (+{(s.effective_lead_time - s.base_lead_time_days).toFixed(1)}d delay)
                          </div>
                        )}
                      </td>
                      <td style={{padding: '16px'}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{height: '6px', width: '70px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden'}}>
                            <div style={{height: '100%', width: `${Math.round((s.decision_score || 0) * 100)}%`, background: '#3b82f6'}}></div>
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#94a3b8' }}>
                            {s.decision_score}
                          </span>
                        </div>
                      </td>
                      <td style={{padding: '16px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: riskPct > 35 ? '#ef4444' : '#10b981'}}>
                          <Activity size={14} /> {riskPct}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Stability: {stabilityPct}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
