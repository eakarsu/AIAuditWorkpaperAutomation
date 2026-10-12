import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AIReport from './AIReport';
import FullFieldPresets from './FullFieldPresets';
import Modal from './AIWorkspaceModal';

const API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '').replace(/\/api$/, '');
export const workspaceFields = [
  { key: 'input', label: 'Request / brief', required: true, wide: true },
  { key: 'context', label: 'Background and client context', wide: true },
  { key: 'goal', label: 'Desired outcome', required: true },
  { key: 'audience', label: 'Audience' },
  { key: 'source_data', label: 'Source data and observations', wide: true },
  { key: 'constraints', label: 'Constraints and requirements', wide: true },
  { key: 'budget', label: 'Budget and resources' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'tone', label: 'Writing tone', options: ['Professional', 'Friendly', 'Executive'] },
  { key: 'output_format', label: 'Report format', options: ['Summary and action plan', 'Detailed report', 'Executive briefing'] },
];
const emptyFields = () => Object.fromEntries(workspaceFields.map((field) => [field.key, field.options?.[0] || '']));
const readResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
};

export function workspacePresets(feature) {
  return ['Scenario', 'Data sample', 'Executive review'].map((label, index) => ({ label, values: {
    input: [
      `Plan an audit response for ${feature.title}. A month-end control has incomplete reviewer evidence. Identify procedures, risks, assumptions, and signoff points.`,
      `Analyze illustrative exceptions relevant to ${feature.title}: a recurring reconciliation difference, missing source support, and an unassigned follow-up. State what real records are needed to confirm each observation.`,
      `Prepare an audit partner briefing on ${feature.title}. Summarize control design, evidence gaps, residual risk, required approvals, and a practical action plan.`,
    ][index],
    context: `Illustrative audit planning case for ${feature.title}. The engagement team must review evidence quality and obtain client approval before changing a live process.`,
    goal: ['Define audit procedures, owners, and review points.', 'Identify exception patterns, missing evidence, and follow-up procedures.', 'Brief the audit partner on choices, residual risk, and approvals.'][index],
    audience: ['Engagement manager and control owners', 'Audit seniors and independent reviewers', 'Audit partner and audit committee'][index],
    source_data: ['Illustrative: the month-end reconciliation was completed, but reviewer signoff and one supporting statement are missing. Verify the actual engagement records.', 'Illustrative: three exceptions recur across quarters; one lacks an owner and another lacks source documentation. Confirm counts and dates against real records.', 'Illustrative: the control design is documented, but operating evidence is incomplete and remediation approval is pending. Separate observations from assumptions.'][index],
    constraints: ['Do not infer a control passed without evidence; preserve client confidentiality and flag missing documents.', 'Prioritize material exceptions; identify evidence needed before conclusions; do not invent record identifiers.', 'Compare audit effort, dependencies, and residual risk; identify decisions requiring reviewer approval.'][index],
    budget: ['Illustrative capacity: two auditors, one review day', 'Illustrative capacity: one auditor, limited sample review', 'Illustrative capacity: manager review and specialist consultation'][index],
    deadline: new Date(Date.now() + (index + 7) * 86400000).toISOString().slice(0, 10),
    tone: ['Professional', 'Friendly', 'Executive'][index],
    output_format: ['Summary and action plan', 'Detailed report', 'Executive briefing'][index],
  } })).map((preset, index) => ({
    label: feature.presets?.[index]?.label || preset.label,
    values: { ...preset.values, ...feature.presets?.[index]?.values },
  }));
}

