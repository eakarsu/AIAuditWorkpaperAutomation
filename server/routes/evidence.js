const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const VALID_EVIDENCE_TYPES = [
  'Document', 'Physical', 'Observation', 'Confirmation', 'Recalculation',
  'Reperformance', 'Analytical', 'Inquiry', 'Electronic', 'Other'
];

const evidenceValidation = [
  body('evidence_type')
    .notEmpty().withMessage('evidence_type is required')
    .isIn(VALID_EVIDENCE_TYPES).withMessage(`evidence_type must be one of: ${VALID_EVIDENCE_TYPES.join(', ')}`),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('description must not exceed 2000 characters'),
  body('risk_level')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'Low', 'Medium', 'High', 'Critical'])
    .withMessage('risk_level must be one of: low, medium, high, critical'),
  body('title')
    .notEmpty().withMessage('title is required')
    .isLength({ max: 255 }).withMessage('title must not exceed 255 characters')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => e.msg) });
  }
  next();
};

// Get all evidence — paginated when ?page/?paginated=true/?limit is supplied; raw array otherwise.
router.get('/', auth, async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.paginated === 'true' || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = req.query.search || null;
    const audit_area = req.query.audit_area || null;
    const risk_level = req.query.risk_level || null;

    const conds = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (audit_area) {
      params.push(audit_area);
      conds.push(`audit_area = $${params.length}`);
    }
    if (risk_level) {
      params.push(risk_level);
      conds.push(`risk_level = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    if (!wantsPagination) {
      const all = await pool.query(`SELECT * FROM audit_evidence ${where} ORDER BY created_at DESC`, params);
      return res.json(all.rows);
    }

    const cParams = [...params];
    params.push(limit); const lp = `$${params.length}`;
    params.push(offset); const op = `$${params.length}`;
    const result = await pool.query(
      `SELECT * FROM audit_evidence ${where} ORDER BY created_at DESC LIMIT ${lp} OFFSET ${op}`,
      params
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_evidence ${where}`,
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

// Get single evidence
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_evidence WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create evidence
router.post('/', auth, evidenceValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, description, source, evidence_type, status, audit_area, risk_level, collected_by, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_evidence (title, description, source, evidence_type, status, audit_area, risk_level, collected_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, source, evidence_type, status || 'Pending', audit_area, risk_level || 'Medium', collected_by, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update evidence
router.put('/:id', auth, evidenceValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, description, source, evidence_type, status, audit_area, risk_level, collected_by, notes } = req.body;
    const result = await pool.query(
      `UPDATE audit_evidence SET title=$1, description=$2, source=$3, evidence_type=$4, status=$5, audit_area=$6, risk_level=$7, collected_by=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, source, evidence_type, status, audit_area, risk_level, collected_by, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete evidence
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM audit_evidence WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
