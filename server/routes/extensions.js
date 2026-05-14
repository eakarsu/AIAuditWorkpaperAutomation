// =============================================================================
// AuditPro AI — Apply pass 5 extensions
//
// Implements remaining audit backlog from `_AUDIT_NOTE.md` as additive routes.
// All AI endpoints return 503 when OPENROUTER_API_KEY is unset/placeholder.
//
// Env vars consumed:
//   OPENROUTER_API_KEY        — gates all AI endpoints in this file
//   OPENROUTER_MODEL          — model id (defaults to claude-haiku-4.5)
//   SAP_BASE_URL, SAP_API_KEY                 — ERP: SAP integration
//   ORACLE_ERP_BASE_URL, ORACLE_ERP_API_KEY   — ERP: Oracle integration
//   NETSUITE_BASE_URL, NETSUITE_API_KEY       — ERP: NetSuite integration
//
// Tables created (CREATE TABLE IF NOT EXISTS, additive only):
//   gl_entries_pass5
//   gl_anomalies_pass5
//   risk_assessments_pass5
//   ext_confirmations_pass5
//   continuous_audit_events_pass5
//   xbrl_documents_pass5
//   audit_firm_collab_pass5
// =============================================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/openrouter');
const pool = require('../db');

// One-time additive bootstrap. Idempotent.
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gl_entries_pass5 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        entry_date DATE,
        account_code TEXT,
        account_name TEXT,
        debit NUMERIC(18,2) DEFAULT 0,
        credit NUMERIC(18,2) DEFAULT 0,
        memo TEXT,
        source TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gl_anomalies_pass5 (
        id SERIAL PRIMARY KEY,
        gl_entry_id INTEGER,
        anomaly_type TEXT,
        severity TEXT,
        score NUMERIC(5,2),
        rationale TEXT,
        detected_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS risk_assessments_pass5 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        engagement_name TEXT,
        inherent_risk_score NUMERIC(5,2),
        control_risk_score NUMERIC(5,2),
        combined_score NUMERIC(5,2),
        framework TEXT,
        rationale TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ext_confirmations_pass5 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        counterparty TEXT,
        counterparty_email TEXT,
        request_type TEXT,
        request_payload JSONB,
        status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP,
        responded_at TIMESTAMP,
        response_payload JSONB,
        token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS continuous_audit_events_pass5 (
        id SERIAL PRIMARY KEY,
        source TEXT,
        event_type TEXT,
        severity TEXT,
        payload JSONB,
        ingested_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS xbrl_documents_pass5 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        filename TEXT,
        period_end DATE,
        entity_name TEXT,
        parsed_summary JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_firm_collab_pass5 (
        id SERIAL PRIMARY KEY,
        engagement_name TEXT,
        member_email TEXT,
        role TEXT,
        invited_by INTEGER,
        status TEXT DEFAULT 'invited',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error('[extensions] schema bootstrap warn:', e.message);
  }
}
ensureSchema();

const KEY = () => process.env.OPENROUTER_API_KEY;
const hasKey = () => !!(KEY() && KEY() !== 'your_openrouter_api_key_here');

function aiUnavailable(res) {
  return res.status(503).json({
    error: 'AI service unavailable',
    missing: 'OPENROUTER_API_KEY'
  });
}

// ── 1. GL anomaly analysis (TOO-RISKY → additive ingest + AI analysis) ─────
// PRODUCT-DECISION: Accept GL entries inline (array) — no ERP connector
// required to ingest. Heavy parsing (XBRL/SFTP feeds) intentionally omitted;
// caller can paste a journal export.
router.post('/gl/ingest', auth, async (req, res) => {
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  if (entries.length === 0) return res.status(400).json({ error: 'entries[] required' });
  const inserted = [];
  for (const e of entries) {
    try {
      const r = await pool.query(
        `INSERT INTO gl_entries_pass5
         (user_id, entry_date, account_code, account_name, debit, credit, memo, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [req.user?.id || null, e.entry_date || null, e.account_code || null,
         e.account_name || null, Number(e.debit) || 0, Number(e.credit) || 0,
         e.memo || null, e.source || 'manual']
      );
      inserted.push(r.rows[0].id);
    } catch (err) { /* skip bad row */ }
  }
  res.json({ ingested: inserted.length, ids: inserted });
});

router.get('/gl/entries', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM gl_entries_pass5 WHERE user_id=$1 ORDER BY id DESC LIMIT 200`,
    [req.user?.id || null]
  );
  res.json(r.rows);
});

router.post('/ai/gl-anomaly-analyze', auth, async (req, res) => {
  if (!hasKey()) return aiUnavailable(res);
  const r = await pool.query(
    `SELECT id, entry_date, account_code, debit, credit, memo
     FROM gl_entries_pass5 WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,
    [req.user?.id || null]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: 'No GL entries to analyze. Ingest first.' });
  const prompt = `Identify anomalous GL entries (round-dollar journals, weekend/late-night posting, duplicate amounts, unusual accounts). Return a concise risk summary.\n\nEntries:\n${JSON.stringify(r.rows, null, 2)}`;
  const ai = await callOpenRouter(prompt, 'You are a forensic-accounting analyst. Be concise and conservative.');
  if (!ai.success) return res.status(502).json({ error: ai.error });
  // persist a single summary row
  try {
    await pool.query(
      `INSERT INTO gl_anomalies_pass5 (gl_entry_id, anomaly_type, severity, score, rationale)
       VALUES ($1,$2,$3,$4,$5)`,
      [null, 'batch_summary', 'info', 0, ai.response]
    );
  } catch (_) {}
  res.json({ analysis: ai.response, model: ai.model, entries_analyzed: r.rows.length });
});

// ── 2. AI inherent + control risk assessment (NEEDS-PRODUCT-DECISION) ──────
// PRODUCT-DECISION: Use COSO/ISA-315 categorical scoring (1=Low,2=Med,3=High)
// summed and normalized to 0-100. Framework field allows alternates.
router.post('/ai/risk-assessment', auth, async (req, res) => {
  if (!hasKey()) return aiUnavailable(res);
  const { engagement_name, inherent_factors, control_factors, framework } = req.body || {};
  if (!engagement_name) return res.status(400).json({ error: 'engagement_name required' });
  const fw = framework || 'ISA-315';
  const prompt = `Assess audit risk for engagement "${engagement_name}" using ${fw}. Score inherent risk and control risk on 0-100 scales and produce combined risk + key drivers.\n\nInherent factors: ${JSON.stringify(inherent_factors || {})}\nControl factors: ${JSON.stringify(control_factors || {})}\n\nReturn JSON: {"inherent":<0-100>,"control":<0-100>,"combined":<0-100>,"rationale":"..."}`;
  const ai = await callOpenRouter(prompt, 'You are a senior audit-risk methodologist.');
  if (!ai.success) return res.status(502).json({ error: ai.error });
  let parsed = {};
  try { parsed = JSON.parse((ai.response || '').match(/\{[\s\S]*\}/)?.[0] || '{}'); } catch (_) {}
  const inh = Number(parsed.inherent) || 0;
  const ctrl = Number(parsed.control) || 0;
  const comb = Number(parsed.combined) || Math.round((inh + ctrl) / 2);
  try {
    await pool.query(
      `INSERT INTO risk_assessments_pass5
       (user_id, engagement_name, inherent_risk_score, control_risk_score, combined_score, framework, rationale)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user?.id || null, engagement_name, inh, ctrl, comb, fw, parsed.rationale || ai.response]
    );
  } catch (_) {}
  res.json({ engagement_name, framework: fw, inherent: inh, control: ctrl, combined: comb,
            rationale: parsed.rationale || ai.response, model: ai.model });
});

router.get('/risk-assessments', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM risk_assessments_pass5 WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,
    [req.user?.id || null]
  );
  res.json(r.rows);
});

