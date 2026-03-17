import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import { TrendingUp, Calendar, AlertCircle, Download, Activity, Target, ShieldCheck, Github, ExternalLink, RefreshCw, Book, Info, Cpu, Zap } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const App = () => {
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [customPrediction, setCustomPrediction] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('SARIMAX');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hist, fore, metr] = await Promise.all([
          axios.get(`${API_BASE}/historical-data`),
          axios.get(`${API_BASE}/forecast?model=${selectedModel}`),
          axios.get(`${API_BASE}/metrics`)
        ]);
        setHistoricalData(hist.data);
        setForecastData(fore.data);
        setMetrics(metr.data);
        if (fore.data.length > 0) {
          setSelectedForecast(fore.data[0]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedModel]);

  const fetchCustomPrediction = async () => {
    if (!customDate) return;
    setCustomLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/predict-date?target_date=${customDate}&model_name=${selectedModel}`);
      setCustomPrediction(res.data);
    } catch (err) {
      console.error("Error fetching custom prediction:", err);
    } finally {
      setCustomLoading(false);
    }
  };

  const downloadCSV = () => {
    const data = view === 'dashboard' ? historicalData : forecastData;
    if (!data || data.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aurea_${view}_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMetric = (name) => metrics.find(m => m.metric_name === `${name}_MAPE`)?.metric_value;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card" style={{ padding: '0.75rem', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
    </div>
  );

  return (
    <div className="app-shell animate-fade">
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Activity color="var(--primary)" size={32} />
            <h1 className="dashboard-title">Aurea Forecast</h1>
          </div>
          <p className="dashboard-subtitle">Advanced Gold Market (XAUUSD) Intelligence & Predictive Engine</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.8rem', background: 'rgba(74, 222, 128, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
              <ShieldCheck size={14} /> LIVE Market Data
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
              <Target size={14} /> SARIMAX Optimized
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-icon" onClick={() => window.open('https://github.com', '_blank')}>
            <Github size={20} />
          </button>
          <button className="btn-primary" onClick={downloadCSV}>
            <Download size={20} /> Export Dataset
          </button>
        </div>
      </header>

      <div className="nav-tab-group">
        <button className={`nav-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          Market Dashboard
        </button>
        <button className={`nav-tab ${view === 'forecast' ? 'active' : ''}`} onClick={() => setView('forecast')}>
          Forecast Engine
        </button>
        <button className={`nav-tab ${view === 'guide' ? 'active' : ''}`} onClick={() => setView('guide')}>
          Platform Guide
        </button>
      </div>

      {view === 'dashboard' ? (
        <div className="animate-fade">
          <div className="metric-grid">
            <div className="glass-card">
              <span className="metric-label"><Activity size={16} /> Latest Price</span>
              <div className="metric-value-large">${historicalData[historicalData.length - 1]?.close.toFixed(2)}</div>
              <div style={{ color: 'var(--success)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                ↑ Market Stability High
              </div>
            </div>
            <div className="glass-card">
              <span className="metric-label"><Calendar size={16} /> Analytics Period</span>
              <div className="metric-value-large" style={{ fontSize: '1.5rem' }}>5 Years Historical</div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Yahoo Finance Feed</p>
            </div>
            <div className="glass-card">
              <span className="metric-label"><ShieldCheck size={16} /> Data Integrity</span>
              <div className="metric-value-large" style={{ color: 'var(--success)', fontSize: '1.5rem' }}>100% Validated</div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem' }}>BigQuery Pipeline</p>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2><TrendingUp inline size={24} color="var(--primary)" style={{ marginRight: '0.5rem' }} /> XAUUSD Historical Performance</h2>
              <select style={{ background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem 1rem' }}>
                <option>All History (5Y)</option>
              </select>
            </div>
            <div className="chart-container" style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-dim)" 
                    fontSize={12}
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { year: '2-digit', month: 'short' })} 
                    minTickGap={30}
                  />
                  <YAxis stroke="var(--text-dim)" fontSize={12} domain={['auto', 'auto']} tickFormatter={(val) => `$${val}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="close" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : view === 'forecast' ? (
        <div className="animate-fade">
          {/* ... existing forecast view content ... */}
          <div className="metric-grid">
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <span className="metric-label"><Target size={16} /> Model Reliability</span>
              <div className="metric-value-large">{selectedModel === 'SARIMAX' ? getMetric('SARIMAX')?.toFixed(2) : getMetric('Prophet')?.toFixed(2)}% <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>MAPE</span></div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {selectedModel} optimized for drift.
              </p>
            </div>

            <div className="glass-card" style={{ border: '2px solid var(--accent)' }}>
              <span className="metric-label"><Calendar size={16} /> Temporal Projection</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="date" 
                  value={customDate} 
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" onClick={fetchCustomPrediction} disabled={customLoading} style={{ padding: '0 1.25rem' }}>
                  {customLoading ? '...' : <ExternalLink size={20} />}
                </button>
              </div>
              {customPrediction && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '1rem' }}>
                  {customPrediction.error ? (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{customPrediction.error}</div>
                  ) : (
                    <>
                      <div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.5rem' }}>
                        ${customPrediction.prediction?.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Conf. Range: ${customPrediction.lower_bound?.toFixed(2)} - ${customPrediction.upper_bound?.toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ border: '2px solid var(--primary)' }}>
              <span className="metric-label"><Activity size={16} /> Selected Target</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <div className="metric-value-large">${(selectedForecast?.forecast_value || 0).toFixed(2)}</div>
                {forecastData.length > 0 && selectedForecast?.forecast_value && (
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 'bold',
                    color: selectedForecast.forecast_value >= forecastData[0].forecast_value ? 'var(--success)' : 'var(--danger)' 
                  }}>
                    {selectedForecast.forecast_value >= forecastData[0].forecast_value ? '↑' : '↓'}
                    {Math.abs(((selectedForecast.forecast_value - forecastData[0].forecast_value) / forecastData[0].forecast_value) * 100).toFixed(2)}%
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>On {new Date(selectedForecast?.forecast_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>Predictive Surface (1-Year Outlook)</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Shaded area representing 95% confidence interval</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-glass)', padding: '0.3rem', borderRadius: '1rem' }}>
                <button className={`nav-tab ${selectedModel === 'SARIMAX' ? 'active' : ''}`} onClick={() => setSelectedModel('SARIMAX')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>SARIMAX</button>
                <button className={`nav-tab ${selectedModel === 'Prophet' ? 'active' : ''}`} onClick={() => setSelectedModel('Prophet')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Prophet</button>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={forecastData} 
                  onClick={(e) => e?.activePayload && setSelectedForecast(e.activePayload[0].payload)}
                >
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="forecast_date" stroke="var(--text-dim)" fontSize={12} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })} minTickGap={40} />
                  <YAxis stroke="var(--text-dim)" fontSize={12} domain={['auto', 'auto']} tickFormatter={(val) => `$${val}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="upper_bound" stroke="none" fill="var(--accent)" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="lower_bound" stroke="none" fill="var(--accent)" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="forecast_value" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" />
                  {selectedForecast && (
                    <ReferenceLine x={selectedForecast.forecast_date} stroke="var(--primary)" strokeDasharray="3 3" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade" style={{ display: 'grid', gap: '2rem' }}>
          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '1rem' }}>
                <Info color="var(--primary)" size={32} />
              </div>
              <h2>About Aurea Platform</h2>
            </div>
            <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
              Aurea is an elite financial intelligence engine designed to decipher Gold market (XAUUSD) volatility. 
              By merging five years of historical data with high-dimension time-series models, we provide institutional-grade 
              forecasting for retail and professional traders alike.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-glass)', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '1rem' }}><Cpu size={20} /> Optimized SARIMAX</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Captures long-term drift and seasonal patterns using auto-regressive moving averages enhanced with linear trend components.</p>
              </div>
              <div style={{ padding: '1.5rem', background: 'var(--bg-glass)', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', marginBottom: '1rem' }}><Zap size={20} /> Meta Prophet</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>A robust additive model forecasting non-linear trends with yearly, weekly, and daily seasonality, plus holiday effects.</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '1rem' }}>
                <Book color="var(--accent)" size={32} />
              </div>
              <h2>How to Use the Intelligence</h2>
            </div>
            <div className="guide-steps" style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ minWidth: '32px', height: '32px', background: 'var(--primary)', color: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Explore the Market Data</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Use the <strong>Market Dashboard</strong> to analyze the last 5 years of gold price action. This table is fed directly from the Yahoo Finance live API via our BigQuery pipeline.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ minWidth: '32px', height: '32px', background: 'var(--primary)', color: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Generate Dynamic Projections</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Switch to the <strong>Forecast Engine</strong>. You can click any point on the 1-Year predictive chart to "pin" that date's specific metrics to the details card.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ minWidth: '32px', height: '32px', background: 'var(--primary)', color: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Custom Date Prediction</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Use the <strong>Temporal Projection</strong> tool to type in any future date (even years ahead). The engine will crunch the numbers and provide a specific price prediction with confidence intervals.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ minWidth: '32px', height: '32px', background: 'var(--primary)', color: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>4</div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>Export & Analyze</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Click <strong>Export Dataset</strong> at any time to download the current view's raw data in CSV format for further analysis in Excel or Python.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid var(--success)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '1rem' }}>
              <ShieldCheck size={20} /> Autonomous Reliability (MLOps)
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              Unlike static dashboards, Aurea is <strong>alive</strong>. Every week, our background scheduler fetches fresh data and retrains every model. 
              The system only promotes a new model to production if it beats the previous version's accuracy (MAPE), ensuring a 
              perpetual evolution of intelligence.
            </p>
          </div>
        </div>
      )}

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <div>&copy; 2026 Aurea Intelligence Platform. All Rights Reserved.</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="#" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Documentation</a>
          <a href="#" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>System Status</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
