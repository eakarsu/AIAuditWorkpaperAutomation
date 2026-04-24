const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all workpapers
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workpapers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single workpaper
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workpapers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create workpaper
router.post('/', auth, async (req, res) => {
  try {
    const { title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status, objective, scope, procedures_performed, conclusion, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO workpapers (title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status, objective, scope, procedures_performed, conclusion, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status || 'Draft', objective, scope, procedures_performed, conclusion, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update workpaper
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status, objective, scope, procedures_performed, conclusion, notes } = req.body;
    const result = await pool.query(
      `UPDATE workpapers SET title=$1, reference_number=$2, audit_area=$3, engagement=$4, prepared_by=$5, reviewed_by=$6, status=$7, objective=$8, scope=$9, procedures_performed=$10, conclusion=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status, objective, scope, procedures_performed, conclusion, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete workpaper
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workpapers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
