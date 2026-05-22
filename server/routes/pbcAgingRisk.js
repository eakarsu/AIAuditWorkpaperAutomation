const router = require('express').Router();

router.post('/score', (req, res) => {
  const { openRequests = 0, overdueRequests = 0, avgAgeDays = 0, criticalEvidenceMissing = 0 } = req.body || {};
  const score = Math.min(100, Math.round(
    Number(openRequests) * 2 +
    Number(overdueRequests) * 9 +
    Number(avgAgeDays) * 1.2 +
    Number(criticalEvidenceMissing) * 18
  ));
  res.json({
    feature: 'pbc_aging_risk',
    score,
    level: score >= 70 ? 'escalate' : score >= 40 ? 'watch' : 'controlled',
    actions: [
      Number(overdueRequests) > 0 && 'Escalate overdue PBC requests to engagement owner.',
      Number(criticalEvidenceMissing) > 0 && 'Prioritize missing critical evidence before signoff.',
      Number(avgAgeDays) > 14 && 'Refresh request due dates and client reminders.',
    ].filter(Boolean),
  });
});

module.exports = router;
