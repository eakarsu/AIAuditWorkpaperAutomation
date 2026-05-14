import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MaterialityCalculatorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    total_revenue: '',
    total_assets: '',
    pretax_income: '',
    total_equity: '',
    benchmark: 'pretax_income',
    percentage: '5'
  });
  const [results, setResults] = useState(null);

  const calculate = () => {
    const benchmarkMap = {
      pretax_income: { val: parseFloat(form.pretax_income) || 0, range: [5, 10], label: 'Pretax Income' },
      revenue: { val: parseFloat(form.total_revenue) || 0, range: [0.5, 1], label: 'Total Revenue' },
      total_assets: { val: parseFloat(form.total_assets) || 0, range: [0.5, 1], label: 'Total Assets' },
      total_equity: { val: parseFloat(form.total_equity) || 0, range: [1, 5], label: 'Total Equity' }
    };
    const b = benchmarkMap[form.benchmark];
    const pct = parseFloat(form.percentage) / 100;
    const overall = b.val * pct;
    const performance = overall * 0.75; // 75% rule
    const trivial = overall * 0.05; // 5% trivial threshold

    setResults({
      benchmark: b.label,
      benchmarkValue: b.val,
      percentage: form.percentage,
      overall_materiality: overall,
      performance_materiality: performance,
      clearly_trivial_threshold: trivial,
      lowRange: b.val * (b.range[0] / 100),
      highRange: b.val * (b.range[1] / 100)
    });
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-calculator" style={{ color: '#60a5fa', marginRight: 12 }}></i>Materiality Calculator</h1>
          <p>Auto-compute quantitative materiality thresholds from financial statement balances</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header"><h2>Financial Statement Inputs</h2></div>
        <div style={{ padding: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Total Revenue ($)</label>
              <input type="number" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Total Assets ($)</label>
              <input type="number" value={form.total_assets} onChange={e => setForm({ ...form, total_assets: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Pretax Income ($)</label>
              <input type="number" value={form.pretax_income} onChange={e => setForm({ ...form, pretax_income: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Total Equity ($)</label>
              <input type="number" value={form.total_equity} onChange={e => setForm({ ...form, total_equity: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Benchmark</label>
              <select value={form.benchmark} onChange={e => setForm({ ...form, benchmark: e.target.value })}>
                <option value="pretax_income">Pretax Income (5-10% typical)</option>
                <option value="revenue">Total Revenue (0.5-1% typical)</option>
                <option value="total_assets">Total Assets (0.5-1% typical)</option>
                <option value="total_equity">Total Equity (1-5% typical)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Percentage (%)</label>
              <input type="number" step="0.1" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={calculate}>
            <i className="fa-solid fa-calculator"></i> Calculate Materiality
          </button>
        </div>
      </div>

      {results && (
        <div className="data-section" style={{ marginTop: 20 }}>
          <div className="data-header"><h2>Materiality Thresholds</h2></div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ padding: 20, background: 'rgba(96,165,250,0.1)', borderRadius: 12, border: '1px solid rgba(96,165,250,0.3)' }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>OVERALL MATERIALITY</div>
              <div style={{ color: '#60a5fa', fontSize: 28, fontWeight: 800 }}>{fmt(results.overall_materiality)}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>{results.percentage}% of {results.benchmark}</div>
            </div>
            <div style={{ padding: 20, background: 'rgba(167,139,250,0.1)', borderRadius: 12, border: '1px solid rgba(167,139,250,0.3)' }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>PERFORMANCE MATERIALITY</div>
              <div style={{ color: '#a78bfa', fontSize: 28, fontWeight: 800 }}>{fmt(results.performance_materiality)}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>75% of overall (ISA 320)</div>
            </div>
            <div style={{ padding: 20, background: 'rgba(16,185,129,0.1)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>CLEARLY TRIVIAL THRESHOLD</div>
              <div style={{ color: '#10b981', fontSize: 28, fontWeight: 800 }}>{fmt(results.clearly_trivial_threshold)}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>5% of overall</div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <h3 style={{ color: '#cbd5e1', fontSize: 15, marginBottom: 12 }}>Range Reference for {results.benchmark}</h3>
            <div style={{ background: 'rgba(15,23,42,0.5)', padding: 16, borderRadius: 8 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                Typical range: <strong style={{ color: '#cbd5e1' }}>{fmt(results.lowRange)}</strong> — <strong style={{ color: '#cbd5e1' }}>{fmt(results.highRange)}</strong>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                Materiality thresholds drive scope of substantive procedures and identification of significant misstatements per ISA 320 / AU-C 320.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialityCalculatorPage;