// ── 3. ERP integrations (NEEDS-CREDS) ──────────────────────────────────────
function erpStatus() {
  return {
    sap: { configured: !!(process.env.SAP_BASE_URL && process.env.SAP_API_KEY) },
    oracle: { configured: !!(process.env.ORACLE_ERP_BASE_URL && process.env.ORACLE_ERP_API_KEY) },
    netsuite: { configured: !!(process.env.NETSUITE_BASE_URL && process.env.NETSUITE_API_KEY) }
  };
}
router.get('/erp/status', auth, (req, res) => res.json(erpStatus()));

router.post('/erp/:vendor/sync', auth, (req, res) => {
  const v = String(req.params.vendor || '').toLowerCase();
  const map = {
    sap: ['SAP_BASE_URL', 'SAP_API_KEY'],
    oracle: ['ORACLE_ERP_BASE_URL', 'ORACLE_ERP_API_KEY'],
    netsuite: ['NETSUITE_BASE_URL', 'NETSUITE_API_KEY']
  };
  const need = map[v];
  if (!need) return res.status(400).json({ error: 'Unknown vendor (sap|oracle|netsuite)' });
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) return res.status(503).json({ error: 'ERP credentials not configured', missing: missing.join(',') });
  // PRODUCT-DECISION: Real connector left to integrators. Stub returns
  // configured + would-call summary. No external HTTP attempted to avoid
  // hangs in dev environments.
  res.json({ vendor: v, status: 'configured', note: 'Real connector pending; payload accepted', received: req.body || {} });
});

