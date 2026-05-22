require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const evidenceRoutes = require('./routes/evidence');
const samplingRoutes = require('./routes/sampling');
const workpaperRoutes = require('./routes/workpapers');
const findingsRoutes = require('./routes/findings');
const checklistRoutes = require('./routes/checklists');
const aiRoutes = require('./routes/ai');
const auditTrailRoutes = require('./routes/audit-trail');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const extensionsRoutes = require('./routes/extensions'); // Apply pass 5
const auditLog = require('./middleware/audit-log');

const app = express();
const PORT = process.env.API_PORT || 4001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow React build to load inline scripts
  crossOriginEmbedderPolicy: false
}));

// Env-driven CORS (CORS_ORIGINS comma-separated; * by default in dev)
const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../client/build')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/evidence', auditLog('Evidence'), evidenceRoutes);
app.use('/api/sampling', auditLog('Sampling'), samplingRoutes);
app.use('/api/workpapers', auditLog('Workpapers'), workpaperRoutes);
app.use('/api/findings', auditLog('Findings'), findingsRoutes);
app.use('/api/checklists', auditLog('Checklists'), checklistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ext', extensionsRoutes); // Apply pass 5 — additive backlog
app.use('/api/pbc-aging-risk', require('./routes/pbcAgingRisk'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Audit Workpaper API running on port ${PORT}`);
});

// BATCH_00_AUDIT_MOUNTS
app.use('/api/gl-analysis', require('./routes/glAnalysis'));
app.use('/api/continuous-audit', require('./routes/continuousAudit'));
app.use('/api/xbrl-parse', require('./routes/xbrlParse'));
app.use('/api/erp-bridge', require('./routes/erpBridge'));
app.use('/api/multi-firm-collab', require('./routes/multiFirmCollab'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-account-analysis-detecting-unusual', require('./routes/gap_ai_account_analysis_detecting_unusual'));
app.use('/api/gap-limited-ai-audit-risk-assessment', require('./routes/gap_limited_ai_audit_risk_assessment'));
app.use('/api/gap-ai-sampling-strategy-recommendation', require('./routes/gap_ai_sampling_strategy_recommendation'));
app.use('/api/gap-ai-auditor-coaching-prior-year', require('./routes/gap_ai_auditor_coaching_prior_year'));
app.use('/api/gap-live-erp-accounting-system-integration', require('./routes/gap_live_erp_accounting_system_integration'));
app.use('/api/gap-external-confirmation-workflow-third-party', require('./routes/gap_external_confirmation_workflow_third_party'));
app.use('/api/gap-continuous-auditing-real-time-monitoring', require('./routes/gap_continuous_auditing_real_time_monitoring'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
app.use('/api/gap-client-portal-evidence-requests', require('./routes/gap_client_portal_evidence_requests'));
