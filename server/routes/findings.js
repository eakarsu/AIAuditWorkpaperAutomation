const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all findings — paginated when ?page/?paginated=true/?limit is supplied; raw array otherwise.
router.get('/', auth, async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.paginated === 'true' || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = req.query.search || null;
    const severity = req.query.severity || null;
    const status = req.query.status || null;

    const conds = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(title ILIKE $${params.length} OR condition ILIKE $${params.length})`);
    }
    if (severity) {
      params.push(severity);
      conds.push(`severity = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    if (!wantsPagination) {
      const all = await pool.query(`SELECT * FROM audit_findings ${where} ORDER BY created_at DESC`, params);
      return res.json(all.rows);
    }

    const cParams = [...params];
    params.push(limit); const lp = `$${params.length}`;
    params.push(offset); const op = `$${params.length}`;
    const result = await pool.query(
      `SELECT * FROM audit_findings ${where} ORDER BY created_at DESC LIMIT ${lp} OFFSET ${op}`,
      params
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_findings ${where}`,
      cParams
    );

    res.json({
      data: result.rows,
      pagination: {
        page, limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single finding
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_findings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create finding
router.post('/', auth, async (req, res) => {
  try {
    const { title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status, assigned_to, due_date, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_findings (title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status, assigned_to, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status || 'Open', assigned_to, due_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update finding
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status, assigned_to, due_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE audit_findings SET title=$1, finding_type=$2, severity=$3, audit_area=$4, condition=$5, criteria=$6, cause=$7, effect=$8, recommendation=$9, management_response=$10, status=$11, assigned_to=$12, due_date=$13, notes=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status, assigned_to, due_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete finding
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM audit_findings WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
