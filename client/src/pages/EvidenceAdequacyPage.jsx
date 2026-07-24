import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidence } from '../services/api';
import AIResponse from '../components/AIResponse';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function EvidenceAdequacyPage() {
  const navigate = useNavigate();
  const [evidenceList, setEvidenceList] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState('');
  const [auditObjective, setAuditObjective] = useState('');
  const [scoreResult, setScoreResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState('');

  const loadEvidence = async () => {
    try {
      const data = await evidence.getAll();
      setEvidenceList(data);
    } catch (e) { console.error(e); }
  };

  const loadScores = async () => {
    try {
      const qs = confidenceFilter ? `?confidence=${confidenceFilter}` : '';
      const res = await fetch(`${API_BASE}/ai/evidence-scores${qs}`, { headers: getHeaders() });
      const data = await res.json();
      setScores(data.scores || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadEvidence(); loadScores(); }, []);
  useEffect(() => { loadScores(); }, [confidenceFilter]);

  const handleScore = async () => {
    if (!selectedEvidence || !auditObjective.trim()) {
      alert('Select an evidence item and provide an audit objective.');
      return;
    }
    const ev = evidenceList.find(e => String(e.id) === String(selectedEvidence));
    if (!ev) return;
    setLoading(true); setScoreResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/score-evidence-adequacy`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ evidence: ev, audit_objective: auditObjective, save_to_evidence: true })
      });
      const data = await res.json();
      setScoreResult(data);
      loadScores();
    } catch (e) {
      setScoreResult({ success: false, error: e.message });
    } finally { setLoading(false); }
  };

  const scoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const ScoreBar = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#cbd5e1', fontSize: 13 }}>{label}</span>
        <span style={{ color: scoreColor(value), fontWeight: 700 }}>{value}/100</span>
      </div>
      <div style={{ height: 8, background: 'rgba(148,163,184,0.15)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: scoreColor(value), transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
      </button>
      <div className="page-header">
        <div>
          <h1><i className="fa-solid fa-gauge-simple-high" style={{ color: '#a78bfa', marginRight: 12 }}></i>Evidence Adequacy Scorer</h1>
          <p>AI-driven scoring of evidence sufficiency, appropriateness, and reliability against audit objectives</p>
        </div>
      </div>

      <div className="data-section">
        <div className="data-header">
          <h2>Run Adequacy Assessment</h2>
        </div>
        <div style={{ padding: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Evidence Item</label>
              <select value={selectedEvidence} onChange={e => setSelectedEvidence(e.target.value)}>
                <option value="">— Select Evidence —</option>
                {evidenceList.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({ev.audit_area})</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Audit Objective</label>
              <textarea
                rows={3}
                placeholder="e.g., Verify completeness of accounts receivable as of period end"
                value={auditObjective}
                onChange={e => setAuditObjective(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-ai" onClick={handleScore} disabled={loading || !selectedEvidence}>
            <i className="fa-solid fa-robot"></i> {loading ? 'Scoring...' : 'Score Evidence'}
          </button>
        </div>
      </div>

      {scoreResult && scoreResult.success && scoreResult.scores && (
        <div className="data-section" style={{ marginTop: 20 }}>
          <div className="data-header"><h2>Adequacy Scores</h2></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              <div>
                <ScoreBar label="Sufficiency (ISA 500)" value={scoreResult.scores.sufficiency_score} />
                <ScoreBar label="Appropriateness (ISA 500)" value={scoreResult.scores.appropriateness_score} />
                <ScoreBar label="Reliability" value={scoreResult.scores.reliability_score} />
                <div style={{ borderTop: '1px solid rgba(139,92,246,0.3)', marginTop: 16, paddingTop: 16 }}>
                  <ScoreBar label="Overall Score" value={scoreResult.scores.overall_score} />
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: 20, background: 'rgba(139,92,246,0.1)', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Confidence Level</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(scoreResult.scores.overall_score), margin: '8px 0' }}>
                  {scoreResult.scores.confidence_level}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Model: {scoreResult.model}</div>
              </div>
            </div>
            {scoreResult.scores.gaps && scoreResult.scores.gaps.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ color: '#fca5a5', fontSize: 15, marginBottom: 8 }}><i className="fa-solid fa-triangle-exclamation"></i> Gaps</h3>
                <ul style={{ paddingLeft: 24, color: '#cbd5e1' }}>
                  {scoreResult.scores.gaps.map((g, i) => <li key={i} style={{ margin: '6px 0' }}>{g}</li>)}
                </ul>
              </div>
            )}
            {scoreResult.scores.recommendations && scoreResult.scores.recommendations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ color: '#86efac', fontSize: 15, marginBottom: 8 }}><i className="fa-solid fa-lightbulb"></i> Recommendations</h3>
                <ul style={{ paddingLeft: 24, color: '#cbd5e1' }}>
                  {scoreResult.scores.recommendations.map((r, i) => <li key={i} style={{ margin: '6px 0' }}>{r}</li>)}
                </ul>
              </div>
            )}
            {scoreResult.scores.narrative && (
              <div style={{ marginTop: 16, padding: 16, background: 'rgba(15,23,42,0.5)', borderRadius: 8 }}>
                <h3 style={{ color: '#a78bfa', fontSize: 14, marginBottom: 8 }}>Analysis</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>{scoreResult.scores.narrative}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {scoreResult && !scoreResult.success && (
        <AIResponse result={{ success: false, error: scoreResult.error }} />
      )}

      <div className="data-section" style={{ marginTop: 20 }}>
        <div className="data-header">
          <h2>Stored Adequacy Scores</h2>
          <div className="header-actions">
            <select value={confidenceFilter} onChange={e => setConfidenceFilter(e.target.value)}>
              <option value="">All Confidence Levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evidence</th>
              <th>Audit Area</th>
              <th>Sufficiency</th>
              <th>Appropriate</th>
              <th>Reliability</th>
              <th>Overall</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.evidence_title}</td>
                <td>{s.audit_area}</td>
                <td><span style={{ color: scoreColor(s.sufficiency_score) }}>{s.sufficiency_score}</span></td>
                <td><span style={{ color: scoreColor(s.appropriateness_score) }}>{s.appropriateness_score}</span></td>
                <td><span style={{ color: scoreColor(s.reliability_score) }}>{s.reliability_score}</span></td>
                <td><strong style={{ color: scoreColor(s.overall_score) }}>{s.overall_score}</strong></td>
                <td><span className={`severity-badge ${(s.confidence_level || '').toLowerCase()}`}>{s.confidence_level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {scores.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-gauge-simple"></i>
            <h3>No adequacy scores yet</h3>
            <p>Run an adequacy assessment to populate this list</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvidenceAdequacyPage;
