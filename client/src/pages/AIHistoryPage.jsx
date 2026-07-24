import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function AIHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [endpoint, setEndpoint] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const qs = new URLSearchParams();
    qs.set('page', page);
    qs.set('limit', 20);
    if (endpoint) qs.set('endpoint', endpoint);
    try {
      const res = await fetch(`${API_BASE}/ai/history?${qs}`, { headers: getHeaders() });
      const data = await res.json();
      setHistory(data.data || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [page, endpoint]);

  const endpointLabel = (ep) => ({
    'analyze-evidence': 'Evidence Analysis',
    'calculate-sample': 'Sample Calculation',
    'generate-workpaper': 'Workpaper Generation',
    'analyze-finding': 'Finding Analysis',
    'assess-compliance': 'Compliance Assessment',
    'score-evidence-adequacy': 'Adequacy Scoring',
    'generate-from-template': 'Template Generation'
  }[ep] || ep);

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-clock-rotate-left" style={{ color: '#a78bfa', marginRight: 12 }}></i>AI Analysis History</h1>
          <p>Review past AI requests, model usage, and token consumption</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{pagination.total} Total Analyses</h2>
          <div className="header-actions">
            <select value={endpoint} onChange={e => { setEndpoint(e.target.value); setPage(1); }}>
              <option value="">All Endpoints</option>
              <option value="analyze-evidence">Evidence Analysis</option>
              <option value="calculate-sample">Sample Calculation</option>
              <option value="generate-workpaper">Workpaper Generation</option>
              <option value="analyze-finding">Finding Analysis</option>
              <option value="assess-compliance">Compliance Assessment</option>
              <option value="score-evidence-adequacy">Adequacy Scoring</option>
              <option value="generate-from-template">Template Generation</option>
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Endpoint</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} onClick={() => setSelected(h)}>
                <td style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(h.created_at).toLocaleString()}</td>
                <td><span style={{ background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{endpointLabel(h.endpoint)}</span></td>
                <td style={{ fontSize: 12, color: '#cbd5e1' }}>{h.model_used || '—'}</td>
                <td style={{ fontWeight: 600 }}>{h.tokens_used || '—'}</td>
                <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(h); }}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-clock-rotate-left"></i>
            <h3>No AI history yet</h3>
            <p>Run any AI analysis to populate this history</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span style={{ color: '#94a3b8' }}>Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h2>Analysis #{selected.id}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Endpoint</label><div className="value">{endpointLabel(selected.endpoint)}</div></div>
                <div className="detail-item"><label>Model</label><div className="value">{selected.model_used || '—'}</div></div>
                <div className="detail-item"><label>Tokens</label><div className="value">{selected.tokens_used || '—'}</div></div>
                <div className="detail-item"><label>Timestamp</label><div className="value">{new Date(selected.created_at).toLocaleString()}</div></div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Input</label>
                <pre style={{ background: 'rgba(15,23,42,0.7)', padding: 12, borderRadius: 6, fontSize: 12, color: '#cbd5e1', overflow: 'auto', maxHeight: 200 }}>{JSON.stringify(selected.input_data, null, 2)}</pre>
              </div>
              <div className="form-group">
                <label>Output</label>
                <pre style={{ background: 'rgba(15,23,42,0.7)', padding: 12, borderRadius: 6, fontSize: 12, color: '#cbd5e1', overflow: 'auto', maxHeight: 400 }}>{JSON.stringify(selected.result_data, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIHistoryPage;
