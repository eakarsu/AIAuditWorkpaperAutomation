require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
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
const auditLog = require('./middleware/audit-log');

const app = express();
const PORT = process.env.API_PORT || 4001;

app.use(cors());
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
