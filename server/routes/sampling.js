const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ── Z-score lookup for common confidence levels ──────────────────────────
const Z_SCORES = { 80: 1.282, 85: 1.440, 90: 1.645, 95: 1.960, 97.5: 2.241, 99: 2.576 };

function getZScore(confidenceLevel) {
  const cl = parseFloat(confidenceLevel);
  if (Z_SCORES[cl]) return Z_SCORES[cl];
  // Nearest available
  const keys = Object.keys(Z_SCORES).map(Number).sort((a, b) => a - b);
  const nearest = keys.reduce((prev, cur) => Math.abs(cur - cl) < Math.abs(prev - cl) ? cur : prev);
  return Z_SCORES[nearest];
}

// ── POST /api/sampling/calculate ─────────────────────────────────────────
// Pure-math sampling calculator — no AI call, always fast and deterministic
router.post('/calculate', auth, (req, res) => {
  try {
    const {
      confidence_level = 95,     // % e.g. 95
      expected_error_rate = 5,   // % e.g. 5
      tolerable_error_rate = 10, // % (for attribute sampling)
      population_size,           // total population items
      population_value,          // total $ population (for MUS)
      materiality,               // $ materiality threshold (for MUS)
      sampling_type = 'attribute' // 'attribute', 'mus', or 'classical'
    } = req.body;

    if (parseFloat(confidence_level) < 50 || parseFloat(confidence_level) > 99.9) {
      return res.status(400).json({ error: 'confidence_level must be between 50 and 99.9' });
    }

    const Z = getZScore(confidence_level);
    const p = parseFloat(expected_error_rate) / 100;
    const e = parseFloat(tolerable_error_rate) / 100;

    // ── Classical attribute formula: n = Z² × p × (1-p) / e² ────────────
    const classicalUnbounded = Math.ceil((Z * Z * p * (1 - p)) / (e * e));

    let classicalFinal = classicalUnbounded;
    let finiteCorrectionApplied = false;
    if (population_size) {
      const N = parseInt(population_size);
      // Finite population correction: n' = n / (1 + (n-1)/N)
      classicalFinal = Math.ceil(classicalUnbounded / (1 + (classicalUnbounded - 1) / N));
      finiteCorrectionApplied = true;
    }

    // ── Monetary Unit Sampling (MUS) ─────────────────────────────────────
    let mus = null;
    if (population_value && materiality) {
      const BV = parseFloat(population_value);
      const TM = parseFloat(materiality);
      // Reliability factor at confidence level (approximation)
      const reliabilityFactor = -Math.log(1 - parseFloat(confidence_level) / 100);
      const samplingInterval = TM / reliabilityFactor;
      const musSampleSize = Math.ceil(BV / samplingInterval);
      mus = {
        sample_size: musSampleSize,
        sampling_interval: Math.round(samplingInterval * 100) / 100,
        reliability_factor: Math.round(reliabilityFactor * 1000) / 1000,
        population_value: BV,
        materiality: TM
      };
    }

    // ── Attribute sampling with finite correction ────────────────────────
    const attribute = {
      sample_size: classicalFinal,
      unbounded_sample_size: classicalUnbounded,
      finite_correction_applied: finiteCorrectionApplied,
      z_score: Z,
      confidence_level: parseFloat(confidence_level),
      expected_error_rate: parseFloat(expected_error_rate),
      tolerable_error_rate: parseFloat(tolerable_error_rate),
      population_size: population_size ? parseInt(population_size) : null
    };

    res.json({
      success: true,
      sampling_type,
      inputs: { confidence_level, expected_error_rate, tolerable_error_rate, population_size, population_value, materiality },
      attribute,
      monetary_unit_sampling: mus,
      formulas: {
        classical: 'n = Z² × p × (1-p) / e²  with finite correction: n\' = n / (1 + (n-1)/N)',
        mus: 'sampling_interval = materiality / reliability_factor  where reliability_factor = -ln(1 - confidence_level)'
      },
      standards_reference: ['ISA 530', 'AICPA AU-C 530']
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sampling plans — paginated when ?page/?paginated=true/?limit is supplied; raw array otherwise.
router.get('/', auth, async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.paginated === 'true' || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    if (!wantsPagination) {
      const all = await pool.query('SELECT * FROM statistical_sampling ORDER BY created_at DESC');
      return res.json(all.rows);
    }

    const result = await pool.query(
      'SELECT * FROM statistical_sampling ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM statistical_sampling');
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
