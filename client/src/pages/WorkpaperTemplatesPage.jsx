import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIResponse from '../components/AIResponse';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function WorkpaperTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [contextData, setContextData] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/ai/templates`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(console.error);
  }, []);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.audit_area.toLowerCase().includes(search.toLowerCase()) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleGenerate = async () => {
    if (!selected || !contextData.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/generate-from-template`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ template_id: selected.id, context_data: contextData })
      });
      const data = await res.json();
      setAiResult(data);
    } catch (e) {
      setAiResult({ success: false, error: e.message });
    } finally { setAiLoading(false); }
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-layer-group" style={{ color: '#60a5fa', marginRight: 12 }}></i>Workpaper Template Library</h1>
          <p>Searchable AI-indexed library of audit workpaper templates by industry and assertion</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Templates</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search by name, area, or tag..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: 20 }}>
          {filtered.map(t => (
            <div key={t.id}
              onClick={() => { setSelected(t); setAiResult(null); }}
              style={{
                background: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(96,165,250,0.2)',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.2)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>{t.name}</h3>
                <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                  #{t.id}
                </span>
              </div>
              <div style={{ color: '#a78bfa', fontSize: 12, marginBottom: 8 }}>{t.audit_area}</div>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{t.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                {(t.tags || []).map(tag => (
                  <span key={tag} style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', fontSize: 10, padding: '2px 6px', borderRadius: 3 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>{selected.name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Audit Area</label><div className="value">{selected.audit_area}</div></div>
                <div className="detail-item"><label>Template ID</label><div className="value">#{selected.id}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Context Data (engagement-specific details)</label>
                <textarea
                  rows={4}
                  placeholder="e.g., ABC Corporation, December 31, 2024 year-end, $2.5M revenue..."
                  value={contextData}
                  onChange={e => setContextData(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <AIResponse result={aiResult} loading={aiLoading} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-ai btn-sm" onClick={handleGenerate} disabled={aiLoading || !contextData.trim()}>
                <i className="fa-solid fa-robot"></i> {aiLoading ? 'Generating...' : 'Generate Workpaper'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkpaperTemplatesPage;
