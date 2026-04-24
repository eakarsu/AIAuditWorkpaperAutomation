import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function AuditTrailPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: page * limit });
      if (filterModule) params.set('module', filterModule);
      if (filterAction) params.set('action', filterAction);
      const res = await fetch(`${API_BASE}/audit-trail?${params}`, { headers: getHeaders() });
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filterModule, filterAction]);

  const totalPages = Math.ceil(total / limit);

  const actionIcon = (action) => {
    switch (action) {
      case 'CREATE': return 'fa-solid fa-plus-circle';
      case 'UPDATE': return 'fa-solid fa-pen-to-square';
      case 'DELETE': return 'fa-solid fa-trash-can';
      default: return 'fa-solid fa-circle-info';
    }
  };

  const actionColor = (action) => {
    switch (action) {
      case 'CREATE': return '#34d399';
      case 'UPDATE': return '#60a5fa';
      case 'DELETE': return '#f87171';
      default: return '#94a3b8';
    }
  };

  const moduleIcon = (mod) => {
    switch (mod) {
      case 'Evidence': return 'fa-solid fa-file-shield';
      case 'Sampling': return 'fa-solid fa-chart-pie';
      case 'Workpapers': return 'fa-solid fa-file-lines';
      case 'Findings': return 'fa-solid fa-magnifying-glass-chart';
      case 'Checklists': return 'fa-solid fa-clipboard-check';
      default: return 'fa-solid fa-circle';
    }
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8', marginRight: 12 }}></i>Audit Trail</h1>
          <p>Track all activity across audit modules — who did what and when</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{total} Activity Entries</h2>
          <div className="header-actions">
            <select className="search-input" style={{ width: 160 }} value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(0); }}>
              <option value="">All Modules</option>
              <option value="Evidence">Evidence</option>
              <option value="Sampling">Sampling</option>
              <option value="Workpapers">Workpapers</option>
              <option value="Findings">Findings</option>
              <option value="Checklists">Checklists</option>
            </select>
            <select className="search-input" style={{ width: 140 }} value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="ai-loading"><div className="spinner"></div> Loading...</div></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-clock-rotate-left"></i>
            <h3>No activity found</h3>
            <p>Activity will appear here as changes are made</p>
          </div>
        ) : (
          <div style={{ padding: '16px 24px' }}>
            {entries.map(entry => (
              <div key={entry.id} className="audit-trail-entry">
                <div className="trail-icon" style={{ background: `${actionColor(entry.action)}20`, color: actionColor(entry.action) }}>
                  <i className={actionIcon(entry.action)}></i>
                </div>
                <div className="trail-content">
                  <div className="trail-main">
                    <span className="trail-action" style={{ color: actionColor(entry.action) }}>{entry.action}</span>
                    <span className="trail-module-badge">
                      <i className={moduleIcon(entry.module)} style={{ marginRight: 4 }}></i>
                      {entry.module}
                    </span>
                    {entry.record_title && <span className="trail-title">{entry.record_title}</span>}
                  </div>
                  {entry.details && <div className="trail-details">{entry.details}</div>}
                  <div className="trail-meta">
                    <span><i className="fa-solid fa-user" style={{ marginRight: 4 }}></i>{entry.performed_by}</span>
                    <span><i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i>{timeAgo(entry.created_at)}</span>
                    <span style={{ color: '#475569' }}>{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <i className="fa-solid fa-chevron-left"></i> Previous
            </button>
            <span className="pagination-info">Page {page + 1} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditTrailPage;
