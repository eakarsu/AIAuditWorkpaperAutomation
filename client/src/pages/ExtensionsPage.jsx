// Apply pass 5 — additive UI for backlog features.
// All endpoints under /api/ext (mounted in server/index.js).
import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';
function authHeaders() {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function api(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, { ...opts, headers: authHeaders() });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = { raw: t }; }
  return { ok: r.ok, status: r.status, body };
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

function ResultBox({ data }) {
  if (data == null) return null;
  return (
    <pre style={{ background: '#0b1020', color: '#cbd5e1', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 320 }}>
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ExtensionsPage() {
  const [tab, setTab] = useState('gl');
  const tabs = [
    { id: 'gl', label: 'GL Anomalies' },
    { id: 'risk', label: 'Risk Assessment' },
    { id: 'erp', label: 'ERP Integrations' },
    { id: 'conf', label: 'External Confirmations' },
    { id: 'cont', label: 'Continuous Audit' },
    { id: 'xbrl', label: 'XBRL Parser' },
    { id: 'collab', label: 'Audit-Firm Collab' }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2>Audit Extensions <small style={{ color: '#94a3b8', fontWeight: 400 }}>(pass 5 backlog)</small></h2>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1',
              background: tab === t.id ? '#1e40af' : '#f8fafc',
              color: tab === t.id ? 'white' : '#0f172a', cursor: 'pointer'
            }}>{t.label}</button>
        ))}
      </div>

      {tab === 'gl' && <GLPanel />}
      {tab === 'risk' && <RiskPanel />}
      {tab === 'erp' && <ErpPanel />}
      {tab === 'conf' && <ConfPanel />}
      {tab === 'cont' && <ContPanel />}
      {tab === 'xbrl' && <XbrlPanel />}
      {tab === 'collab' && <CollabPanel />}
    </div>
  );
}

function GLPanel() {
  const [text, setText] = useState('[\n  {"entry_date":"2026-04-30","account_code":"6000","account_name":"Travel","debit":10000,"credit":0,"memo":"round trip"}\n]');
  const [res, setRes] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [list, setList] = useState([]);
  async function loadList() { const r = await api('/ext/gl/entries'); setList(r.body || []); }
  useEffect(() => { loadList(); }, []);
  async function ingest() {
    let entries = [];
    try { entries = JSON.parse(text); } catch { setRes({ error: 'invalid JSON' }); return; }
    const r = await api('/ext/gl/ingest', { method: 'POST', body: JSON.stringify({ entries }) });
    setRes(r.body); loadList();
  }
  async function analyze() {
    const r = await api('/ext/ai/gl-anomaly-analyze', { method: 'POST', body: '{}' });
    setAnalysis(r.body);
  }
  return (
    <Section title="GL Anomaly Analysis">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={ingest}>Ingest entries</button>{' '}
        <button onClick={analyze}>AI Analyze last 50</button>
      </div>
      <ResultBox data={res} />
      <ResultBox data={analysis} />
      <div style={{ marginTop: 8, color: '#64748b' }}>Recent entries: {list.length}</div>
    </Section>
  );
}

function RiskPanel() {
  const [eng, setEng] = useState('FY26 ACME Audit');
  const [inh, setInh] = useState('{"industry":"manufacturing","new_systems":true}');
  const [ctrl, setCtrl] = useState('{"segregation_of_duties":"weak","monitoring":"adequate"}');
  const [res, setRes] = useState(null);
  async function go() {
    let inhO = {}, ctrlO = {};
    try { inhO = JSON.parse(inh); ctrlO = JSON.parse(ctrl); } catch { setRes({ error: 'invalid JSON' }); return; }
    const r = await api('/ext/ai/risk-assessment', { method: 'POST',
      body: JSON.stringify({ engagement_name: eng, inherent_factors: inhO, control_factors: ctrlO }) });
    setRes(r.body);
  }
  return (
    <Section title="AI Inherent + Control Risk Assessment">
      <input value={eng} onChange={e => setEng(e.target.value)} placeholder="engagement" style={{ width: '100%', marginBottom: 8 }} />
      <textarea value={inh} onChange={e => setInh(e.target.value)} rows={3} style={{ width: '100%', fontFamily: 'monospace', marginBottom: 8 }} />
      <textarea value={ctrl} onChange={e => setCtrl(e.target.value)} rows={3} style={{ width: '100%', fontFamily: 'monospace' }} />
      <div style={{ marginTop: 8 }}><button onClick={go}>Assess</button></div>
      <ResultBox data={res} />
    </Section>
  );
}

