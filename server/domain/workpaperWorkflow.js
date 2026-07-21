'use strict';

const transitions = Object.freeze({
  draft: ['evidence_ready'],
  evidence_ready: ['review_pending', 'draft'],
  review_pending: ['approved', 'rejected'],
  rejected: ['draft'],
  approved: [],
});

function validateWorkpaper(input) {
  const errors = [];
  if (!input.engagementId) errors.push('engagementId is required');
  if (!input.procedureId) errors.push('procedureId is required');
  if (!input.objective || input.objective.trim().length < 10) errors.push('objective must be at least 10 characters');
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) errors.push('at least one evidence item is required');
  for (const [index, item] of (input.evidence || []).entries()) {
    if (!item.sourceId) errors.push(`evidence[${index}].sourceId is required`);
    if (!/^[a-f0-9]{64}$/i.test(item.sha256 || '')) errors.push(`evidence[${index}].sha256 must be a SHA-256 hex digest`);
    if (!item.capturedAt || Number.isNaN(Date.parse(item.capturedAt))) errors.push(`evidence[${index}].capturedAt must be an ISO date`);
  }
  const sample = input.sampling;
  if (sample) {
    if (!Number.isInteger(sample.populationSize) || sample.populationSize < 1) errors.push('sampling.populationSize must be positive');
    if (!Number.isInteger(sample.sampleSize) || sample.sampleSize < 1 || sample.sampleSize > sample.populationSize) errors.push('sampling.sampleSize must be between 1 and populationSize');
    if (!['random', 'systematic', 'judgmental'].includes(sample.method)) errors.push('sampling.method is invalid');
    if (sample.method !== 'judgmental' && !sample.seed) errors.push('reproducible sampling requires a seed');
  }
  return { valid: errors.length === 0, errors };
}

function assertTransition(from, to, actor, record) {
  if (!(transitions[from] || []).includes(to)) throw new Error(`transition ${from} -> ${to} is not allowed`);
  if (['approved', 'rejected'].includes(to)) {
    if (!['senior_auditor', 'audit_manager', 'partner', 'admin'].includes(actor.role)) throw new Error('review role required');
    if (String(actor.id) === String(record.created_by)) throw new Error('preparer cannot review their own workpaper');
  }
  return true;
}

module.exports = { transitions, validateWorkpaper, assertTransition };

