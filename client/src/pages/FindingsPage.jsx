import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findings, ai } from '../services/api';
import AIResponse from '../components/AIResponse';

const emptyForm = {
  title: '', finding_type: 'Internal Control', severity: 'Medium', audit_area: '',
  condition: '', criteria: '', cause: '', effect: '', recommendation: '',
  management_response: '', status: 'Open', assigned_to: '', due_date: '', notes: ''
};

function FindingsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { try { setItems(await findings.getAll()); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.audit_area || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.severity || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (editItem) { await findings.update(editItem.id, form); }
    else { await findings.create(form); }
    setShowForm(false); load();
  };

  const handleAI = async (item) => {
    setAiLoading(true); setAiResult(null);
    try { setAiResult(await ai.analyzeFinding(item)); }
    catch (e) { setAiResult({ success: false, error: e.message }); }
    finally { setAiLoading(false); }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-magnifying-glass-chart" style={{ color: '#fbbf24', marginRight: 12 }}></i>Audit Findings</h1>
          <p>Document and analyze audit findings with AI-powered recommendations</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Findings</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search findings..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!filtered.length) return;
              const headers = ['Title', 'Type', 'Severity', 'Audit Area', 'Status', 'Assigned To', 'Due Date', 'Condition', 'Recommendation'];
              const rows = filtered.map(i => [i.title, i.finding_type, i.severity, i.audit_area, i.status, i.assigned_to, i.due_date, i.condition, i.recommendation]);
              const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'findings_export.csv'; a.click();
            }}>
              <i className="fa-solid fa-download"></i> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditItem(null); setShowForm(true); }}>
              <i className="fa-solid fa-plus"></i> New Finding
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Type</th><th>Severity</th><th>Audit Area</th><th>Assigned To</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                <td>{item.finding_type}</td>
                <td><span className={`severity-badge ${(item.severity || '').toLowerCase()}`}>{item.severity}</span></td>
                <td>{item.audit_area}</td>
                <td>{item.assigned_to}</td>
                <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><i className="fa-solid fa-magnifying-glass-chart"></i><h3>No findings found</h3></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.title}</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Finding Type</label><div className="value">{selected.finding_type}</div></div>
                <div className="detail-item"><label>Severity</label><div className="value"><span className={`severity-badge ${(selected.severity || '').toLowerCase()}`}>{selected.severity}</span></div></div>
                <div className="detail-item"><label>Audit Area</label><div className="value">{selected.audit_area}</div></div>
                <div className="detail-item"><label>Status</label><div className="value"><span className={`status-badge ${statusClass(selected.status)}`}>{selected.status}</span></div></div>
                <div className="detail-item"><label>Assigned To</label><div className="value">{selected.assigned_to}</div></div>
                <div className="detail-item"><label>Due Date</label><div className="value">{selected.due_date ? new Date(selected.due_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item full-width"><label>Condition (What was found)</label><div className="value">{selected.condition}</div></div>
                <div className="detail-item full-width"><label>Criteria (What should be)</label><div className="value">{selected.criteria}</div></div>
                {selected.cause && <div className="detail-item full-width"><label>Cause (Why it happened)</label><div className="value">{selected.cause}</div></div>}
                {selected.effect && <div className="detail-item full-width"><label>Effect (Impact)</label><div className="value">{selected.effect}</div></div>}
                {selected.recommendation && <div className="detail-item full-width"><label>Recommendation</label><div className="value">{selected.recommendation}</div></div>}
                {selected.management_response && <div className="detail-item full-width"><label>Management Response</label><div className="value">{selected.management_response}</div></div>}
                {selected.notes && <div className="detail-item full-width"><label>Notes</label><div className="value">{selected.notes}</div></div>}
              </div>
              <AIResponse result={aiResult} loading={aiLoading} onClose={() => setAiResult(null)} />
            </div>
            <div className="modal-actions">
              <div className="left-actions"><button className="btn btn-ai btn-sm" onClick={() => handleAI(selected)} disabled={aiLoading}><i className="fa-solid fa-robot"></i> AI Analyze Finding</button></div>
              <div className="right-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...emptyForm, ...selected, due_date: selected.due_date ? selected.due_date.slice(0, 10) : '' }); setEditItem(selected); setShowForm(true); setSelected(null); }}><i className="fa-solid fa-pen"></i> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm('Delete?')) { await findings.delete(selected.id); setSelected(null); load(); } }}><i className="fa-solid fa-trash"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Edit Finding' : 'New Finding'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="full-width form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="form-group"><label>Finding Type</label>
                    <select value={form.finding_type} onChange={e => setForm({ ...form, finding_type: e.target.value })}>
                      <option>Internal Control</option><option>Financial Statement</option><option>Compliance</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Severity</label>
                    <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Audit Area</label><input value={form.audit_area} onChange={e => setForm({ ...form, audit_area: e.target.value })} /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Open</option><option>Remediation Planned</option><option>Closed</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
                  <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Condition</label><textarea value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Criteria</label><textarea value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Cause</label><textarea value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Effect</label><textarea value={form.effect} onChange={e => setForm({ ...form, effect: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Recommendation</label><textarea value={form.recommendation} onChange={e => setForm({ ...form, recommendation: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Management Response</label><textarea value={form.management_response} onChange={e => setForm({ ...form, management_response: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm"><i className="fa-solid fa-check"></i> {editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FindingsPage;