function ErpPanel() {
  const [status, setStatus] = useState(null);
  const [res, setRes] = useState(null);
  useEffect(() => { (async () => setStatus((await api('/ext/erp/status')).body))(); }, []);
  async function sync(v) {
    const r = await api(`/ext/erp/${v}/sync`, { method: 'POST', body: JSON.stringify({ since: '2026-01-01' }) });
    setRes(r.body);
  }
  return (
    <Section title="ERP Integrations (SAP / Oracle / NetSuite)">
      <ResultBox data={status} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => sync('sap')}>Sync SAP</button>
        <button onClick={() => sync('oracle')}>Sync Oracle</button>
        <button onClick={() => sync('netsuite')}>Sync NetSuite</button>
      </div>
      <ResultBox data={res} />
    </Section>
  );
}

function ConfPanel() {
  const [list, setList] = useState([]);
  const [cp, setCp] = useState('Bank of Example');
  const [email, setEmail] = useState('controller@example.com');
  const [res, setRes] = useState(null);
  async function load() { setList((await api('/ext/confirmations')).body || []); }
  useEffect(() => { load(); }, []);
  async function create() {
    const r = await api('/ext/confirmations', { method: 'POST', body: JSON.stringify({ counterparty: cp, counterparty_email: email, request_type: 'balance', payload: { balance_as_of: '2026-04-30' } }) });
    setRes(r.body); load();
  }
  return (
    <Section title="External Confirmations">
      <input value={cp} onChange={e => setCp(e.target.value)} placeholder="counterparty" style={{ width: '60%', marginRight: 8 }} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={{ width: '35%' }} />
      <div style={{ marginTop: 8 }}><button onClick={create}>Create confirmation</button></div>
      <ResultBox data={res} />
      <h4>Recent</h4>
      <ResultBox data={list} />
    </Section>
  );
}

function ContPanel() {
  const [src, setSrc] = useState('GL_FEED');
  const [type, setType] = useState('threshold_breach');
  const [sev, setSev] = useState('warn');
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  async function push() {
    await api('/ext/continuous/events', { method: 'POST', body: JSON.stringify({ source: src, event_type: type, severity: sev, payload: { ts: Date.now() } }) });
    load();
  }
  async function load() { setList((await api('/ext/continuous/events')).body || []); }
  async function summarize() { setSummary((await api('/ext/ai/continuous-summary', { method: 'POST', body: '{}' })).body); }
  useEffect(() => { load(); }, []);
  return (
    <Section title="Continuous Audit Events">
      <input value={src} onChange={e => setSrc(e.target.value)} placeholder="source" />{' '}
      <input value={type} onChange={e => setType(e.target.value)} placeholder="event_type" />{' '}
      <input value={sev} onChange={e => setSev(e.target.value)} placeholder="severity" />{' '}
      <button onClick={push}>Push event</button>{' '}
      <button onClick={summarize}>AI summary</button>
      <ResultBox data={summary} />
      <ResultBox data={list} />
    </Section>
  );
}

function XbrlPanel() {
  const [content, setContent] = useState('<xbrl xmlns:us-gaap="..." xmlns:xbrli="..."><xbrli:identifier scheme="">ACME</xbrli:identifier><xbrli:endDate>2026-12-31</xbrli:endDate><us-gaap:Revenues>1000000</us-gaap:Revenues><us-gaap:NetIncomeLoss>120000</us-gaap:NetIncomeLoss></xbrl>');
  const [res, setRes] = useState(null);
  async function parse() {
    const r = await api('/ext/xbrl/parse', { method: 'POST', body: JSON.stringify({ filename: 'sample.xml', content }) });
    setRes(r.body);
  }
  return (
    <Section title="XBRL Parser">
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} />
      <div style={{ marginTop: 8 }}><button onClick={parse}>Parse</button></div>
      <ResultBox data={res} />
    </Section>
  );
}

function CollabPanel() {
  const [eng, setEng] = useState('FY26 ACME Audit');
  const [email, setEmail] = useState('senior@firm.example');
  const [role, setRole] = useState('reviewer');
  const [list, setList] = useState([]);
  async function load() { setList((await api(`/ext/collab/members?engagement_name=${encodeURIComponent(eng)}`)).body || []); }
  async function invite() { await api('/ext/collab/invite', { method: 'POST', body: JSON.stringify({ engagement_name: eng, member_email: email, role }) }); load(); }
  useEffect(() => { load(); }, [eng]);
  return (
    <Section title="Audit-Firm Collaboration">
      <input value={eng} onChange={e => setEng(e.target.value)} placeholder="engagement" style={{ width: '100%', marginBottom: 8 }} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="member email" style={{ width: '60%', marginRight: 8 }} />
      <input value={role} onChange={e => setRole(e.target.value)} placeholder="role" style={{ width: '35%' }} />
      <div style={{ marginTop: 8 }}><button onClick={invite}>Invite</button></div>
      <ResultBox data={list} />
    </Section>
  );
}