// ── 4. External confirmation workflow (NEEDS-PRODUCT-DECISION) ─────────────
// PRODUCT-DECISION: Token-link model. Backend creates a confirmation record
// with a unique opaque token; counter-party would receive a link (delivery
// out of scope — use existing notification system). Status transitions:
// pending -> sent -> responded.
const crypto = require('crypto');
router.post('/confirmations', auth, async (req, res) => {
  const { counterparty, counterparty_email, request_type, payload } = req.body || {};
  if (!counterparty) return res.status(400).json({ error: 'counterparty required' });
  const token = crypto.randomBytes(16).toString('hex');
  const r = await pool.query(
    `INSERT INTO ext_confirmations_pass5
     (user_id, counterparty, counterparty_email, request_type, request_payload, token)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user?.id || null, counterparty, counterparty_email || null,
     request_type || 'balance', JSON.stringify(payload || {}), token]
  );
  res.json(r.rows[0]);
});

router.get('/confirmations', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM ext_confirmations_pass5 WHERE user_id=$1 ORDER BY id DESC LIMIT 100`,
    [req.user?.id || null]
  );
  res.json(r.rows);
});

router.post('/confirmations/:id/mark-sent', auth, async (req, res) => {
  await pool.query(
    `UPDATE ext_confirmations_pass5 SET status='sent', sent_at=NOW() WHERE id=$1`,
    [req.params.id]
  );
  res.json({ ok: true });
});

// Public callback (token-gated, no JWT) for counter-party response
router.post('/confirmations/respond/:token', async (req, res) => {
  const { token } = req.params;
  const r = await pool.query(
    `UPDATE ext_confirmations_pass5
     SET status='responded', responded_at=NOW(), response_payload=$2
     WHERE token=$1 RETURNING id, counterparty, status`,
    [token, JSON.stringify(req.body || {})]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: 'Invalid token' });
  res.json(r.rows[0]);
});

// ── 5. Real-time / continuous auditing (TOO-RISKY → additive event log) ────
// PRODUCT-DECISION: Implement as poll-based event log instead of streaming
// pipeline (no Kafka). Caller pushes events; AI summarizer scans recent events.
router.post('/continuous/events', auth, async (req, res) => {
  const { source, event_type, severity, payload } = req.body || {};
  const r = await pool.query(
    `INSERT INTO continuous_audit_events_pass5 (source, event_type, severity, payload)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [source || 'unknown', event_type || 'generic', severity || 'info', JSON.stringify(payload || {})]
  );
  res.json(r.rows[0]);
});

router.get('/continuous/events', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM continuous_audit_events_pass5 ORDER BY id DESC LIMIT 200`
  );
  res.json(r.rows);
});

