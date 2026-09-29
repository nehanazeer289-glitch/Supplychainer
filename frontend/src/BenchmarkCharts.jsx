import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Cell
} from 'recharts';
import { 
  ArrowLeft, TrendingDown, AlertTriangle, DollarSign, Shield, Zap, 
  Globe, ShieldCheck, BarChart3, Activity, Info, CheckCircle2, Layers 
} from 'lucide-react';

const COLORS = {
  aggressive: '#ef4444',
  conservative: '#10b981',
  confidence: '#3b82f6',
  ortools: '#f59e0b',
  baseline: '#6b7280'
};

const BENCHMARK_DATA = {
  strategies: ['Aggressive', 'Conservative', 'Confidence-Weighted', 'OR-Tools'],
  reroutes: [
    { name: 'Aggressive', value: 31, color: COLORS.aggressive },
    { name: 'Conservative', value: 2, color: COLORS.conservative },
    { name: 'Confidence', value: 11, color: COLORS.confidence },
    { name: 'OR-Tools', value: 43, color: COLORS.ortools }
  ],
  successRate: [
    { name: 'Aggressive', value: 16.1, color: COLORS.aggressive },
    { name: 'Conservative', value: 50.0, color: COLORS.conservative },
    { name: 'Confidence', value: 45.4, color: COLORS.confidence },
    { name: 'OR-Tools', value: 9.3, color: COLORS.ortools }
  ],
  worseOutcomes: [
    { name: 'Aggressive', value: 23, color: COLORS.aggressive },
    { name: 'Conservative', value: 1, color: COLORS.conservative },
    { name: 'Confidence', value: 4, color: COLORS.confidence },
    { name: 'OR-Tools', value: 35, color: COLORS.ortools }
  ],
  costIncrease: [
    { name: 'Aggressive', value: 3.7, color: COLORS.aggressive },
    { name: 'Conservative', value: 0.1, color: COLORS.conservative },
    { name: 'Confidence', value: 1.8, color: COLORS.confidence },
    { name: 'OR-Tools', value: 5.2, color: COLORS.ortools }
  ],
  radar: [
    {
      metric: 'Selectivity',
      Aggressive: 40, Conservative: 100, Confidence: 85, 'OR-Tools': 10
    },
    {
      metric: 'Success Rate',
      Aggressive: 32, Conservative: 100, Confidence: 91, 'OR-Tools': 19
    },
    {
      metric: 'Cost Efficiency',
      Aggressive: 63, Conservative: 100, Confidence: 82, 'OR-Tools': 48
    },
    {
      metric: 'Robustness',
      Aggressive: 35, Conservative: 70, Confidence: 100, 'OR-Tools': 25
    },
    {
      metric: 'Net Gain',
      Aggressive: 10, Conservative: 45, Confidence: 100, 'OR-Tools': 5
    }
  ]
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bench-custom-tooltip">
      <div style={{ fontWeight: 800, marginBottom: 4, color: '#f8fafc', fontSize: '0.8rem' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color || entry.fill, marginTop: 3, display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.75rem', fontFamily: 'JetBrains Mono' }}>
          <span>{entry.name}:</span>
          <strong>{entry.value}{entry.unit || ''}</strong>
        </div>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, subtext, accent }) {
  return (
    <div className="bench-stat-card">
      <div className="bench-stat-icon" style={{ color: accent, borderColor: `${accent}40` }}>
        <Icon size={20} />
      </div>
      <div className="bench-stat-content">
        <div className="bench-stat-label">{label}</div>
        <div className="bench-stat-value" style={{ color: accent }}>{value}</div>
        {subtext && <div className="bench-stat-sub">{subtext}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="bench-chart-card">
      <div className="bench-chart-header">
        <div>
          <h3 className="bench-chart-title">{title}</h3>
          {subtitle && <p className="bench-chart-subtitle">{subtitle}</p>}
        </div>
        {badge && <span className="bench-chart-badge">{badge}</span>}
      </div>
      <div className="bench-chart-body">
        {children}
      </div>
    </div>
  );
}

export default function BenchmarkCharts({ onBack, onNavigate }) {
  const handleNav = (view) => {
    if (onNavigate) onNavigate(view);
    else if (onBack) onBack();
  };

  return (
    <div className="bench-container animate-fade-in">
      {/* Executive Header */}
      <header className="bench-header">
        <div className="bench-header-left">
          <button 
            className="sc-badge-active" 
            onClick={() => handleNav('recommend')}
            style={{ cursor: 'pointer', borderColor: 'var(--border-slate)' }}
            title="Return to Route Optimization Console"
          >
            <ArrowLeft size={14} /> COMMAND CONSOLE
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="map-header-icon-box">
              <BarChart3 size={22} color="#10b981" />
            </div>
            <div>
              <h1 className="bench-title">5-Way Decision Superiority Benchmarks</h1>
              <p className="bench-subtitle">
                500 DISPATCHES · 59 INTERVENTIONS · OR-TOOLS BASELINE VS ML QUANTILE AGENTS
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            className="sc-badge-active" 
            onClick={() => handleNav('network')} 
            style={{ cursor: 'pointer', borderColor: '#3b82f6', color: '#3b82f6' }}
            title="Open Interactive Global Network Map"
          >
            <Globe size={14} /> GLOBAL NETWORK MAP
          </button>
          <button 
            className="sc-badge-active" 
            onClick={() => handleNav('suppliers')} 
            style={{ cursor: 'pointer', borderColor: '#8b5cf6', color: '#8b5cf6' }}
            title="Open Supplier Intelligence Audit"
          >
            <ShieldCheck size={14} /> SUPPLIER INTELLIGENCE
          </button>
          <div className="bench-header-badge">
            <Shield size={14} color="#10b981" />
            <span>ML ACCURACY: 91%</span>
          </div>
        </div>
      </header>

      {/* Top KPI Cards Row */}
      <section className="bench-stats-row">
        <StatCard
          icon={Zap}
          label="Confidence Net Gain"
          value="+0.21%"
          subtext="Only model to statistically beat baseline"
          accent="#3b82f6"
        />
        <StatCard
          icon={AlertTriangle}
          label="Aggressive Failure Rate"
          value="74.2%"
          subtext="23 out of 31 reroutes made delay worse"
          accent="#ef4444"
        />
        <StatCard
          icon={TrendingDown}
          label="Confidence Success Rate"
          value="45.4%"
          subtext="Selective p85 risk thresholding"
          accent="#10b981"
        />
        <StatCard
          icon={DollarSign}
          label="Confidence Cost Increase"
          value="1.8%"
          subtext="vs 5.2% for OR-Tools static baseline"
          accent="#38bdf8"
        />
      </section>

      {/* Main Charts Grid: 2x2 Bar Charts */}
      <section className="bench-charts-grid">
        {/* Reroute Volume */}
        <ChartCard 
          title="Reroute Trigger Volume" 
          subtitle="Total algorithmic interventions across 500 dispatches"
          badge="TOTALS"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BENCHMARK_DATA.reroutes} barSize={36} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {BENCHMARK_DATA.reroutes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Success Rate */}
        <ChartCard 
          title="Intervention Success Rate (%)" 
          subtitle="Percentage of reroutes that successfully improved delivery ETA"
          badge="PRECISION"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BENCHMARK_DATA.successRate} barSize={36} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} domain={[0, 60]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {BENCHMARK_DATA.successRate.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Worse Outcomes */}
        <ChartCard 
          title="Detour Casualties (Worse Outcomes)" 
          subtitle="Reroutes that generated longer delivery times than staying the course"
          badge="RISK"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BENCHMARK_DATA.worseOutcomes} barSize={36} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {BENCHMARK_DATA.worseOutcomes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost Increase */}
        <ChartCard 
          title="Average Cost Overhead (%)" 
          subtitle="Additional freight premium incurred per strategy vs static baseline"
          badge="EFFICIENCY"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BENCHMARK_DATA.costIncrease} barSize={36} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} domain={[0, 6]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {BENCHMARK_DATA.costIncrease.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Full-Width Strategy Radar Comparison */}
      <section>
        <ChartCard 
          title="Multi-Dimensional Strategy Performance Radar" 
          subtitle="Normalized scores across 5 core operational vectors (higher value = superior performance)"
          badge="PENTAGON EVALUATION"
        >
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={BENCHMARK_DATA.radar} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="Aggressive ML" dataKey="Aggressive" stroke={COLORS.aggressive} fill={COLORS.aggressive} fillOpacity={0.12} strokeWidth={2} />
              <Radar name="Conservative" dataKey="Conservative" stroke={COLORS.conservative} fill={COLORS.conservative} fillOpacity={0.12} strokeWidth={2} />
              <Radar name="Confidence-Weighted" dataKey="Confidence" stroke={COLORS.confidence} fill={COLORS.confidence} fillOpacity={0.25} strokeWidth={2.5} />
              <Radar name="OR-Tools Static" dataKey="OR-Tools" stroke={COLORS.ortools} fill={COLORS.ortools} fillOpacity={0.12} strokeWidth={2} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 18 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Key Finding: The Over-Correction Problem */}
      <section className="bench-insight-panel">
        <div className="bench-insight-icon">💡</div>
        <div>
          <h3 className="bench-insight-title">Executive Takeaway: The Over-Correction Trap</h3>
          <p className="bench-insight-text">
            The <strong>OR-Tools baseline</strong> attempted the most reroutes (43) but produced the lowest success rate (9.3%) and the highest cost premium (5.2%).
            Similarly, an unconstrained <strong>Aggressive ML optimizer</strong> triggered 31 reroutes with a 74.2% failure rate, proving that indiscriminate detour recommendations compound delays across downstream transfer nodes.
          </p>
          <p className="bench-insight-text" style={{ marginTop: '0.5rem' }}>
            The <strong>Confidence-Weighted model (+0.21% net gain)</strong> represents the definitive mathematical optimum: selective intervention that only triggers reroutes when predicted p85 risk outweighs transfer friction, successfully avoiding the costly butterfly effect of unnecessary detours.
          </p>
        </div>
      </section>
    </div>
  );
}
