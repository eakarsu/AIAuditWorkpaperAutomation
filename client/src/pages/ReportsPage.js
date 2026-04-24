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

function BarChart({ data, colorMap, title }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => parseInt(d.count)));
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {data.map((item, i) => {
          const label = item.status || item.severity || item.risk_level || item.framework || item.compliance_status || item.action || item.module || 'Unknown';
          const color = colorMap[label] || '#64748b';
          const pct = max > 0 ? (parseInt(item.count) / max) * 100 : 0;
          return (
            <div key={i} className="bar-row">
              <div className="bar-label">{label}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%`, background: color }}></div>
              </div>
              <div className="bar-value">{item.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/reports/summary`, { headers: getHeaders() });
        setReport(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportCSV = async (module) => {
    setExporting(module);
    try {
      const res = await fetch(`${API_BASE}/reports/export/${module}`, { headers: getHeaders() });
      const data = await res.json();
      if (!data.length) { setExporting(''); return; }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          let val = row[h] == null ? '' : String(row[h]);
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        }).join(','))
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting('');
    }
  };

  const statusColors = {
    'Verified': '#34d399', 'Completed': '#34d399', 'Compliant': '#34d399', 'Closed': '#34d399',
    'In Progress': '#60a5fa', 'Partially Compliant': '#60a5fa',
    'Pending': '#fbbf24', 'Pending Review': '#fbbf24', 'Planned': '#fbbf24', 'Draft': '#fbbf24', 'Not Started': '#fbbf24',
    'Open': '#f87171', 'Non-Compliant': '#f87171',
    'Remediation Planned': '#a78bfa'
  };

  const severityColors = {
    'Critical': '#ef4444', 'High': '#f87171', 'Medium': '#fbbf24', 'Low': '#34d399'
  };

  const riskColors = {
    'High': '#f87171', 'Medium': '#fbbf24', 'Low': '#34d399'
  };

  const frameworkColors = {
    'SOX': '#60a5fa', 'SOC 2': '#a78bfa', 'HIPAA': '#f87171', 'PCI-DSS': '#fbbf24',
    'GDPR': '#34d399', 'BSA/AML': '#fb923c', 'IIA Standards': '#38bdf8'
  };

  if (loading) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
        <div className="page-header"><div><h1>Reports & Analytics</h1></div></div>
        <div className="empty-state"><div className="ai-loading"><div className="spinner"></div> Loading report data...</div></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
        <div className="page-header"><div><h1>Reports & Analytics</h1></div></div>
        <div className="empty-state"><i className="fa-solid fa-chart-bar"></i><h3>Failed to load report data</h3></div>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-chart-bar" style={{ color: '#38bdf8', marginRight: 12 }}></i>Reports & Analytics</h1>
          <p>Comprehensive audit status overview with data export capabilities</p>
        </div>
      </div>

      {/* Overdue Alerts */}
      {(report.overdue.findings > 0 || report.overdue.checklists > 0) && (
        <div className="alert-banner">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            {report.overdue.findings > 0 && <strong>{report.overdue.findings} overdue finding{report.overdue.findings > 1 ? 's' : ''}</strong>}
            {report.overdue.findings > 0 && report.overdue.checklists > 0 && ' and '}
            {report.overdue.checklists > 0 && <strong>{report.overdue.checklists} overdue checklist item{report.overdue.checklists > 1 ? 's' : ''}</strong>}
            {' '}require attention
          </span>
        </div>
      )}

      {/* Export Section */}
      <div className="export-section">
        <div className="export-header">
          <i className="fa-solid fa-file-export"></i>
          <h3>Export Data</h3>
        </div>
        <div className="export-buttons">
          {['evidence', 'sampling', 'workpapers', 'findings', 'checklists'].map(mod => (
            <button
              key={mod}
              className="btn btn-secondary btn-sm"
              onClick={() => exportCSV(mod)}
              disabled={!!exporting}
            >
              <i className={exporting === mod ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'}></i>
              {mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="reports-grid">
        <BarChart data={report.findings.bySeverity} colorMap={severityColors} title="Findings by Severity" />
        <BarChart data={report.findings.byStatus} colorMap={statusColors} title="Findings by Status" />
        <BarChart data={report.evidence.byStatus} colorMap={statusColors} title="Evidence by Status" />
        <BarChart data={report.evidence.byRisk} colorMap={riskColors} title="Evidence by Risk Level" />
        <BarChart data={report.workpapers.byStatus} colorMap={statusColors} title="Workpapers by Status" />
        <BarChart data={report.sampling.byStatus} colorMap={statusColors} title="Sampling Plans by Status" />
        <BarChart data={report.checklists.byFramework} colorMap={frameworkColors} title="Checklists by Framework" />
        <BarChart data={report.checklists.byCompliance} colorMap={statusColors} title="Checklists by Compliance Status" />
      </div>

      {/* Upcoming Due Dates */}
      {report.upcomingDueDates && report.upcomingDueDates.length > 0 && (
        <div className="data-section" style={{ marginTop: 24 }}>
          <div className="data-header">
            <h2><i className="fa-solid fa-calendar-days" style={{ marginRight: 8, color: '#fbbf24' }}></i>Upcoming Due Dates</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Type</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {report.upcomingDueDates.map((item, i) => {
                const isOverdue = item.due_date && new Date(item.due_date) < new Date();
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 6, background: item.type === 'Finding' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: item.type === 'Finding' ? '#fbbf24' : '#f87171', fontSize: 12, fontWeight: 600 }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ color: isOverdue ? '#f87171' : '#cbd5e1', fontWeight: isOverdue ? 700 : 400 }}>
                      {isOverdue && <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6, color: '#f87171' }}></i>}
                      {new Date(item.due_date).toLocaleDateString()}
                    </td>
                    <td><span className={`status-badge ${(item.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
