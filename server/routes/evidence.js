const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all evidence
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM audit_evidence ORDER BY created_at DESC'
    );
    res.json(result.rows);
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
router.post('/', auth, async (req, res) => {
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
router.put('/:id', auth, async (req, res) => {
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
