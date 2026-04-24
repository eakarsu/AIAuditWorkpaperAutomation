import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workpapers, ai } from '../services/api';
import AIResponse from '../components/AIResponse';

const emptyForm = {
  title: '', reference_number: '', audit_area: '', engagement: '',
  prepared_by: '', reviewed_by: '', status: 'Draft', objective: '',
  scope: '', procedures_performed: '', conclusion: '', notes: ''
};

function WorkpapersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { try { setItems(await workpapers.getAll()); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.audit_area || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (editItem) { await workpapers.update(editItem.id, form); }
    else { await workpapers.create(form); }
    setShowForm(false); load();
  };

  const handleAI = async (item) => {
    setAiLoading(true); setAiResult(null);
    try { setAiResult(await ai.generateWorkpaper(item)); }
    catch (e) { setAiResult({ success: false, error: e.message }); }
    finally { setAiLoading(false); }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-file-lines" style={{ color: '#34d399', marginRight: 12 }}></i>Workpaper Generation</h1>
          <p>Generate and manage audit workpapers with AI-assisted content creation</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Workpapers</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search workpapers..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!filtered.length) return;
              const headers = ['Ref #', 'Title', 'Audit Area', 'Engagement', 'Prepared By', 'Reviewed By', 'Status', 'Objective', 'Scope'];
              const rows = filtered.map(i => [i.reference_number, i.title, i.audit_area, i.engagement, i.prepared_by, i.reviewed_by, i.status, i.objective, i.scope]);
              const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'workpapers_export.csv'; a.click();
            }}>
              <i className="fa-solid fa-download"></i> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditItem(null); setShowForm(true); }}>
              <i className="fa-solid fa-plus"></i> New Workpaper
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Ref #</th><th>Title</th><th>Audit Area</th><th>Prepared By</th><th>Reviewed By</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td style={{ fontWeight: 600, color: '#34d399' }}>{item.reference_number}</td>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                <td>{item.audit_area}</td>
                <td>{item.prepared_by}</td>
                <td>{item.reviewed_by || '—'}</td>
                <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><i className="fa-solid fa-file-lines"></i><h3>No workpapers found</h3></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.reference_number} — {selected.title}</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Reference Number</label><div className="value">{selected.reference_number}</div></div>
                <div className="detail-item"><label>Audit Area</label><div className="value">{selected.audit_area}</div></div>
                <div className="detail-item"><label>Engagement</label><div className="value">{selected.engagement}</div></div>
                <div className="detail-item"><label>Status</label><div className="value"><span className={`status-badge ${statusClass(selected.status)}`}>{selected.status}</span></div></div>
                <div className="detail-item"><label>Prepared By</label><div className="value">{selected.prepared_by}</div></div>
                <div className="detail-item"><label>Reviewed By</label><div className="value">{selected.reviewed_by || 'Pending Review'}</div></div>
                <div className="detail-item full-width"><label>Objective</label><div className="value">{selected.objective || 'Not yet documented'}</div></div>
                <div className="detail-item full-width"><label>Scope</label><div className="value">{selected.scope || 'Not yet documented'}</div></div>
                <div className="detail-item full-width"><label>Procedures Performed</label><div className="value">{selected.procedures_performed || 'Not yet documented'}</div></div>
                {selected.conclusion && <div className="detail-item full-width"><label>Conclusion</label><div className="value">{selected.conclusion}</div></div>}
                {selected.notes && <div className="detail-item full-width"><label>Notes</label><div className="value">{selected.notes}</div></div>}
              </div>
              <AIResponse result={aiResult} loading={aiLoading} onClose={() => setAiResult(null)} />
            </div>
            <div className="modal-actions">
              <div className="left-actions"><button className="btn btn-ai btn-sm" onClick={() => handleAI(selected)} disabled={aiLoading}><i className="fa-solid fa-robot"></i> AI Generate Content</button></div>
              <div className="right-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...emptyForm, ...selected }); setEditItem(selected); setShowForm(true); setSelected(null); }}><i className="fa-solid fa-pen"></i> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm('Delete?')) { await workpapers.delete(selected.id); setSelected(null); load(); } }}><i className="fa-solid fa-trash"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Edit Workpaper' : 'New Workpaper'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="full-width form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="form-group"><label>Reference Number</label><input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
                  <div className="form-group"><label>Audit Area</label><input value={form.audit_area} onChange={e => setForm({ ...form, audit_area: e.target.value })} /></div>
                  <div className="form-group"><label>Engagement</label><input value={form.engagement} onChange={e => setForm({ ...form, engagement: e.target.value })} /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Draft</option><option>In Progress</option><option>Reviewed</option><option>Completed</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Prepared By</label><input value={form.prepared_by} onChange={e => setForm({ ...form, prepared_by: e.target.value })} /></div>
                  <div className="form-group"><label>Reviewed By</label><input value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Objective</label><textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Scope</label><textarea value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Procedures Performed</label><textarea value={form.procedures_performed} onChange={e => setForm({ ...form, procedures_performed: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Conclusion</label><textarea value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })} /></div>
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

export default WorkpapersPage;
