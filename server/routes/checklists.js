const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all checklists — paginated when ?page/?paginated=true/?limit is supplied; raw array otherwise.
router.get('/', auth, async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.paginated === 'true' || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    if (!wantsPagination) {
      const all = await pool.query('SELECT * FROM compliance_checklists ORDER BY created_at DESC');
      return res.json(all.rows);
    }

    const result = await pool.query(
      'SELECT * FROM compliance_checklists ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM compliance_checklists');
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

// Get single checklist
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_checklists WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create checklist
router.post('/', auth, async (req, res) => {
  try {
    const { title, framework, category, requirement, description, compliance_status, evidence_reference, assigned_to, due_date, priority, regulation_reference, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_checklists (title, framework, category, requirement, description, compliance_status, evidence_reference, assigned_to, due_date, priority, regulation_reference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, framework, category, requirement, description, compliance_status || 'Not Started', evidence_reference, assigned_to, due_date, priority || 'Medium', regulation_reference, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update checklist
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, framework, category, requirement, description, compliance_status, evidence_reference, assigned_to, due_date, priority, regulation_reference, notes } = req.body;
    const result = await pool.query(
      `UPDATE compliance_checklists SET title=$1, framework=$2, category=$3, requirement=$4, description=$5, compliance_status=$6, evidence_reference=$7, assigned_to=$8, due_date=$9, priority=$10, regulation_reference=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, framework, category, requirement, description, compliance_status, evidence_reference, assigned_to, due_date, priority, regulation_reference, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete checklist
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_checklists WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
