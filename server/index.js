require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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
const auditTrailRoutes = require('./routes/audit-trail');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const auditLog = require('./middleware/audit-log');
const { validateRuntime } = require('./config/runtime');
validateRuntime();

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
app.use('/api', (req, res, next) => req.path === '/health' ? next() : require('./middleware/auth')(req, res, next));
app.use('/api/evidence', auditLog('Evidence'), evidenceRoutes);
app.use('/api/sampling', auditLog('Sampling'), samplingRoutes);
app.use('/api/workpapers', auditLog('Workpapers'), workpaperRoutes);
app.use('/api/findings', auditLog('Findings'), findingsRoutes);
app.use('/api/checklists', auditLog('Checklists'), checklistRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pbc-aging-risk', require('./routes/pbcAgingRisk'));
app.use('/api/governed-workpapers', require('./routes/governedWorkpapers'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Generated AI, gap, ERP, XBRL, and collaboration routes are deliberately quarantined.

app.listen(PORT, () => {
  console.log(`Audit Workpaper API running on port ${PORT}`);
});
