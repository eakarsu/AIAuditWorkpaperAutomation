const pool = require('../db');

function auditLog(module) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only log successful mutations
      if (res.statusCode < 400) {
        const method = req.method;
        let action = null;
        let recordTitle = null;
        let recordId = null;
        let details = null;

        if (method === 'POST' && !req.path.includes('/login')) {
          action = 'CREATE';
          recordTitle = data?.title || data?.name || null;
          recordId = data?.id || null;
          details = `Created new ${module.toLowerCase()} item`;
        } else if (method === 'PUT') {
          action = 'UPDATE';
          recordTitle = data?.title || data?.name || null;
          recordId = data?.id || parseInt(req.params.id) || null;
          details = `Updated ${module.toLowerCase()} item`;
        } else if (method === 'DELETE') {
          action = 'DELETE';
          recordId = parseInt(req.params.id) || null;
          details = `Deleted ${module.toLowerCase()} item`;
        }

        if (action) {
          const performedBy = req.user?.name || 'System';
          pool.query(
            `INSERT INTO audit_trail (action, module, record_id, record_title, details, performed_by) VALUES ($1, $2, $3, $4, $5, $6)`,
            [action, module, recordId, recordTitle, details, performedBy]
          ).catch(err => console.error('Audit log error:', err.message));
        }
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = auditLog;