router.post('/ai/continuous-summary', auth, async (req, res) => {
  if (!hasKey()) return aiUnavailable(res);
  const r = await pool.query(
    `SELECT source,event_type,severity,payload,ingested_at
     FROM continuous_audit_events_pass5 ORDER BY id DESC LIMIT 50`
  );
  if (r.rows.length === 0) return res.status(404).json({ error: 'No events to summarize' });
  const prompt = `Summarize the most material recent audit-relevant events. Identify clusters, anomalies, and high-severity items.\n\n${JSON.stringify(r.rows, null, 2)}`;
  const ai = await callOpenRouter(prompt, 'You are a continuous-audit triage analyst.');
  if (!ai.success) return res.status(502).json({ error: ai.error });
  res.json({ summary: ai.response, model: ai.model, events_seen: r.rows.length });
});

// ── 6. XBRL parser (TOO-RISKY → minimal additive parser) ───────────────────
// PRODUCT-DECISION: Skip full XBRL taxonomy (would need 'xbrl' npm package).
// Provide a regex-based extraction of common us-gaap monetary tags so users
// can submit an XBRL instance and get a quick summary. Treat output as
// best-effort — full parse requires `xbrl-parser` (heavy, deferred).
router.post('/xbrl/parse', auth, async (req, res) => {
  const { filename, content } = req.body || {};
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'content (XBRL XML string) required' });
  const summary = {};
  // Extract us-gaap:Tag and ifrs-full:Tag elements with simple decimal values.
  const tagRe = /<((?:us-gaap|ifrs-full|dei):[A-Za-z0-9_]+)[^>]*>([-+]?\d+(?:\.\d+)?)<\/\1>/g;
  let m;
  while ((m = tagRe.exec(content)) !== null) {
    summary[m[1]] = (summary[m[1]] === undefined ? 0 : summary[m[1]]) + Number(m[2]);
  }
  const periodMatch = content.match(/<xbrli:endDate>([^<]+)<\/xbrli:endDate>/);
  const entityMatch = content.match(/<xbrli:identifier[^>]*>([^<]+)<\/xbrli:identifier>/);
  const period_end = periodMatch ? periodMatch[1] : null;
  const entity = entityMatch ? entityMatch[1] : null;
  try {
    await pool.query(
      `INSERT INTO xbrl_documents_pass5 (user_id, filename, period_end, entity_name, parsed_summary)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user?.id || null, filename || null, period_end, entity, JSON.stringify(summary)]
    );
  } catch (_) {}
  res.json({ filename, period_end, entity, tag_count: Object.keys(summary).length, summary });
});

router.get('/xbrl/documents', auth, async (req, res) => {
  const r = await pool.query(
    `SELECT id, filename, period_end, entity_name, parsed_summary, created_at
     FROM xbrl_documents_pass5 WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,
    [req.user?.id || null]
  );
  res.json(r.rows);
});

// ── 7. Audit-firm collaboration (NEEDS-PRODUCT-DECISION) ───────────────────
// PRODUCT-DECISION: Single-tenant invitation model — email + role string.
// Multi-tenant isolation is deferred (would require workspace separator on
// every existing table). Engagement name is the soft tenant key here.
router.post('/collab/invite', auth, async (req, res) => {
  const { engagement_name, member_email, role } = req.body || {};
  if (!engagement_name || !member_email) return res.status(400).json({ error: 'engagement_name + member_email required' });
  const r = await pool.query(
    `INSERT INTO audit_firm_collab_pass5 (engagement_name, member_email, role, invited_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [engagement_name, member_email, role || 'reviewer', req.user?.id || null]
  );
  res.json(r.rows[0]);
});

router.get('/collab/members', auth, async (req, res) => {
  const eng = req.query.engagement_name;
  const sql = eng
    ? `SELECT * FROM audit_firm_collab_pass5 WHERE engagement_name=$1 ORDER BY id DESC`
    : `SELECT * FROM audit_firm_collab_pass5 ORDER BY id DESC LIMIT 100`;
  const r = await pool.query(sql, eng ? [eng] : []);
  res.json(r.rows);
});

router.post('/collab/:id/status', auth, async (req, res) => {
  const { status } = req.body || {};
  if (!['invited', 'accepted', 'revoked'].includes(status)) return res.status(400).json({ error: 'status must be invited|accepted|revoked' });
  const r = await pool.query(
    `UPDATE audit_firm_collab_pass5 SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

module.exports = router;
