import React from 'react';

export function fillEveryField(values, variant = 0, choices = {}) {
  const scenarios = ['Revenue cutoff review', 'Inventory count review', 'Cash reconciliation review'];
  const scenario = scenarios[variant % scenarios.length];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    // References and browser File objects must come from an actual selection.
    if (/(^id$|_id$|^file$|_file$|files$|attachment|upload|created_at|updated_at|user_id)/i.test(key) || (typeof File !== 'undefined' && value instanceof File) || (typeof Blob !== 'undefined' && value instanceof Blob)) return [key, value];
    if (choices[key]?.length) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`Illustrative ${scenario.toLowerCase()} observation`, 'Confirm supporting records and reviewer signoff']];
    if (value && typeof value === 'object') return [key, { scenario, evidence_status: 'Pending verification' }];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, key === 'scheduled_date' ? 16 : 10)];
    if (/email/.test(key)) return [key, `reviewer${variant + 1}@example.com`];
    if (/budget|price|cost|amount/.test(key)) return [key, [12000, 8500, 6500][variant % 3]];
    if (typeof value === 'number') return [key, [3, 2, 5][variant]];
    if (/location|address|market/.test(key)) return [key, ['Head office', 'Primary warehouse', 'Treasury office'][variant % 3]];
    if (/status/.test(key)) return [key, 'Pending'];
    if (/tone/.test(key)) return [key, 'Professional'];
    if (/type/.test(key)) return [key, 'Audit review'];
    if (/title|name/.test(key)) return [key, scenario];
    return [key, `${scenario}: illustrative audit context. Confirm actual records, exceptions, and approvals before drawing a conclusion.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Wedding example', 'Portrait example', 'Commercial example'];
  return <div className="ai-preset-bar"><div><strong>Fill every field</strong><p>Each example fills required and optional fields. Review and edit before generating.</p></div><div className="ai-actions">{labels.map((label, index) => <button type="button" className="btn btn-secondary" key={label} disabled={disabled} onClick={() => onChange(presets ? { ...value, ...presets[index].values } : fillEveryField(value, index, choices))}>{label}</button>)}</div></div>;
}
