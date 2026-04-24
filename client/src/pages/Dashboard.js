import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidence, sampling, workpapers, findings, checklists } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    evidence: 0, sampling: 0, workpapers: 0, findings: 0, checklists: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [findingsData, setFindingsData] = useState([]);
  const [checklistsData, setChecklistsData] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ev, sa, wp, fi, ch] = await Promise.all([
          evidence.getAll(), sampling.getAll(), workpapers.getAll(),
          findings.getAll(), checklists.getAll()
        ]);
        setStats({
          evidence: ev.length, sampling: sa.length, workpapers: wp.length,
          findings: fi.length, checklists: ch.length
        });
        setFindingsData(fi);
        setChecklistsData(ch);
      } catch (err) { console.error(err); }
    };

    const loadActivity = async () => {
      try {
        const res = await fetch(`${API_BASE}/audit-trail?limit=8`, { headers: getHeaders() });
        const data = await res.json();
        setRecentActivity(data.entries || []);
      } catch (err) { console.error(err); }
    };

    loadStats();
    loadActivity();
  }, []);

  // Compute quick stats
  const openFindings = findingsData.filter(f => f.status === 'Open').length;
  const highSeverityFindings = findingsData.filter(f => f.severity === 'High' || f.severity === 'Critical').length;
  const nonCompliant = checklistsData.filter(c => c.compliance_status === 'Non-Compliant').length;
  const overdueItems = [...findingsData, ...checklistsData].filter(item => {
    const due = item.due_date;
    const status = item.status || item.compliance_status;
    return due && new Date(due) < new Date() && status !== 'Closed' && status !== 'Compliant';
  }).length;

  const cards = [
    { key: 'evidence', path: '/evidence', icon: 'fa-solid fa-file-shield', title: 'Audit Evidence', description: 'Collect, organize, and analyze audit evidence with quality assessment and risk evaluation.', count: stats.evidence, label: 'Evidence Items' },
    { key: 'sampling', path: '/sampling', icon: 'fa-solid fa-chart-pie', title: 'Statistical Sampling', description: 'Design statistically valid sampling plans with optimized sample sizes and methodology.', count: stats.sampling, label: 'Sampling Plans' },
    { key: 'workpapers', path: '/workpapers', icon: 'fa-solid fa-file-lines', title: 'Workpaper Generation', description: 'Generate comprehensive audit workpapers with procedures, objectives, and conclusions.', count: stats.workpapers, label: 'Workpapers' },
    { key: 'findings', path: '/findings', icon: 'fa-solid fa-magnifying-glass-chart', title: 'Finding Documentation', description: 'Document audit findings with root cause analysis and remediation recommendations.', count: stats.findings, label: 'Findings' },
    { key: 'checklists', path: '/checklists', icon: 'fa-solid fa-clipboard-check', title: 'Compliance Checklists', description: 'Compliance assessments across SOX, SOC 2, HIPAA, PCI-DSS, and GDPR frameworks.', count: stats.checklists, label: 'Checklist Items' },
  ];

  const actionColor = (action) => {
    switch (action) {
      case 'CREATE': return '#34d399';
      case 'UPDATE': return '#60a5fa';
      case 'DELETE': return '#f87171';
      default: return '#94a3b8';
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Audit Workpaper Automation Platform</p>
        </div>
      </div>

      {/* Quick Alert Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.evidence}</div>
          <div className="stat-label">Evidence Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.workpapers}</div>
          <div className="stat-label">Workpapers</div>
        </div>
        <div className="stat-card" style={openFindings > 0 ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}>
          <div className="stat-value" style={openFindings > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>{openFindings}</div>
          <div className="stat-label">Open Findings</div>
        </div>
        <div className="stat-card" style={highSeverityFindings > 0 ? { borderColor: 'rgba(245,158,11,0.4)' } : {}}>
          <div className="stat-value" style={highSeverityFindings > 0 ? { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>{highSeverityFindings}</div>
          <div className="stat-label">High/Critical Findings</div>
        </div>
        <div className="stat-card" style={overdueItems > 0 ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}>
          <div className="stat-value" style={overdueItems > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>{overdueItems}</div>
          <div className="stat-label">Overdue Items</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map(card => (
          <div key={card.key} className={`dashboard-card ${card.key}`} onClick={() => navigate(card.path)}>
            <div className="card-icon"><i className={card.icon}></i></div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <div className="card-stats">
              <div className="card-stat"><span>{card.count}</span>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row: Recent Activity + Quick Stats */}
      <div className="dashboard-bottom-row">
        {/* Recent Activity */}
        <div className="data-section dashboard-activity">
          <div className="data-header">
            <h2><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 8, color: '#38bdf8' }}></i>Recent Activity</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/audit-trail')}>
              View All <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4 }}></i>
            </button>
          </div>
          <div style={{ padding: '8px 20px' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No recent activity</div>
            ) : (
              recentActivity.map(entry => (
                <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(71,85,105,0.12)', alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor(entry.action), flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                      <strong style={{ color: actionColor(entry.action) }}>{entry.action}</strong>
                      {' '}{entry.record_title || entry.module}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{entry.performed_by} &middot; {timeAgo(entry.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Overview */}
        <div className="data-section dashboard-overview">
          <div className="data-header">
            <h2><i className="fa-solid fa-chart-bar" style={{ marginRight: 8, color: '#a78bfa' }}></i>Quick Overview</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reports')}>
              Full Report <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4 }}></i>
            </button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div className="overview-item">
              <span className="overview-label">Total Sampling Plans</span>
              <span className="overview-value">{stats.sampling}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Compliance Items</span>
              <span className="overview-value">{stats.checklists}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Non-Compliant Items</span>
              <span className="overview-value" style={{ color: nonCompliant > 0 ? '#f87171' : '#34d399' }}>{nonCompliant}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Findings in Remediation</span>
              <span className="overview-value" style={{ color: '#a78bfa' }}>{findingsData.filter(f => f.status === 'Remediation Planned').length}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Closed Findings</span>
              <span className="overview-value" style={{ color: '#34d399' }}>{findingsData.filter(f => f.status === 'Closed').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
