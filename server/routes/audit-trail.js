const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all audit trail entries (with pagination)
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, module, action } = req.query;
    let query = 'SELECT * FROM audit_trail';
    const params = [];
    const conditions = [];

    if (module) {
      params.push(module);
      conditions.push(`module = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    params.push(Number(limit));
    query += ` LIMIT $${params.length}`;
    params.push(Number(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_trail';
    const countParams = [];
    if (module) {
      countParams.push(module);
      countQuery += ` WHERE module = $${countParams.length}`;
    }
    if (action) {
      if (countParams.length > 0) countQuery += ' AND';
      else countQuery += ' WHERE';
      countParams.push(action);
      countQuery += ` action = $${countParams.length}`;
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [byModule, byAction, recent] = await Promise.all([
      pool.query(`SELECT module, COUNT(*) as count FROM audit_trail GROUP BY module ORDER BY count DESC`),
      pool.query(`SELECT action, COUNT(*) as count FROM audit_trail GROUP BY action ORDER BY count DESC`),
      pool.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM audit_trail WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`)
    ]);

    res.json({
      byModule: byModule.rows,
      byAction: byAction.rows,
      dailyActivity: recent.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
