import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidence, findings } from '../services/api';

function RiskHeatMapPage() {
  const navigate = useNavigate();
  const [evidenceData, setEvidenceData] = useState([]);
  const [findingsData, setFindingsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([evidence.getAll(), findings.getAll()])
      .then(([ev, fi]) => { setEvidenceData(ev); setFindingsData(fi); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Aggregate risk by audit area
  const areaMap = {};
  evidenceData.forEach(e => {
    const area = e.audit_area || 'Uncategorized';
    if (!areaMap[area]) areaMap[area] = { evidence: 0, findings: 0, high: 0, medium: 0, low: 0, critical: 0 };
    areaMap[area].evidence++;
    const r = (e.risk_level || '').toLowerCase();
    if (areaMap[area][r] !== undefined) areaMap[area][r]++;
  });
  findingsData.forEach(f => {
    const area = f.audit_area || 'Uncategorized';
    if (!areaMap[area]) areaMap[area] = { evidence: 0, findings: 0, high: 0, medium: 0, low: 0, critical: 0 };
    areaMap[area].findings++;
    const s = (f.severity || '').toLowerCase();
    if (areaMap[area][s] !== undefined) areaMap[area][s]++;
  });

  const computeRiskScore = (a) =>
    (a.critical * 10) + (a.high * 5) + (a.medium * 2) + (a.low * 1);

  const cells = Object.entries(areaMap).map(([area, data]) => ({
    area,
    ...data,
    score: computeRiskScore(data)
  })).sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...cells.map(c => c.score), 1);

  const heatColor = (score) => {
    const intensity = score / maxScore;
    if (intensity > 0.75) return '#ef4444';
    if (intensity > 0.5) return '#f97316';
    if (intensity > 0.25) return '#f59e0b';
    if (intensity > 0) return '#10b981';
    return '#475569';
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-fire" style={{ color: '#f97316', marginRight: 12 }}></i>Audit Risk Heat Map</h1>
          <p>Visualize risk concentration across audit areas and processes</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div className="data-section">
          <div className="data-header"><h2>Risk Concentration by Audit Area ({cells.length} areas)</h2></div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {cells.map(c => (
              <div key={c.area} style={{
                background: heatColor(c.score),
                borderRadius: 8,
                padding: 16,
                color: '#fff',
                position: 'relative',
                minHeight: 130
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{c.area}</div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>{c.score}</div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>Risk Score</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11 }}>
                  <span>{c.evidence} evidence</span>
                  <span>{c.findings} findings</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {c.critical > 0 && <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>{c.critical}C</span>}
                  {c.high > 0 && <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>{c.high}H</span>}
                  {c.medium > 0 && <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>{c.medium}M</span>}
                  {c.low > 0 && <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>{c.low}L</span>}
                </div>
              </div>
            ))}
          </div>
          {cells.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-fire"></i>
              <h3>No risk data yet</h3>
              <p>Add evidence items and findings to populate the heat map</p>
            </div>
          )}
        </div>
      )}

      <div className="data-section" style={{ marginTop: 20 }}>
        <div className="data-header"><h2>Legend & Methodology</h2></div>
        <div style={{ padding: 20 }}>
          <p style={{ color: '#cbd5e1', marginBottom: 12 }}>Risk score = (Critical x 10) + (High x 5) + (Medium x 2) + (Low x 1) — aggregated across evidence and findings per area.</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#ef4444', borderRadius: 4 }} /><span style={{ color: '#cbd5e1', fontSize: 13 }}>Very High (76-100%)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#f97316', borderRadius: 4 }} /><span style={{ color: '#cbd5e1', fontSize: 13 }}>High (51-75%)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#f59e0b', borderRadius: 4 }} /><span style={{ color: '#cbd5e1', fontSize: 13 }}>Medium (26-50%)</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#10b981', borderRadius: 4 }} /><span style={{ color: '#cbd5e1', fontSize: 13 }}>Low (1-25%)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskHeatMapPage;
