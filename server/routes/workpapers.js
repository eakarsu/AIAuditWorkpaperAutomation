const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all workpapers — paginated when ?page or ?paginated=true is supplied; raw array otherwise (back-compat).
router.get('/', auth, async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.paginated === 'true' || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = req.query.search || null;
    const status = req.query.status || null;

    const conds = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(title ILIKE $${params.length} OR reference_number ILIKE $${params.length} OR audit_area ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    if (!wantsPagination) {
      // Back-compat: return raw array
      const all = await pool.query(`SELECT * FROM workpapers ${where} ORDER BY created_at DESC`, params);
      return res.json(all.rows);
    }

    const cParams = [...params];
    params.push(limit); const lp = `$${params.length}`;
    params.push(offset); const op = `$${params.length}`;
    const result = await pool.query(
      `SELECT * FROM workpapers ${where} ORDER BY created_at DESC LIMIT ${lp} OFFSET ${op}`,
      params
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM workpapers ${where}`,
      cParams
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
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

// Export workpaper to PDF
router.get('/:id/export/pdf', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workpapers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const wp = result.rows[0];

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="workpaper-${wp.reference_number || wp.id}.pdf"`);
    doc.pipe(res);

    const firmName = process.env.FIRM_NAME || 'AI Audit Workpaper Automation';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Header bar
    doc.rect(50, 45, doc.page.width - 100, 60).fill('#1a3a5c');
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(firmName, 60, 58);
    doc.fontSize(10).font('Helvetica').text('AUDIT WORKPAPER', 60, 82);
    doc.moveDown(4);

    // Metadata table
    doc.fillColor('#1a3a5c').fontSize(11).font('Helvetica-Bold').text('WORKPAPER INFORMATION', { underline: true });
    doc.moveDown(0.5);

    const metaFields = [
      ['Workpaper Number', wp.reference_number || 'N/A'],
      ['Title', wp.title],
      ['Audit Area', wp.audit_area || 'N/A'],
      ['Engagement', wp.engagement || 'N/A'],
      ['Prepared By', wp.prepared_by || 'N/A'],
      ['Reviewed By', wp.reviewed_by || 'N/A'],
      ['Status', wp.status || 'Draft'],
      ['Date', today]
    ];

    doc.fillColor('black').fontSize(10).font('Helvetica');
    metaFields.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value || 'N/A');
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1);

    const section = (title, content) => {
      if (!content) return;
      doc.fillColor('#1a3a5c').fontSize(11).font('Helvetica-Bold').text(title, { underline: true });
      doc.moveDown(0.4);
      doc.fillColor('black').fontSize(10).font('Helvetica').text(content, { lineGap: 3 });
      doc.moveDown(1);
    };

    section('OBJECTIVE', wp.objective);
    section('SCOPE', wp.scope);
    section('PROCEDURES PERFORMED', wp.procedures_performed);
    section('CONCLUSION', wp.conclusion);
    if (wp.notes) section('NOTES', wp.notes);

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#666666').fontSize(8).font('Helvetica')
        .text(
          `${firmName} | CONFIDENTIAL | Page ${i - range.start + 1} of ${range.count}`,
          50, doc.page.height - 35,
          { align: 'center', width: doc.page.width - 100 }
        );
    }

    doc.end();
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
