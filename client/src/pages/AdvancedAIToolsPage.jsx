import GeneratedAiResponse from './GeneratedAiResponse';
import React, { useState } from 'react';
import { ai } from '../services/api';
import FullFieldPresets from '../components/FullFieldPresets';

const EXAMPLES = {
  classifier: [
    { title: 'Unreviewed bank reconciliations', condition: 'Three monthly reconciliations lacked reviewer signoff; one $82,000 reconciling item remained open.', criteria: 'Monthly independent review with timely resolution of reconciling items.', cause: 'Reviewer ownership was not assigned during staff turnover.', effect: 'Cash misstatements may go undetected.', severity: 'High' },
    { title: 'Late user access removal', condition: 'Two departed staff retained read access for 14 days after departure.', criteria: 'Access removed within one business day of termination.', cause: 'HR and IT notifications were manual.', effect: 'Unauthorized access to financial records was possible.', severity: 'Medium' },
    { title: 'Unsupported journal entries', condition: 'Five year-end manual entries totaling $1.4 million had no supporting approval.', criteria: 'Material manual entries require support and independent approval.', cause: 'Emergency close procedures bypassed the approval queue.', effect: 'Revenue and expense balances could be materially misstated.', severity: 'Critical' },
  ],
  linker: [
    { industry: 'Manufacturing', audit_area: 'Inventory', lookback_days: 365 },
    { industry: 'Healthcare', audit_area: 'Revenue', lookback_days: 730 },
    { industry: 'Retail', audit_area: 'Cash', lookback_days: 180 },
  ],
  gap: [
    { framework: 'SOX', target_assertion: 'Completeness of revenue', current_controls: 'Monthly revenue reconciliation reviewed by controller\nQuarterly access review for billing users' },
    { framework: 'SOC2', target_assertion: 'Logical access', current_controls: 'New user requests require manager approval\nQuarterly privileged access recertification' },
    { framework: 'COSO', target_assertion: 'Monitoring activities', current_controls: 'Audit committee reviews quarterly exception trends\nControl owners document remediation status monthly' },
  ],
  chain: [
    { chainJson: JSON.stringify([{ title: 'Bank statement', source: 'Bank portal', evidence_type: 'Document', collected_by: 'Audit team', timestamp: '2026-01-15' }], null, 2) },
    { chainJson: JSON.stringify([{ title: 'Inventory count sheet', source: 'Warehouse count', evidence_type: 'Observation', collected_by: 'Audit team', timestamp: '2026-01-20' }], null, 2) },
    { chainJson: JSON.stringify([{ title: 'Invoice sample', source: 'Accounts payable export', evidence_type: 'Document', collected_by: 'Audit team', timestamp: '2026-02-01' }], null, 2) },
  ],
};

/**
 * Advanced AI Tools — exposes 4 audit-driven features:
 *   1. Finding Severity Classifier (AS 2201 / SAS 130)
 *   2. Cross-Audit Risk Linker (industry pattern detection)
 *   3. Compliance Gap Analyzer (COSO/SOX/SOC2/HIPAA/GDPR/PCI-DSS/NIST)
 *   4. Evidence Chain Validator (provenance and link integrity)
 */
