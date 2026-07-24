import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidence, ai } from '../services/api';
import AIResponse from '../components/AIResponse';

const emptyForm = {
  title: '', description: '', source: '', evidence_type: 'Documentary',
  status: 'Pending', audit_area: '', risk_level: 'Medium', collected_by: '', notes: ''
};

function EvidencePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    try { setItems(await evidence.getAll()); } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.audit_area || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRowClick = (item) => { setSelected(item); setAiResult(null); };

  const handleNew = () => { setForm(emptyForm); setEditItem(null); setShowForm(true); };

  const handleEdit = (item) => {
    setForm({ ...emptyForm, ...item });
    setEditItem(item);
    setShowForm(true);
    setSelected(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this evidence item?')) return;
    await evidence.delete(id);
    setSelected(null);
    load();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editItem) { await evidence.update(editItem.id, form); }
    else { await evidence.create(form); }
    setShowForm(false);
    load();
  };

  const handleAI = async (item) => {
    setAiLoading(true); setAiResult(null);
    try { setAiResult(await ai.analyzeEvidence(item)); }
    catch (e) { setAiResult({ success: false, error: e.message }); }
    finally { setAiLoading(false); }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-file-shield" style={{ color: '#60a5fa', marginRight: 12 }}></i>Audit Evidence</h1>
          <p>Manage and analyze audit evidence with AI-powered assessment</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Evidence Items</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search evidence..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!filtered.length) return;
              const headers = ['Title', 'Type', 'Source', 'Audit Area', 'Risk Level', 'Status', 'Collected By', 'Description', 'Notes'];
              const rows = filtered.map(i => [i.title, i.evidence_type, i.source, i.audit_area, i.risk_level, i.status, i.collected_by, i.description, i.notes]);
              const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'evidence_export.csv'; a.click();
            }}>
              <i className="fa-solid fa-download"></i> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleNew}>
              <i className="fa-solid fa-plus"></i> New Evidence
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Audit Area</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Collected By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => handleRowClick(item)}>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                <td>{item.evidence_type}</td>
                <td>{item.audit_area}</td>
                <td><span className={`severity-badge ${(item.risk_level || '').toLowerCase()}`}>{item.risk_level}</span></td>
                <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
                <td>{item.collected_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-file-shield"></i>
            <h3>No evidence items found</h3>
            <p>Create a new evidence item to get started</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.title}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Evidence Type</label><div className="value">{selected.evidence_type}</div></div>
                <div className="detail-item"><label>Source</label><div className="value">{selected.source}</div></div>
                <div className="detail-item"><label>Audit Area</label><div className="value">{selected.audit_area}</div></div>
                <div className="detail-item"><label>Risk Level</label><div className="value"><span className={`severity-badge ${(selected.risk_level || '').toLowerCase()}`}>{selected.risk_level}</span></div></div>
                <div className="detail-item"><label>Status</label><div className="value"><span className={`status-badge ${statusClass(selected.status)}`}>{selected.status}</span></div></div>
                <div className="detail-item"><label>Collected By</label><div className="value">{selected.collected_by}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                {selected.notes && <div className="detail-item full-width"><label>Notes</label><div className="value">{selected.notes}</div></div>}
              </div>
              <AIResponse result={aiResult} loading={aiLoading} onClose={() => setAiResult(null)} />
            </div>
            <div className="modal-actions">
              <div className="left-actions">
                <button className="btn btn-ai btn-sm" onClick={() => handleAI(selected)} disabled={aiLoading}>
                  <i className="fa-solid fa-robot"></i> AI Analyze
                </button>
              </div>
              <div className="right-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(selected)}>
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>
                  <i className="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Evidence' : 'New Evidence'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="full-width form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="form-group"><label>Evidence Type</label>
                    <select value={form.evidence_type} onChange={e => setForm({ ...form, evidence_type: e.target.value })}>
                      <option>Documentary</option><option>Confirmation</option><option>Physical Inspection</option>
                      <option>Analytical</option><option>Inquiry</option><option>Inquiry & Observation</option>
                      <option>Inquiry & Documentary</option><option>Written Representation</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Source</label><input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></div>
                  <div className="form-group"><label>Audit Area</label><input value={form.audit_area} onChange={e => setForm({ ...form, audit_area: e.target.value })} /></div>
                  <div className="form-group"><label>Risk Level</label>
                    <select value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Pending</option><option>Pending Review</option><option>In Progress</option>
                      <option>Verified</option><option>Completed</option><option>Draft</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Collected By</label><input value={form.collected_by} onChange={e => setForm({ ...form, collected_by: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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

export default EvidencePage;
