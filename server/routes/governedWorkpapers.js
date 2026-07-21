'use strict';

const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { validateWorkpaper, assertTransition } = require('../domain/workpaperWorkflow');

router.use(auth);

const tenantFor = user => String(user.tenant_id || user.organization_id || `legacy-user:${user.id}`);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM governed_workpapers WHERE tenant_id=$1 ORDER BY updated_at DESC', [tenantFor(req.user)]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Unable to load workpapers' }); }
});

router.post('/', async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key');
  if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key header is required' });
  const validation = validateWorkpaper(req.body || {});
  if (!validation.valid) return res.status(422).json(validation);
  const tenant = tenantFor(req.user);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM governed_workpapers WHERE tenant_id=$1 AND idempotency_key=$2', [tenant, idempotencyKey]);
    if (existing.rows[0]) { await client.query('ROLLBACK'); return res.status(200).json(existing.rows[0]); }
    const created = await client.query(
      `INSERT INTO governed_workpapers (tenant_id,idempotency_key,engagement_id,procedure_id,objective,payload,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant, idempotencyKey, req.body.engagementId, req.body.procedureId, req.body.objective, req.body, String(req.user.id)]
    );
    await client.query(
      `INSERT INTO governed_workpaper_events (tenant_id,workpaper_id,actor_id,event_type,from_status,to_status,event_data)
       VALUES ($1,$2,$3,'created',NULL,'draft',$4)`,
      [tenant, created.rows[0].id, String(req.user.id), { evidenceCount: req.body.evidence.length }]
    );
    await client.query('COMMIT');
    res.status(201).json(created.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: 'Unable to create governed workpaper' });
  } finally { if (client) client.release(); }
});

router.get('/external-capabilities', (req, res) => res.json({
  documentRepository: { configured: false, required: ['provider URL', 'service identity', 'webhook signature'] },
  ledger: { configured: false, required: ['read-only ERP credentials', 'cursor strategy'] },
  eSignature: { configured: false, required: ['qualified provider', 'retention policy'] },
}));

router.post('/:id/transition', async (req, res) => {
  const { toStatus, expectedVersion, rationale } = req.body || {};
  if (!Number.isInteger(expectedVersion) || !rationale) return res.status(400).json({ error: 'expectedVersion and rationale are required' });
  const tenant = tenantFor(req.user);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM governed_workpapers WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant]);
    const current = found.rows[0];
    if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Workpaper not found' }); }
    assertTransition(current.status, toStatus, req.user, current);
    if (current.version !== expectedVersion) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Version conflict', currentVersion: current.version }); }
    const updated = await client.query(
      `UPDATE governed_workpapers SET status=$1,version=version+1,updated_at=NOW(),approved_by=CASE WHEN $1='approved' THEN $2 ELSE approved_by END
       WHERE id=$3 AND tenant_id=$4 AND version=$5 RETURNING *`,
      [toStatus, String(req.user.id), current.id, tenant, expectedVersion]
    );
    await client.query(
      `INSERT INTO governed_workpaper_events (tenant_id,workpaper_id,actor_id,event_type,from_status,to_status,event_data)
       VALUES ($1,$2,$3,'transition',$4,$5,$6)`,
      [tenant, current.id, String(req.user.id), current.status, toStatus, { rationale }]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    const clientError = /not allowed|review role|required|own workpaper/.test(error.message);
    res.status(clientError ? 422 : 500).json({ error: clientError ? error.message : 'Unable to transition workpaper' });
  } finally { if (client) client.release(); }
});

router.get('/:id/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM governed_workpaper_events WHERE workpaper_id=$1 AND tenant_id=$2 ORDER BY occurred_at,id', [req.params.id, tenantFor(req.user)]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Unable to load history' }); }
});

module.exports = router;
