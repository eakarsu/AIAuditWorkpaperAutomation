'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWorkpaper, assertTransition } = require('../domain/workpaperWorkflow');

const valid = { engagementId: 'E-1', procedureId: 'P-7', objective: 'Test revenue occurrence', evidence: [{ sourceId: 'ledger:77', sha256: 'a'.repeat(64), capturedAt: '2026-07-18T10:00:00Z' }], sampling: { populationSize: 100, sampleSize: 10, method: 'random', seed: 'engagement-E-1' } };
test('accepts traceable evidence and reproducible sample', () => assert.equal(validateWorkpaper(valid).valid, true));
test('rejects evidence without a content hash', () => assert.equal(validateWorkpaper({ ...valid, evidence: [{ sourceId: 'x' }] }).valid, false));
test('preparer cannot approve own work', () => assert.throws(() => assertTransition('review_pending', 'approved', { id: 4, role: 'audit_manager' }, { created_by: 4 }), /cannot review/));
test('independent manager can approve pending work', () => assert.equal(assertTransition('review_pending', 'approved', { id: 5, role: 'audit_manager' }, { created_by: 4 }), true));

