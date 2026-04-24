const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get comprehensive report data
router.get('/summary', auth, async (req, res) => {
  try {
    const [
      evidenceByStatus,
      evidenceByRisk,
      findingsBySeverity,
      findingsByStatus,
      workpapersByStatus,
      checklistsByFramework,
      checklistsByCompliance,
      samplingByStatus,
      upcomingDueDates,
      overdueFindingsCount,
      overdueChecklistsCount
    ] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM audit_evidence GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT risk_level, COUNT(*) as count FROM audit_evidence GROUP BY risk_level ORDER BY count DESC`),
      pool.query(`SELECT severity, COUNT(*) as count FROM audit_findings GROUP BY severity ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) as count FROM audit_findings GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) as count FROM workpapers GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT framework, COUNT(*) as count FROM compliance_checklists GROUP BY framework ORDER BY count DESC`),
      pool.query(`SELECT compliance_status, COUNT(*) as count FROM compliance_checklists GROUP BY compliance_status ORDER BY count DESC`),
      pool.query(`SELECT status, COUNT(*) as count FROM statistical_sampling GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT title, due_date, status, 'Finding' as type FROM audit_findings WHERE due_date IS NOT NULL AND status != 'Closed' UNION ALL SELECT title, due_date, compliance_status as status, 'Checklist' as type FROM compliance_checklists WHERE due_date IS NOT NULL AND compliance_status != 'Compliant' ORDER BY due_date ASC LIMIT 20`),
      pool.query(`SELECT COUNT(*) as count FROM audit_findings WHERE due_date < NOW() AND status != 'Closed'`),
      pool.query(`SELECT COUNT(*) as count FROM compliance_checklists WHERE due_date < NOW() AND compliance_status NOT IN ('Compliant', 'Not Started')`)
    ]);

    res.json({
      evidence: { byStatus: evidenceByStatus.rows, byRisk: evidenceByRisk.rows },
      findings: { bySeverity: findingsBySeverity.rows, byStatus: findingsByStatus.rows },
      workpapers: { byStatus: workpapersByStatus.rows },
      checklists: { byFramework: checklistsByFramework.rows, byCompliance: checklistsByCompliance.rows },
      sampling: { byStatus: samplingByStatus.rows },
      upcomingDueDates: upcomingDueDates.rows,
      overdue: {
        findings: parseInt(overdueFindingsCount.rows[0].count),
        checklists: parseInt(overdueChecklistsCount.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export data as JSON (frontend converts to CSV)
router.get('/export/:module', auth, async (req, res) => {
  try {
    const { module } = req.params;
    const tableMap = {
      evidence: 'audit_evidence',
      sampling: 'statistical_sampling',
      workpapers: 'workpapers',
      findings: 'audit_findings',
      checklists: 'compliance_checklists'
    };

    const table = tableMap[module];
    if (!table) return res.status(400).json({ error: 'Invalid module' });

    const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
