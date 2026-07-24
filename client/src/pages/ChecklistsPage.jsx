import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checklists, ai } from '../services/api';
import AIResponse from '../components/AIResponse';

const emptyForm = {
  title: '', framework: 'SOX', category: '', requirement: '', description: '',
  compliance_status: 'Not Started', evidence_reference: '', assigned_to: '',
  due_date: '', priority: 'Medium', regulation_reference: '', notes: ''
};

function ChecklistsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { try { setItems(await checklists.getAll()); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.framework || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (editItem) { await checklists.update(editItem.id, form); }
    else { await checklists.create(form); }
    setShowForm(false); load();
  };

  const handleAI = async (item) => {
    setAiLoading(true); setAiResult(null);
    try { setAiResult(await ai.assessCompliance(item)); }
    catch (e) { setAiResult({ success: false, error: e.message }); }
    finally { setAiLoading(false); }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-clipboard-check" style={{ color: '#f87171', marginRight: 12 }}></i>Compliance Checklists</h1>
          <p>Automate compliance assessments with AI-powered gap analysis</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>{filtered.length} Checklist Items</h2>
          <div className="header-actions">
            <input className="search-input" placeholder="Search checklists..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!filtered.length) return;
              const headers = ['Title', 'Framework', 'Category', 'Priority', 'Compliance Status', 'Assigned To', 'Due Date', 'Requirement', 'Regulation Ref'];
              const rows = filtered.map(i => [i.title, i.framework, i.category, i.priority, i.compliance_status, i.assigned_to, i.due_date, i.requirement, i.regulation_reference]);
              const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'checklists_export.csv'; a.click();
            }}>
              <i className="fa-solid fa-download"></i> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditItem(null); setShowForm(true); }}>
              <i className="fa-solid fa-plus"></i> New Checklist Item
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Framework</th><th>Category</th><th>Priority</th><th>Assigned To</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{item.framework}</span></td>
                <td>{item.category}</td>
                <td><span className={`severity-badge ${(item.priority || '').toLowerCase()}`}>{item.priority}</span></td>
                <td>{item.assigned_to}</td>
                <td><span className={`status-badge ${statusClass(item.compliance_status)}`}>{item.compliance_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><i className="fa-solid fa-clipboard-check"></i><h3>No checklist items found</h3></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.title}</h2><button className="modal-close" onClick={() => setSelected(null)}>&times;</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Framework</label><div className="value">{selected.framework}</div></div>
                <div className="detail-item"><label>Category</label><div className="value">{selected.category}</div></div>
                <div className="detail-item"><label>Priority</label><div className="value"><span className={`severity-badge ${(selected.priority || '').toLowerCase()}`}>{selected.priority}</span></div></div>
                <div className="detail-item"><label>Compliance Status</label><div className="value"><span className={`status-badge ${statusClass(selected.compliance_status)}`}>{selected.compliance_status}</span></div></div>
                <div className="detail-item"><label>Assigned To</label><div className="value">{selected.assigned_to}</div></div>
                <div className="detail-item"><label>Due Date</label><div className="value">{selected.due_date ? new Date(selected.due_date).toLocaleDateString() : 'N/A'}</div></div>
                <div className="detail-item full-width"><label>Requirement</label><div className="value">{selected.requirement}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                {selected.regulation_reference && <div className="detail-item full-width"><label>Regulation Reference</label><div className="value">{selected.regulation_reference}</div></div>}
                {selected.evidence_reference && <div className="detail-item full-width"><label>Evidence Reference</label><div className="value">{selected.evidence_reference}</div></div>}
                {selected.notes && <div className="detail-item full-width"><label>Notes</label><div className="value">{selected.notes}</div></div>}
              </div>
              <AIResponse result={aiResult} loading={aiLoading} onClose={() => setAiResult(null)} />
            </div>
            <div className="modal-actions">
              <div className="left-actions"><button className="btn btn-ai btn-sm" onClick={() => handleAI(selected)} disabled={aiLoading}><i className="fa-solid fa-robot"></i> AI Assess Compliance</button></div>
              <div className="right-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...emptyForm, ...selected, due_date: selected.due_date ? selected.due_date.slice(0, 10) : '' }); setEditItem(selected); setShowForm(true); setSelected(null); }}><i className="fa-solid fa-pen"></i> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (window.confirm('Delete?')) { await checklists.delete(selected.id); setSelected(null); load(); } }}><i className="fa-solid fa-trash"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editItem ? 'Edit Checklist Item' : 'New Checklist Item'}</h2><button className="modal-close" onClick={() => setShowForm(false)}>&times;</button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="full-width form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="form-group"><label>Framework</label>
                    <select value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })}>
                      <option>SOX</option><option>SOC 2</option><option>HIPAA</option><option>PCI-DSS</option>
                      <option>GDPR</option><option>BSA/AML</option><option>IIA Standards</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                  <div className="form-group"><label>Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Compliance Status</label>
                    <select value={form.compliance_status} onChange={e => setForm({ ...form, compliance_status: e.target.value })}>
                      <option>Not Started</option><option>Partially Compliant</option><option>Compliant</option><option>Non-Compliant</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
                  <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Requirement</label><textarea value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Regulation Reference</label><input value={form.regulation_reference} onChange={e => setForm({ ...form, regulation_reference: e.target.value })} /></div>
                  <div className="full-width form-group"><label>Evidence Reference</label><input value={form.evidence_reference} onChange={e => setForm({ ...form, evidence_reference: e.target.value })} /></div>
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

export default ChecklistsPage;