function AdvancedAIToolsPage() {
  const [tab, setTab] = useState('classifier');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [findingForm, setFindingForm] = useState({
    title: '', condition: '', criteria: '', cause: '', effect: '', severity: 'Medium'
  });
  const [linkerForm, setLinkerForm] = useState({
    industry: '', audit_area: '', lookback_days: 365
  });
  const [gapForm, setGapForm] = useState({
    framework: 'SOC2', target_assertion: '', current_controls: ''
  });
  const [chainForm, setChainForm] = useState({
    chainJson: '[\n  {"id":1,"title":"Bank statement","source":"Bank XYZ","evidence_type":"Document","collected_by":"Auditor A","timestamp":"2025-01-15"},\n  {"id":2,"parent_id":1,"title":"Reconciliation","source":"Internal","evidence_type":"Recalculation","collected_by":"Auditor A","timestamp":"2025-01-16"}\n]'
  });

  const tabs = [
    { key: 'classifier', label: 'Finding Severity Classifier' },
    { key: 'linker',     label: 'Cross-Audit Risk Linker' },
    { key: 'gap',        label: 'Compliance Gap Analyzer' },
    { key: 'chain',      label: 'Evidence Chain Validator' },
  ];

  const wrap = async (fn) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fn();
      setResult(data);
    } catch (e) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onTab = (k) => { setTab(k); setError(null); setResult(null); };

  const runClassifier = () => wrap(() => ai.classifyFindingSeverity(findingForm));
  const runLinker = () => wrap(() => ai.crossAuditRiskLinker({
    industry: linkerForm.industry || null,
    audit_area: linkerForm.audit_area || null,
    lookback_days: parseInt(linkerForm.lookback_days) || 365
  }));
  const runGap = () => wrap(() => ai.complianceGapAnalyzer({
    framework: gapForm.framework,
    target_assertion: gapForm.target_assertion || null,
    current_controls: gapForm.current_controls.split('\n').map(s => s.trim()).filter(Boolean),
  }));
  const runChain = () => wrap(() => {
    let chain;
    try { chain = JSON.parse(chainForm.chainJson); }
    catch (e) { throw new Error('Invalid JSON in evidence chain field'); }
    if (!Array.isArray(chain)) throw new Error('Chain must be a JSON array');
    return ai.evidenceChainValidator(chain);
  });

  const inp = { display: 'block', width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4, fontFamily: 'inherit', fontSize: 14 };
  const btn = { padding: '8px 14px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' };

  return (
    <div className="page-container" style={{ padding: 24 }}>
      <h1>Advanced AI Tools</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Four audit-driven features added per audit recommendations.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => onTab(t.key)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 6,
              background: tab === t.key ? '#1a3a5c' : '#fff',
              color: tab === t.key ? '#fff' : '#1a3a5c',
              cursor: 'pointer'
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          {tab === 'classifier' && <FullFieldPresets value={findingForm} presets={EXAMPLES.classifier.map((values, i) => ({ label: ['Cash review', 'Access removal', 'Journal entries'][i], values }))} onChange={setFindingForm} />}
          {tab === 'linker' && <FullFieldPresets value={linkerForm} presets={EXAMPLES.linker.map((values, i) => ({ label: ['Inventory', 'Revenue', 'Cash'][i], values }))} onChange={setLinkerForm} />}
          {tab === 'gap' && <FullFieldPresets value={gapForm} presets={EXAMPLES.gap.map((values, i) => ({ label: ['SOX revenue', 'SOC 2 access', 'COSO monitoring'][i], values }))} onChange={setGapForm} />}
          {tab === 'chain' && <FullFieldPresets value={chainForm} presets={EXAMPLES.chain.map((values, i) => ({ label: ['Bank evidence', 'Inventory evidence', 'Invoice evidence'][i], values }))} onChange={setChainForm} />}
          {tab === 'classifier' && (
            <>
              <h3>Classify Finding Severity</h3>
              <p style={{ fontSize: 13, color: '#555' }}>Apply AS 2201 / SAS 130 criteria to categorize as Pass-through, Significant Deficiency, Material Weakness, or Critical.</p>
              <input placeholder="Title" value={findingForm.title}
                onChange={e => setFindingForm({ ...findingForm, title: e.target.value })} style={inp} />
              <textarea rows={3} placeholder="Condition (the observable fact)" value={findingForm.condition}
                onChange={e => setFindingForm({ ...findingForm, condition: e.target.value })} style={inp} />
              <textarea rows={2} placeholder="Criteria (what should be)" value={findingForm.criteria}
                onChange={e => setFindingForm({ ...findingForm, criteria: e.target.value })} style={inp} />
              <textarea rows={2} placeholder="Cause" value={findingForm.cause}
                onChange={e => setFindingForm({ ...findingForm, cause: e.target.value })} style={inp} />
              <textarea rows={2} placeholder="Effect" value={findingForm.effect}
                onChange={e => setFindingForm({ ...findingForm, effect: e.target.value })} style={inp} />
              <select value={findingForm.severity} onChange={e => setFindingForm({ ...findingForm, severity: e.target.value })} style={inp}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <button onClick={runClassifier} disabled={loading} style={btn}>Classify Finding</button>
            </>
          )}
          {tab === 'linker' && (
            <>
              <h3>Cross-Audit Risk Linker</h3>
              <p style={{ fontSize: 13, color: '#555' }}>Detect systemic patterns across findings filtered by industry / audit area within a lookback window.</p>
              <input placeholder="Industry filter (optional)" value={linkerForm.industry}
                onChange={e => setLinkerForm({ ...linkerForm, industry: e.target.value })} style={inp} />
              <input placeholder="Audit area filter (optional)" value={linkerForm.audit_area}
                onChange={e => setLinkerForm({ ...linkerForm, audit_area: e.target.value })} style={inp} />
              <input type="number" placeholder="Lookback days" value={linkerForm.lookback_days}
                onChange={e => setLinkerForm({ ...linkerForm, lookback_days: e.target.value })} style={inp} />
              <button onClick={runLinker} disabled={loading} style={btn}>Link Risks</button>
            </>
          )}
          {tab === 'gap' && (
            <>
              <h3>Compliance Gap Analyzer</h3>
              <p style={{ fontSize: 13, color: '#555' }}>Compare your control list against a framework (SOC2, SOX, HIPAA, GDPR, PCI-DSS, NIST, COSO).</p>
              <select value={gapForm.framework} onChange={e => setGapForm({ ...gapForm, framework: e.target.value })} style={inp}>
                <option>COSO</option><option>SOX</option><option>SOC2</option>
                <option>HIPAA</option><option>GDPR</option><option>PCI-DSS</option><option>NIST</option>
              </select>
              <input placeholder="Target assertion / scope (optional)" value={gapForm.target_assertion}
                onChange={e => setGapForm({ ...gapForm, target_assertion: e.target.value })} style={inp} />
              <textarea rows={8} placeholder="Current controls — one per line"
                value={gapForm.current_controls}
                onChange={e => setGapForm({ ...gapForm, current_controls: e.target.value })} style={inp} />
              <button onClick={runGap} disabled={loading} style={btn}>Analyze Gaps</button>
            </>
          )}
          {tab === 'chain' && (
            <>
              <h3>Evidence Chain Validator</h3>
              <p style={{ fontSize: 13, color: '#555' }}>Validate a JSON array of evidence items for completeness, source, collector, timestamp, and parent linkage.</p>
              <textarea rows={14} placeholder="JSON array of evidence items"
                value={chainForm.chainJson}
                onChange={e => setChainForm({ chainJson: e.target.value })}
                style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={runChain} disabled={loading} style={btn}>Validate Chain</button>
            </>
          )}

          {loading && <p style={{ marginTop: 8, color: '#555' }}>Working...</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <h3>Result</h3>
          {!result && <p style={{ color: '#888' }}>Run a tool to see the response.</p>}
          {result && (
            <GeneratedAiResponse response={result} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvancedAIToolsPage;
