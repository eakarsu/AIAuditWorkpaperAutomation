import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sampling, ai } from '../services/api';
import AIResponse from '../components/AIResponse';

const emptyForm = {
  title: '', population_size: '', sample_size: '', confidence_level: '95',
  sampling_method: 'Monetary Unit Sampling', audit_area: '', status: 'Planned',
  materiality_threshold: '', tolerable_error: '', expected_error_rate: '', description: '', notes: ''
};

function SamplingPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { try { setItems(await sampling.getAll()); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.audit_area || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    const data = { ...form, population_size: Number(form.population_size), sample_size: Number(form.sample_size),
      confidence_level: Number(form.confidence_level), materiality_threshold: Number(form.materiality_threshold),
      tolerable_error: Number(form.tolerable_error), expected_error_rate: Number(form.expected_error_rate) };
    if (editItem) { await sampling.update(editItem.id, data); }
    else { await sampling.create(data); }
    setShowForm(false); load();
  };

  const handleAI = async (item) => {
    setAiLoading(true); setAiResult(null);
    try { setAiResult(await ai.calculateSample(item)); }
    catch (e) { setAiResult({ success: false, error: e.message }); }
    finally { setAiLoading(false); }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '-');
  const fmt = (n) => n ? Number(n).toLocaleString() : 'N/A';
  const fmtCurrency = (n) => n ? '$' + Number(n).toLocaleString() : 'N/A';

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-chart-pie" style={{ color: '#a78bfa', marginRight: 12 }}></i>Statistical Sampling</h1>
          <p>Design and manage statistical sampling plans with AI optimization</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Sampling Plans</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!filtered.length) return;
              const headers = ['Title', 'Method', 'Population', 'Sample Size', 'Confidence', 'Audit Area', 'Status', 'Materiality', 'Tolerable Error'];
              const rows = filtered.map(i => [i.title, i.sampling_method, i.population_size, i.sample_size, i.confidence_level, i.audit_area, i.status, i.materiality_threshold, i.tolerable_error]);
              const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sampling_export.csv'; a.click();
            }}>
              <i className="fa-solid fa-download"></i> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditItem(null); setShowForm(true); }}>
              <i className="fa-solid fa-plus"></i> New Plan
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Method</th><th>Population</th><th>Sample</th><th>Confidence</th><th>Audit Area</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                <td>{item.sampling_method}</td>
                <td>{fmt(item.population_size)}</td>
                <td>{fmt(item.sample_size)}</td>
                <td>{item.confidence_level}%</td>
                <td>{item.audit_area}</td>
                <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><i className="fa-solid fa-chart-pie"></i><h3>No sampling plans found</h3></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.title}</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Sampling Method</label><div className="value">{selected.sampling_method}</div></div>
                <div className="detail-item"><label>Audit Area</label><div className="value">{selected.audit_area}</div></div>
                <div className="detail-item"><label>Population Size</label><div className="value" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(selected.population_size)}</div></div>
                <div className="detail-item"><label>Sample Size</label><div className="value" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(selected.sample_size)}</div></div>
                <div className="detail-item"><label>Confidence Level</label><div className="value">{selected.confidence_level}%</div></div>
                <div className="detail-item"><label>Status</label><div className="value"><span className={`status-badge ${statusClass(selected.status)}`}>{selected.status}</span></div></div>
                <div className="detail-item"><label>Materiality Threshold</label><div className="value">{fmtCurrency(selected.materiality_threshold)}</div></div>
                <div className="detail-item"><label>Tolerable Error</label><div className="value">{fmtCurrency(selected.tolerable_error)}</div></div>
                <div className="detail-item"><label>Expected Error Rate</label><div className="value">{selected.expected_error_rate}%</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                {selected.notes && <div className="detail-item full-width"><label>Notes</label><div className="value">{selected.notes}</div></div>}
              </div>
              <AIResponse result={aiResult} loading={aiLoading} onClose={() => setAiResult(null)} />
            </div>
            <div className="modal-actions">
              <div className="left-actions"><button className="btn btn-ai btn-sm" onClick={() => handleAI(selected)} disabled={aiLoading}><i className="fa-solid fa-robot"></i> AI Calculate Sample</button></div>
              <div className="right-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...emptyForm, ...selected }); setEditItem(selected); setShowForm(true); setSelected(null); }}><i className="fa-solid fa-pen"></i> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm('Delete?')) { await sampling.delete(selected.id); setSelected(null); load(); } }}><i className="fa-solid fa-trash"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Edit Sampling Plan' : 'New Sampling Plan'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="full-width form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="form-group"><label>Sampling Method</label>
                    <select value={form.sampling_method} onChange={e => setForm({ ...form, sampling_method: e.target.value })}>
                      <option>Monetary Unit Sampling</option><option>Random Sampling</option><option>Systematic Sampling</option>
                      <option>Stratified Random</option><option>Haphazard + Targeted</option><option>Selection of All Items</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Audit Area</label><input value={form.audit_area} onChange={e => setForm({ ...form, audit_area: e.target.value })} /></div>
                  <div className="form-group"><label>Population Size</label><input type="number" value={form.population_size} onChange={e => setForm({ ...form, population_size: e.target.value })} /></div>
                  <div className="form-group"><label>Sample Size</label><input type="number" value={form.sample_size} onChange={e => setForm({ ...form, sample_size: e.target.value })} /></div>
                  <div className="form-group"><label>Confidence Level (%)</label><input type="number" value={form.confidence_level} onChange={e => setForm({ ...form, confidence_level: e.target.value })} /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Planned</option><option>In Progress</option><option>Completed</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Materiality Threshold ($)</label><input type="number" value={form.materiality_threshold} onChange={e => setForm({ ...form, materiality_threshold: e.target.value })} /></div>
                  <div className="form-group"><label>Tolerable Error ($)</label><input type="number" value={form.tolerable_error} onChange={e => setForm({ ...form, tolerable_error: e.target.value })} /></div>
                  <div className="form-group"><label>Expected Error Rate (%)</label><input type="number" step="0.01" value={form.expected_error_rate} onChange={e => setForm({ ...form, expected_error_rate: e.target.value })} /></div>
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

export default SamplingPage;