export default function AIWorkspace({ feature, token: suppliedToken }) {
  const [fields, setFields] = useState(emptyFields);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(null);
  const formRef = useRef(null);
  const token = suppliedToken || (typeof window === 'undefined' ? '' : [localStorage.getItem("token"), localStorage.getItem('token'), localStorage.getItem('authToken')].find(Boolean) || '');
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);
  const endpoint = `${API}/api/report-workspace`;
  const loadHistory = useCallback(async (signal) => {
    const response = await fetch(`${endpoint}/runs?feature=${encodeURIComponent(feature.id)}`, { headers, signal });
    const data = await readResponse(response);
    if (!Array.isArray(data.items)) throw new Error('Saved report response did not contain an item list');
    setHistory(data.items);
  }, [endpoint, feature.id, headers]);
  useEffect(() => {
    const controller = new AbortController();
    loadHistory(controller.signal).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => { controller.abort(); request.current?.abort(); request.current = null; };
    // A feature route owns its form, result, and history.
  }, [loadHistory]);

  const cancel = () => { request.current?.abort(); request.current = null; setLoading(false); setMessage('Request cancelled.'); };
  const run = async (event) => {
    event.preventDefault(); if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setMessage(''); setResult(null);
    try {
      const response = await fetch(`${endpoint}/run`, { method: 'POST', headers, signal: controller.signal, body: JSON.stringify({ feature: feature.id, fields, ...(editingId ? { id: editingId } : {}) }) });
      const data = await readResponse(response);
      if (request.current !== controller) return;
      setResult(data.item); setEditingId(data.item.id); setMessage('Report saved to your history.');
      await loadHistory(controller.signal);
    } catch (failure) { if (request.current === controller && failure.name !== 'AbortError') setError(failure.message); }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  };
  const edit = (item) => {
    setFields({ ...emptyFields(), ...item.input }); setEditingId(item.id); setResult(item); setSelected(null); setDeleting(false); setError(''); setMessage('Edit any field, then generate the updated report.');
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const remove = async () => {
    const response = await fetch(`${endpoint}/runs/${selected.id}`, { method: 'DELETE', headers });
    await readResponse(response);
    if (editingId === selected.id) { setEditingId(null); setResult(null); }
    setSelected(null); setDeleting(false); setMessage('Saved report deleted.'); await loadHistory();
  };
  return <section className="ai-workspace"><header className="ai-workspace-heading"><span className="ai-eyebrow">AI workspace · OpenRouter</span><h1>{feature.title}</h1><p>{feature.description}</p></header>
    <form className="ai-workspace-panel" onSubmit={run} ref={formRef}>
      <FullFieldPresets value={fields} presets={workspacePresets(feature)} disabled={loading} onChange={(next) => { setFields(next); setResult(null); setEditingId(null); setError(''); setMessage('All 10 fields filled, including optional fields. Review the example before generating.'); }} />
      <div className="ai-form-grid">{workspaceFields.map((field) => <div key={field.key} className={`ai-form-field ${field.wide ? 'ai-form-field-wide' : ''}`}><label htmlFor={`${feature.id}-${field.key}`}>{field.label}<span>{field.required ? 'Required' : 'Optional'}</span></label>{field.options ? <select id={`${feature.id}-${field.key}`} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })}>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.type ? <input id={`${feature.id}-${field.key}`} type={field.type} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} /> : <textarea id={`${feature.id}-${field.key}`} rows={field.wide ? 4 : 2} required={field.required} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} />}</div>)}</div>
      <footer className="ai-workspace-footer"><p className="ai-muted">Review the brief and any examples before generating.</p><div className="ai-actions"><button type="button" className="btn btn-secondary" onClick={() => { if (loading) cancel(); else { setFields(emptyFields()); setResult(null); setEditingId(null); setError(''); setMessage('Form cleared.'); } }}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading || !fields.input.trim() || !fields.goal.trim()}>{loading ? 'Generating report…' : 'Generate with OpenRouter'}</button></div></footer>
    </form>
    {message && <p role="status" className="ai-muted">{message}</p>}
    <AIReport response={result} loading={loading} error={error} title={feature.title} />
    <section className="ai-history"><h2>Saved reports</h2><p className="ai-muted">Open a report to review it, edit its inputs, or delete it.</p>{!history.length ? <p className="ai-muted">Your generated reports will appear here.</p> : history.map((item) => <button type="button" className="ai-history-row" key={item.id} onClick={() => { setSelected(item); setDeleting(false); }}><span><strong>{String(item.input?.goal || feature.title).slice(0, 100)}</strong><br /><small className="ai-muted">{new Date(item.created_at).toLocaleString()} · {item.model}</small></span><span>Open report →</span></button>)}</section>
    {selected && <Modal className="ai-workspace-dialog" title={deleting ? 'Delete saved report?' : feature.title} onClose={() => { setSelected(null); setDeleting(false); }} footer={<><button type="button" className="btn btn-secondary" onClick={() => { setSelected(null); setDeleting(false); }}>Cancel</button>{!deleting && <button type="button" className="btn btn-secondary" onClick={() => edit(selected)}>Edit</button>}<button type="button" className="btn btn-danger" onClick={() => { if (!deleting) setDeleting(true); else remove().catch((failure) => setError(failure.message)); }}>{deleting ? 'Confirm delete' : 'Delete'}</button></>}>
      {deleting ? <p>This deletes the saved report from your history.</p> : <><AIReport response={selected} title={feature.title} /><details><summary>Request inputs</summary><dl>{workspaceFields.map((field) => <React.Fragment key={field.key}><dt><strong>{field.label}</strong></dt><dd>{String(selected.input?.[field.key] || 'Not provided')}</dd></React.Fragment>)}</dl></details></>}
    </Modal>}
  </section>;
}
