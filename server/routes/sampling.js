const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all sampling plans
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM statistical_sampling ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single sampling plan
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM statistical_sampling WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sampling plan
router.post('/', auth, async (req, res) => {
  try {
    const { title, population_size, sample_size, confidence_level, sampling_method, audit_area, status, materiality_threshold, tolerable_error, expected_error_rate, description, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO statistical_sampling (title, population_size, sample_size, confidence_level, sampling_method, audit_area, status, materiality_threshold, tolerable_error, expected_error_rate, description, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, population_size, sample_size, confidence_level, sampling_method, audit_area, status || 'Planned', materiality_threshold, tolerable_error, expected_error_rate, description, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update sampling plan
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, population_size, sample_size, confidence_level, sampling_method, audit_area, status, materiality_threshold, tolerable_error, expected_error_rate, description, notes } = req.body;
    const result = await pool.query(
      `UPDATE statistical_sampling SET title=$1, population_size=$2, sample_size=$3, confidence_level=$4, sampling_method=$5, audit_area=$6, status=$7, materiality_threshold=$8, tolerable_error=$9, expected_error_rate=$10, description=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, population_size, sample_size, confidence_level, sampling_method, audit_area, status, materiality_threshold, tolerable_error, expected_error_rate, description, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete sampling plan
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM statistical_sampling WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
