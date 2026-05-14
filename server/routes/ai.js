const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { callOpenRouter, streamOpenRouter } = require('../services/openrouter');
const pool = require('../db');

// ── Rate limiter: 20 AI requests per hour per JWT user ID ─────────────────
const { ipKeyGenerator } = require('express-rate-limit');
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user ? `user:${req.user.id}` : ipKeyGenerator(req, res),
  message: { error: 'AI rate limit exceeded. Maximum 20 requests per hour.' }
});

router.use(aiLimiter);

// ── Helper: persist AI result to database ─────────────────────────────────
const persistAnalysis = async (endpoint, inputData, result, userId) => {
  try {
    await pool.query(
      `INSERT INTO ai_analyses (endpoint, input_data, result_data, user_id, model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        endpoint,
        JSON.stringify(inputData),
        JSON.stringify(result),
        userId || null,
        result.model || null,
        result.usage?.total_tokens || null
      ]
    );
  } catch (err) {
    // Non-fatal: persist failures must not block API responses
    console.error('AI persistence error:', err.message);
  }
};

// ── Input validation helpers ───────────────────────────────────────────────
const validateEvidence = (evidence) => {
  const errors = [];
  if (!evidence) return ['evidence object is required'];
  if (!evidence.title || typeof evidence.title !== 'string' || evidence.title.trim().length === 0) {
    errors.push('evidence.title is required');
  }
  if (!evidence.evidence_type) errors.push('evidence.evidence_type is required');
  if (!evidence.audit_area) errors.push('evidence.audit_area is required');
  return errors;
};

const validateSampling = (sampling) => {
  const errors = [];
  if (!sampling) return ['sampling object is required'];
  if (!sampling.title) errors.push('sampling.title is required');
  if (sampling.population_size !== undefined && (isNaN(sampling.population_size) || sampling.population_size < 1)) {
    errors.push('sampling.population_size must be a positive number');
  }
  if (sampling.confidence_level !== undefined) {
    const cl = parseFloat(sampling.confidence_level);
    if (isNaN(cl) || cl < 0 || cl > 100) errors.push('sampling.confidence_level must be between 0 and 100');
  }
  return errors;
};

const validateWorkpaper = (workpaper) => {
  const errors = [];
  if (!workpaper) return ['workpaper object is required'];
  if (!workpaper.title) errors.push('workpaper.title is required');
  if (!workpaper.audit_area) errors.push('workpaper.audit_area is required');
  return errors;
};

const validateFinding = (finding) => {
  const errors = [];
  if (!finding) return ['finding object is required'];
  if (!finding.title) errors.push('finding.title is required');
  if (!finding.condition) errors.push('finding.condition is required (the observable fact)');
  const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
  if (finding.severity && !validSeverities.includes(finding.severity)) {
    errors.push(`finding.severity must be one of: ${validSeverities.join(', ')}`);
  }
  return errors;
};

const validateChecklist = (checklist) => {
  const errors = [];
  if (!checklist) return ['checklist object is required'];
  if (!checklist.title) errors.push('checklist.title is required');
  if (!checklist.requirement) errors.push('checklist.requirement is required');
  return errors;
};

// ── GET /api/ai/history — retrieve stored analyses ─────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const endpoint = req.query.endpoint || null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const whereClause = endpoint ? 'WHERE endpoint = $1' : '';
    const params = endpoint ? [endpoint, limit, offset] : [limit, offset];
    const limitParam = endpoint ? '$2' : '$1';
    const offsetParam = endpoint ? '$3' : '$2';

    const { rows } = await pool.query(
      `SELECT id, endpoint, input_data, result_data, model_used, tokens_used, created_at
       FROM ai_analyses
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    const countParams = endpoint ? [endpoint] : [];
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM ai_analyses ${endpoint ? 'WHERE endpoint = $1' : ''}`,
      countParams
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: parseInt(countRows[0].total),
        totalPages: Math.ceil(parseInt(countRows[0].total) / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/analyze-evidence ─────────────────────────────────────────
router.post('/analyze-evidence', auth, async (req, res) => {
  try {
    const { evidence } = req.body;

    const validationErrors = validateEvidence(evidence);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in audit evidence analysis. Analyze the provided audit evidence and provide:
1. Evidence quality assessment (Sufficient, Appropriate, Reliable)
2. Key observations and potential risks
3. Recommended additional procedures
4. Overall assessment summary
Format your response with clear sections and professional language suitable for audit workpapers.`;

    const prompt = `Analyze this audit evidence:\n\nTitle: ${evidence.title}\nType: ${evidence.evidence_type}\nSource: ${evidence.source || 'N/A'}\nAudit Area: ${evidence.audit_area}\nRisk Level: ${evidence.risk_level || 'N/A'}\nDescription: ${evidence.description || 'N/A'}\nNotes: ${evidence.notes || 'N/A'}`;

    const result = await callOpenRouter(prompt, systemPrompt);

    await persistAnalysis('analyze-evidence', evidence, result, req.user?.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/calculate-sample ─────────────────────────────────────────
router.post('/calculate-sample', auth, async (req, res) => {
  try {
    const { sampling } = req.body;

    const validationErrors = validateSampling(sampling);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const systemPrompt = `You are an expert statistical auditor AI assistant. Calculate and recommend optimal sample sizes for audit procedures. Provide:
1. Recommended sample size with statistical justification
2. Sampling methodology recommendation
3. Risk assessment for the sampling approach
4. Key assumptions and limitations
5. Confidence interval analysis
Use professional audit standards (ISA 530, AICPA AU-C 530) as references.`;

    const prompt = `Calculate optimal sample for this audit sampling plan:\n\nTitle: ${sampling.title}\nPopulation Size: ${sampling.population_size}\nCurrent Sample Size: ${sampling.sample_size}\nConfidence Level: ${sampling.confidence_level}%\nSampling Method: ${sampling.sampling_method}\nAudit Area: ${sampling.audit_area}\nMateriality Threshold: ${sampling.materiality_threshold}\nTolerable Error: ${sampling.tolerable_error}\nExpected Error Rate: ${sampling.expected_error_rate}%\nDescription: ${sampling.description || 'N/A'}`;

    const result = await callOpenRouter(prompt, systemPrompt);

    await persistAnalysis('calculate-sample', sampling, result, req.user?.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/generate-workpaper ───────────────────────────────────────
router.post('/generate-workpaper', auth, async (req, res) => {
  try {
    const { workpaper } = req.body;

    const validationErrors = validateWorkpaper(workpaper);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in workpaper preparation. Generate comprehensive workpaper content including:
1. Detailed audit objectives
2. Scope of procedures
3. Step-by-step procedures to be performed
4. Expected evidence to gather
5. Conclusion template
Format the output professionally as would appear in a CPA firm's audit workpapers, following PCAOB and AICPA standards.`;

    const prompt = `Generate comprehensive workpaper content for:\n\nTitle: ${workpaper.title}\nReference: ${workpaper.reference_number || 'N/A'}\nAudit Area: ${workpaper.audit_area}\nEngagement: ${workpaper.engagement || 'N/A'}\nObjective: ${workpaper.objective || 'To be determined'}\nScope: ${workpaper.scope || 'To be determined'}\nCurrent Procedures: ${workpaper.procedures_performed || 'None documented yet'}`;

    const result = await callOpenRouter(prompt, systemPrompt);

    await persistAnalysis('generate-workpaper', workpaper, result, req.user?.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/analyze-finding ──────────────────────────────────────────
router.post('/analyze-finding', auth, async (req, res) => {
  try {
    const { finding } = req.body;

    const validationErrors = validateFinding(finding);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in audit findings documentation. Analyze the audit finding and provide:
1. Root cause analysis
2. Impact assessment (financial, operational, compliance)
3. Detailed remediation recommendations
4. Management response suggestions
5. Follow-up procedures
6. Risk rating justification
Format as professional audit finding documentation per IIA and PCAOB standards.`;

    const prompt = `Analyze this audit finding:\n\nTitle: ${finding.title}\nType: ${finding.finding_type || 'N/A'}\nSeverity: ${finding.severity || 'N/A'}\nAudit Area: ${finding.audit_area || 'N/A'}\nCondition: ${finding.condition}\nCriteria: ${finding.criteria || 'N/A'}\nCause: ${finding.cause || 'To be determined'}\nEffect: ${finding.effect || 'To be determined'}\nCurrent Recommendation: ${finding.recommendation || 'None yet'}`;

    const result = await callOpenRouter(prompt, systemPrompt);

    await persistAnalysis('analyze-finding', finding, result, req.user?.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/assess-compliance ────────────────────────────────────────
router.post('/assess-compliance', auth, async (req, res) => {
  try {
    const { checklist } = req.body;

    const validationErrors = validateChecklist(checklist);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const systemPrompt = `You are an expert compliance auditor AI assistant. Assess compliance status and provide:
1. Compliance gap analysis
2. Required evidence for compliance demonstration
3. Remediation steps if non-compliant
4. Best practices for maintaining compliance
5. Cross-reference to related regulatory requirements
6. Testing procedures to verify compliance
Reference applicable frameworks (SOX, SOC2, HIPAA, GDPR, PCI-DSS, etc.) as appropriate.`;

    const prompt = `Assess compliance for this checklist item:\n\nTitle: ${checklist.title}\nFramework: ${checklist.framework || 'N/A'}\nCategory: ${checklist.category || 'N/A'}\nRequirement: ${checklist.requirement}\nDescription: ${checklist.description || 'N/A'}\nCurrent Status: ${checklist.compliance_status || 'N/A'}\nRegulation Reference: ${checklist.regulation_reference || 'N/A'}\nEvidence Reference: ${checklist.evidence_reference || 'None provided'}`;

    const result = await callOpenRouter(prompt, systemPrompt);

    await persistAnalysis('assess-compliance', checklist, result, req.user?.id);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/score-evidence-adequacy ──────────────────────────────────
// NEW FEATURE: Evidence Adequacy Scorer
// Assigns confidence percentages to evidence strength vs. audit objectives.
// Optionally saves scores to evidence_adequacy_scores table.
router.post('/score-evidence-adequacy', auth, async (req, res) => {
  try {
    const { evidence, audit_objective, save_to_evidence } = req.body;

    const validationErrors = validateEvidence(evidence);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    if (!audit_objective || typeof audit_objective !== 'string' || audit_objective.trim().length === 0) {
      return res.status(400).json({ error: 'audit_objective is required — describe the audit objective this evidence should support' });
    }

    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in audit evidence assessment.
Your task is to score the adequacy of audit evidence against specific audit objectives.
You MUST respond with ONLY a valid JSON object — no markdown, no commentary.
The JSON must have exactly this structure:
{
  "sufficiency_score": <integer 0-100>,
  "appropriateness_score": <integer 0-100>,
  "reliability_score": <integer 0-100>,
  "overall_score": <integer 0-100>,
  "confidence_level": "<High|Medium|Low>",
  "gaps": [<list of string gap descriptions>],
  "recommendations": [<list of string recommendations>],
  "narrative": "<professional paragraph explanation>"
}

Scoring guidance:
- sufficiency_score: Does the evidence quantity and volume adequately support the objective? (ISA 500)
- appropriateness_score: Is the evidence relevant and reliable for the specific assertion? (ISA 500)
- reliability_score: Is the source trustworthy? External > internal; original > copies; auditor-obtained > client-provided
- overall_score: Weighted composite (30% sufficiency, 35% appropriateness, 35% reliability)
- confidence_level: High (overall >= 75), Medium (50-74), Low (< 50)
- gaps: Specific deficiencies preventing full adequacy
- recommendations: Concrete steps to close the gaps`;

    const prompt = `Score the adequacy of this audit evidence against the stated objective:

AUDIT OBJECTIVE: ${audit_objective}

EVIDENCE:
Title: ${evidence.title}
Type: ${evidence.evidence_type}
Source: ${evidence.source || 'Not specified'}
Audit Area: ${evidence.audit_area}
Risk Level: ${evidence.risk_level || 'Not specified'}
Description: ${evidence.description || 'Not provided'}
Notes: ${evidence.notes || 'N/A'}
Current Status: ${evidence.status || 'N/A'}

Respond ONLY with the JSON structure specified. No other text.`;

    const result = await callOpenRouter(prompt, systemPrompt);

    if (!result.success) {
      return res.status(502).json({ error: 'AI service error', detail: result.error });
    }

    // Parse the JSON score from AI response
    let scores = null;
    try {
      const raw = result.response || '';
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      scores = JSON.parse(cleaned);
    } catch (parseErr) {
      // Fallback: return raw response if JSON parse fails
      console.error('Score JSON parse error:', parseErr.message);
      return res.status(500).json({
        error: 'AI returned malformed JSON for scores',
        raw_response: result.response,
        model: result.model
      });
    }

    // Validate and clamp numeric fields
    const clamp = (val, min, max) => Math.min(max, Math.max(min, parseInt(val) || 0));
    scores.sufficiency_score = clamp(scores.sufficiency_score, 0, 100);
    scores.appropriateness_score = clamp(scores.appropriateness_score, 0, 100);
    scores.reliability_score = clamp(scores.reliability_score, 0, 100);
    scores.overall_score = clamp(scores.overall_score, 0, 100);
    if (!['High', 'Medium', 'Low'].includes(scores.confidence_level)) {
      scores.confidence_level = scores.overall_score >= 75 ? 'High' : scores.overall_score >= 50 ? 'Medium' : 'Low';
    }
    scores.gaps = Array.isArray(scores.gaps) ? scores.gaps : [];
    scores.recommendations = Array.isArray(scores.recommendations) ? scores.recommendations : [];

    // Optionally save scores to evidence_adequacy_scores table
    let savedId = null;
    if (save_to_evidence && evidence.id) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO evidence_adequacy_scores
             (evidence_id, sufficiency_score, appropriateness_score, reliability_score,
              overall_score, confidence_level, gaps, recommendations, raw_analysis, model_used)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (evidence_id) DO UPDATE SET
             sufficiency_score = EXCLUDED.sufficiency_score,
             appropriateness_score = EXCLUDED.appropriateness_score,
             reliability_score = EXCLUDED.reliability_score,
             overall_score = EXCLUDED.overall_score,
             confidence_level = EXCLUDED.confidence_level,
             gaps = EXCLUDED.gaps,
             recommendations = EXCLUDED.recommendations,
             raw_analysis = EXCLUDED.raw_analysis,
             model_used = EXCLUDED.model_used,
             updated_at = NOW()
           RETURNING id`,
          [
            evidence.id,
            scores.sufficiency_score,
            scores.appropriateness_score,
            scores.reliability_score,
            scores.overall_score,
            scores.confidence_level,
            JSON.stringify(scores.gaps),
            JSON.stringify(scores.recommendations),
            scores.narrative || null,
            result.model
          ]
        );
        savedId = rows[0]?.id;
      } catch (dbErr) {
        console.error('Evidence adequacy score save error:', dbErr.message);
        // Non-fatal — return scores even if save fails
      }
    }

    // Persist to ai_analyses for history
    await persistAnalysis('score-evidence-adequacy', { evidence, audit_objective }, {
      ...scores,
      model: result.model,
      usage: result.usage
    }, req.user?.id);

    res.json({
      success: true,
      evidence_id: evidence.id || null,
      audit_objective,
      scores,
      model: result.model,
      saved_score_id: savedId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Evidence adequacy scorer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/evidence-scores/:evidenceId ───────────────────────────────
// Retrieve stored adequacy score for a specific evidence item
router.get('/evidence-scores/:evidenceId', auth, async (req, res) => {
  try {
    const { evidenceId } = req.params;
    if (isNaN(parseInt(evidenceId))) {
      return res.status(400).json({ error: 'evidenceId must be a number' });
    }

    const { rows } = await pool.query(
      `SELECT eas.*, ae.title as evidence_title, ae.audit_area
       FROM evidence_adequacy_scores eas
       JOIN audit_evidence ae ON ae.id = eas.evidence_id
       WHERE eas.evidence_id = $1
       ORDER BY eas.updated_at DESC
       LIMIT 1`,
      [parseInt(evidenceId)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No adequacy score found for this evidence item' });
    }

    res.json({ success: true, score: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/workpaper/stream?workpaperId=X ────────────────────────────
// SSE streaming endpoint for long workpaper generation
router.get('/workpaper/stream', auth, async (req, res) => {
  const { workpaperId } = req.query;
  if (!workpaperId || isNaN(parseInt(workpaperId))) {
    return res.status(400).json({ error: 'workpaperId query param is required and must be a number' });
  }

  let workpaper;
  try {
    const { rows } = await pool.query('SELECT * FROM workpapers WHERE id = $1', [parseInt(workpaperId)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Workpaper not found' });
    workpaper = rows[0];
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const systemPrompt = `You are an expert CPA auditor AI assistant specializing in workpaper preparation. Generate comprehensive workpaper content including:
1. Detailed audit objectives
2. Scope of procedures
3. Step-by-step procedures to be performed
4. Expected evidence to gather
5. Conclusion template
Format the output professionally as would appear in a CPA firm's audit workpapers, following PCAOB and AICPA standards.`;

  const prompt = `Generate comprehensive workpaper content for:\n\nTitle: ${workpaper.title}\nReference: ${workpaper.reference_number || 'N/A'}\nAudit Area: ${workpaper.audit_area}\nEngagement: ${workpaper.engagement || 'N/A'}\nObjective: ${workpaper.objective || 'To be determined'}\nScope: ${workpaper.scope || 'To be determined'}\nCurrent Procedures: ${workpaper.procedures_performed || 'None documented yet'}`;

  streamOpenRouter(prompt, systemPrompt, res);

  req.on('close', () => {
    // Client disconnected — nothing to clean up since https req is fire-and-forget
  });
});

// ── GET /api/ai/templates ─────────────────────────────────────────────────
// Returns 10 pre-built workpaper templates
const WORKPAPER_TEMPLATES = [
  {
    id: 1,
    name: 'Risk Assessment',
    audit_area: 'Risk Management',
    description: 'Comprehensive inherent and control risk assessment for a business process or entity.',
    prompt_template: 'Generate a risk assessment workpaper for {context}. Include: risk identification matrix, inherent risk ratings, control environment evaluation, residual risk assessment, and risk response plan.',
    tags: ['risk', 'assessment', 'control']
  },
  {
    id: 2,
    name: 'Internal Control Testing',
    audit_area: 'Internal Controls',
    description: 'Design and results of tests of controls over a key financial reporting process.',
    prompt_template: 'Generate a control testing workpaper for {context}. Include: control objectives, test of design (TOD), test of operating effectiveness (TOE), sample selection rationale, exceptions noted, and conclusion.',
    tags: ['controls', 'testing', 'TOE', 'TOD']
  },
  {
    id: 3,
    name: 'Analytical Procedures',
    audit_area: 'Substantive Testing',
    description: 'Analytical review comparing current period to prior period and expectations.',
    prompt_template: 'Generate an analytical procedures workpaper for {context}. Include: expectation development, threshold calculations, comparison of recorded amounts to expectations, explanation of variances exceeding threshold, and conclusion.',
    tags: ['analytical', 'substantive', 'variance']
  },
  {
    id: 4,
    name: 'Accounts Receivable Confirmation',
    audit_area: 'Revenue & Receivables',
    description: 'Positive/negative confirmation procedures for accounts receivable balances.',
    prompt_template: 'Generate an accounts receivable confirmation workpaper for {context}. Include: population description, sampling methodology, confirmation design (positive/negative), mailing procedures, exception follow-up, and conclusions on existence and valuation.',
    tags: ['receivables', 'confirmation', 'revenue']
  },
  {
    id: 5,
    name: 'Inventory Observation',
    audit_area: 'Inventory',
    description: 'Physical inventory count observation procedures and results.',
    prompt_template: 'Generate an inventory observation workpaper for {context}. Include: count site details, pre-count procedures, observation methodology, test counts performed, cutoff testing, reconciliation to books, and conclusion.',
    tags: ['inventory', 'observation', 'physical count']
  },
  {
    id: 6,
    name: 'Revenue Recognition',
    audit_area: 'Revenue',
    description: 'Testing revenue recognition compliance with ASC 606 / IFRS 15.',
    prompt_template: 'Generate a revenue recognition workpaper for {context}. Include: five-step model application, contract identification, performance obligations, transaction price allocation, recognition timing, and sample-based substantive testing.',
    tags: ['revenue', 'ASC 606', 'IFRS 15', 'recognition']
  },
  {
    id: 7,
    name: 'Cash & Bank Reconciliation',
    audit_area: 'Cash',
    description: 'Audit of cash balances including bank reconciliation testing and cut-off.',
    prompt_template: 'Generate a cash and bank reconciliation workpaper for {context}. Include: bank confirmation procedures, reconciling items testing, outstanding checks review, deposits in transit verification, cut-off testing, and conclusion.',
    tags: ['cash', 'bank', 'reconciliation']
  },
  {
    id: 8,
    name: 'Payroll Substantive Testing',
    audit_area: 'Payroll & HR',
    description: 'Substantive testing of payroll expense and related liabilities.',
    prompt_template: 'Generate a payroll substantive testing workpaper for {context}. Include: population analysis, sample testing of payroll transactions, authorization testing, wage rate verification, payroll tax compliance, accrued payroll testing, and conclusion.',
    tags: ['payroll', 'HR', 'wages', 'substantive']
  },
  {
    id: 9,
    name: 'IT General Controls (ITGC)',
    audit_area: 'Information Technology',
    description: 'Testing of IT general controls covering access management, change management, and operations.',
    prompt_template: 'Generate an ITGC workpaper for {context}. Include: in-scope systems, access management controls (user provisioning, termination, privileged access), change management controls (SDLC, segregation), computer operations (job scheduling, backups), and reliance conclusion.',
    tags: ['IT', 'ITGC', 'access management', 'change management']
  },
  {
    id: 10,
    name: 'Management Representation Letter Review',
    audit_area: 'Audit Completion',
    description: 'Review and documentation of management representation letter and subsequent events.',
    prompt_template: 'Generate a management representation letter review workpaper for {context}. Include: required representations checklist (per AU-C 580), subsequent events procedures, going concern assessment, contingent liabilities inquiry, related party confirmation, and overall completion conclusion.',
    tags: ['completion', 'representation', 'subsequent events']
  }
];

router.get('/templates', auth, (req, res) => {
  res.json({ success: true, count: WORKPAPER_TEMPLATES.length, templates: WORKPAPER_TEMPLATES });
});

// ── POST /api/ai/generate-from-template ───────────────────────────────────
router.post('/generate-from-template', auth, async (req, res) => {
  try {
    const { template_id, context_data } = req.body;

    if (!template_id) return res.status(400).json({ error: 'template_id is required' });
    if (!context_data || typeof context_data !== 'string' || context_data.trim().length === 0) {
      return res.status(400).json({ error: 'context_data is required (describe the specific audit context)' });
    }

    const template = WORKPAPER_TEMPLATES.find(t => t.id === parseInt(template_id));
    if (!template) {
      return res.status(404).json({ error: `Template ${template_id} not found. Use GET /api/ai/templates to list available templates.` });
    }

    const filledPrompt = template.prompt_template.replace('{context}', context_data.trim());

    const systemPrompt = `You are an expert CPA auditor AI assistant. Generate a comprehensive, professional audit workpaper following PCAOB and AICPA standards. The workpaper should be detailed, well-structured, and ready for reviewer sign-off. Use clear section headers, numbered procedures, and professional language.`;

    const result = await callOpenRouter(filledPrompt, systemPrompt);

    if (!result.success) {
      return res.status(502).json({ error: 'AI service error', detail: result.error });
    }

    await persistAnalysis('generate-from-template', { template_id, template_name: template.name, context_data }, result, req.user?.id);

    res.json({
      success: true,
      template: { id: template.id, name: template.name, audit_area: template.audit_area },
      response: result.response,
      model: result.model,
      usage: result.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/evidence-scores ───────────────────────────────────────────
// Retrieve all evidence adequacy scores (low confidence first for triage)
router.get('/evidence-scores', auth, async (req, res) => {
  try {
    const confidenceFilter = req.query.confidence; // High, Medium, Low
    const auditArea = req.query.audit_area;

    let query = `
      SELECT eas.*, ae.title as evidence_title, ae.audit_area, ae.risk_level, ae.status
      FROM evidence_adequacy_scores eas
      JOIN audit_evidence ae ON ae.id = eas.evidence_id
      WHERE 1=1
    `;
    const params = [];

    if (confidenceFilter && ['High', 'Medium', 'Low'].includes(confidenceFilter)) {
      params.push(confidenceFilter);
      query += ` AND eas.confidence_level = $${params.length}`;
    }
    if (auditArea) {
      params.push(auditArea);
      query += ` AND ae.audit_area ILIKE $${params.length}`;
    }

    query += ' ORDER BY eas.overall_score ASC, eas.updated_at DESC';

    const { rows } = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      scores: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// NEW FEATURES — additional audit-driven capabilities
// ─────────────────────────────────────────────────────────────────────────

// ── POST /api/ai/classify-finding-severity ───────────────────────────────
// Auto-categorize a finding as Significant, Material, or Pass-through using
// a structured AI classifier (returns JSON).
router.post('/classify-finding-severity', auth, async (req, res) => {
  try {
    const { finding } = req.body;
    const errs = validateFinding(finding);
    if (errs.length > 0) return res.status(400).json({ error: 'Validation failed', details: errs });

    const systemPrompt = `You are a CPA classifying audit findings. Respond with ONLY valid JSON, no text:
{
  "classification": "Pass-through|Significant Deficiency|Material Weakness|Critical",
  "rationale": "...",
  "magnitude_score": <integer 0-100>,
  "likelihood_score": <integer 0-100>,
  "combined_risk": <integer 0-100>,
  "recommended_action": "..."
}
Use AS 2201 / SAS 130 criteria for control deficiencies.`;
    const prompt = `Classify this finding:\nTitle: ${finding.title}\nCondition: ${finding.condition}\nCriteria: ${finding.criteria || 'N/A'}\nCause: ${finding.cause || 'N/A'}\nEffect: ${finding.effect || 'N/A'}\nSeverity (current): ${finding.severity || 'N/A'}`;

    const r = await callOpenRouter(prompt, systemPrompt);
    if (!r.success) return res.status(502).json({ error: 'AI service error', detail: r.error });

    let scores = {};
    try {
      const cleaned = (r.response || '').replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      scores = JSON.parse(cleaned);
    } catch (_) {
      const m = r.response?.match(/\{[\s\S]*\}/);
      if (m) try { scores = JSON.parse(m[0]); } catch (_) {}
    }

    await persistAnalysis('classify-finding-severity', finding, { ...scores, model: r.model, usage: r.usage }, req.user?.id);
    res.json({ success: true, classification: scores, model: r.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/cross-audit-risk-linker ─────────────────────────────────
// Connect findings across multiple clients/audits in same industry.
router.post('/cross-audit-risk-linker', auth, async (req, res) => {
  try {
    const { industry, audit_area, lookback_days } = req.body;
    if (!industry && !audit_area) return res.status(400).json({ error: 'industry or audit_area is required' });

    const days = Math.min(3650, Math.max(7, parseInt(lookback_days) || 365));

    // Pull findings within lookback
    let findingsRows = [];
    try {
      const params = [`%${industry || ''}%`, `%${audit_area || ''}%`, days];
      const { rows } = await pool.query(
        `SELECT id, title, finding_type, severity, audit_area, condition, recommendation, status, created_at
         FROM audit_findings
         WHERE (audit_area ILIKE $1 OR audit_area ILIKE $2)
           AND created_at >= NOW() - ($3 || ' days')::INTERVAL
         ORDER BY created_at DESC
         LIMIT 200`, params
      );
      findingsRows = rows;
    } catch (_) { /* ignore */ }

    if (findingsRows.length === 0) {
      return res.json({ success: true, count: 0, patterns: [], note: 'No findings matched the filter.' });
    }

    // Aggregate by finding_type & audit_area for pattern detection
    const groups = {};
    findingsRows.forEach(f => {
      const key = `${f.finding_type || 'Unknown'}::${f.audit_area || 'N/A'}`;
      if (!groups[key]) groups[key] = { count: 0, severities: {}, examples: [] };
      groups[key].count++;
      const sev = f.severity || 'Unknown';
      groups[key].severities[sev] = (groups[key].severities[sev] || 0) + 1;
      if (groups[key].examples.length < 3) {
        groups[key].examples.push({ id: f.id, title: f.title, severity: sev });
      }
    });

    const patterns = Object.entries(groups)
      .map(([key, g]) => {
        const [finding_type, area] = key.split('::');
        return {
          finding_type, audit_area: area, occurrence_count: g.count,
          severity_breakdown: g.severities, examples: g.examples,
          industry_pattern: g.count >= 3,
        };
      })
      .sort((a, b) => b.occurrence_count - a.occurrence_count);

    // Optional: AI-based commentary on patterns
    const systemPrompt = `You are a CPA risk analyst. Given a list of finding patterns across multiple audits in an industry, identify systemic risks and propose firm-wide responses. Respond with ONLY valid JSON:
{
  "systemic_risks": [{"pattern":"...","risk":"...","prevalence":"low|moderate|high","recommended_firm_response":"..."}],
  "industry_outlook": "..."
}`;
    const prompt = `Industry: ${industry || 'N/A'}\nFiltered audit area: ${audit_area || 'N/A'}\nPattern data: ${JSON.stringify(patterns.slice(0, 10))}`;
    const r = await callOpenRouter(prompt, systemPrompt);

    let aiCommentary = null;
    if (r.success) {
      try {
        const cleaned = r.response.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
        aiCommentary = JSON.parse(cleaned);
      } catch (_) { aiCommentary = { raw: r.response }; }
    }

    await persistAnalysis('cross-audit-risk-linker', { industry, audit_area, lookback_days: days }, { patterns, ai_commentary: aiCommentary }, req.user?.id);

    res.json({
      success: true,
      industry, audit_area, lookback_days: days,
      total_findings: findingsRows.length,
      patterns,
      ai_commentary: aiCommentary,
      model: r.model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/compliance-gap-analyzer ─────────────────────────────────
// Compare control procedures against a framework (COSO/SOX/SOC2/HIPAA),
// flag gaps with required remediation.
router.post('/compliance-gap-analyzer', auth, async (req, res) => {
  try {
    const { framework, current_controls, target_assertion } = req.body;
    if (!framework) return res.status(400).json({ error: 'framework is required (COSO|SOX|SOC2|HIPAA|GDPR|PCI-DSS|NIST)' });
    if (!Array.isArray(current_controls)) return res.status(400).json({ error: 'current_controls must be an array of strings' });

    const systemPrompt = `You are an expert compliance gap analyst. Compare the listed controls against the ${framework} framework and identify gaps. Respond with ONLY valid JSON:
{
  "framework": "${framework}",
  "control_count_provided": <integer>,
  "framework_requirements_count": <integer>,
  "covered": [{"requirement":"...","mapped_to":"...","strength":"strong|adequate|weak"}],
  "gaps": [{"requirement":"...","gap_description":"...","severity":"low|medium|high|critical","remediation":"...","priority":1-5}],
  "overall_compliance_pct": <0-100>,
  "executive_summary": "..."
}`;
    const prompt = `Framework: ${framework}
Target Assertion / Scope: ${target_assertion || 'general'}
Current Controls:
${current_controls.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

    const r = await callOpenRouter(prompt, systemPrompt);
    if (!r.success) return res.status(502).json({ error: 'AI service error', detail: r.error });

    let analysis = null;
    try {
      const cleaned = r.response.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      const m = r.response?.match(/\{[\s\S]*\}/);
      if (m) try { analysis = JSON.parse(m[0]); } catch (_) {}
    }
    if (!analysis) return res.status(500).json({ error: 'AI returned malformed JSON', raw_response: r.response });

    await persistAnalysis('compliance-gap-analyzer', { framework, control_count: current_controls.length }, { ...analysis, model: r.model, usage: r.usage }, req.user?.id);
    res.json({ success: true, analysis, model: r.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/evidence-chain-validator ────────────────────────────────
// Validate evidence chain — provenance, document linkage, completeness.
router.post('/evidence-chain-validator', auth, async (req, res) => {
  try {
    const { evidence_chain } = req.body;
    if (!Array.isArray(evidence_chain) || evidence_chain.length === 0) {
      return res.status(400).json({ error: 'evidence_chain must be a non-empty array' });
    }

    // Heuristic chain checks (no AI cost): each item should have source, type, collected_by, timestamp
    const items = evidence_chain.map((it, idx) => {
      const issues = [];
      if (!it.source) issues.push('Missing source');
      if (!it.evidence_type) issues.push('Missing evidence_type');
      if (!it.collected_by) issues.push('Missing collected_by');
      if (!it.timestamp && !it.created_at) issues.push('Missing timestamp');
      if (idx > 0) {
        const prev = evidence_chain[idx - 1];
        if (it.parent_id && prev.id && it.parent_id !== prev.id) {
          issues.push(`parent_id ${it.parent_id} does not match previous item id ${prev.id}`);
        }
      }
      return {
        sequence: idx + 1,
        id: it.id || null,
        title: it.title || 'unnamed',
        valid: issues.length === 0,
        issues,
      };
    });

    const allValid = items.every(i => i.valid);
    const summary = {
      total_items: items.length,
      valid_items: items.filter(i => i.valid).length,
      broken_links: items.filter(i => !i.valid).length,
      chain_intact: allValid,
      first_break_at: allValid ? null : items.find(i => !i.valid)?.sequence,
    };

    await persistAnalysis('evidence-chain-validator', { count: evidence_chain.length }, { items, summary }, req.user?.id);

    res.json({ success: true, summary, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/materiality-calculator ───────────────────────────────────
// Compute quantitative materiality from supplied financials (no AI cost).
router.post('/materiality-calculator', auth, async (req, res) => {
  try {
    const { total_revenue, total_assets, pretax_income, total_equity, benchmark, percentage } = req.body;
    const benchmarks = {
      pretax_income: { val: parseFloat(pretax_income) || 0, range: [5, 10], label: 'Pretax Income' },
      revenue:       { val: parseFloat(total_revenue) || 0, range: [0.5, 1], label: 'Total Revenue' },
      total_assets:  { val: parseFloat(total_assets) || 0, range: [0.5, 1], label: 'Total Assets' },
      total_equity:  { val: parseFloat(total_equity) || 0, range: [1, 5], label: 'Total Equity' },
    };
    const key = benchmark || 'pretax_income';
    const b = benchmarks[key];
    if (!b) return res.status(400).json({ error: `Unknown benchmark: ${key}` });

    const pct = parseFloat(percentage) || 5;
    const overall = (b.val * pct) / 100;
    const performance = overall * 0.75;
    const trivial = overall * 0.05;

    const result = {
      benchmark: b.label,
      benchmark_value: b.val,
      percentage_used: pct,
      typical_range_pct: b.range,
      overall_materiality: Math.round(overall),
      performance_materiality: Math.round(performance),
      clearly_trivial_threshold: Math.round(trivial),
      methodology_note: '75% rule for performance materiality; 5% for trivial threshold per AS 2105.',
    };

    await persistAnalysis('materiality-calculator', req.body, result, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/risk-heat-map ────────────────────────────────────────────
// Aggregate evidence + findings risk by audit_area for visualization.
router.get('/risk-heat-map', auth, async (req, res) => {
  try {
    const { rows: ev } = await pool.query(
      `SELECT audit_area, risk_level, COUNT(*)::int AS count
       FROM audit_evidence
       GROUP BY audit_area, risk_level`
    );
    const { rows: fi } = await pool.query(
      `SELECT audit_area, severity AS risk_level, COUNT(*)::int AS count
       FROM audit_findings
       GROUP BY audit_area, severity`
    );

    const heatMap = {};
    [...ev, ...fi].forEach(r => {
      const area = r.audit_area || 'Uncategorized';
      const risk = (r.risk_level || 'Unknown').toLowerCase();
      if (!heatMap[area]) heatMap[area] = { evidence_low: 0, evidence_medium: 0, evidence_high: 0, evidence_critical: 0,
                                              finding_low: 0, finding_medium: 0, finding_high: 0, finding_critical: 0,
                                              total: 0, max_risk: 'low' };
      const isFinding = fi.some(f => f.audit_area === r.audit_area && (f.risk_level || '').toLowerCase() === risk);
      const prefix = isFinding ? 'finding_' : 'evidence_';
      const bucket = ['low', 'medium', 'high', 'critical'].includes(risk) ? risk : 'low';
      heatMap[area][prefix + bucket] += r.count;
      heatMap[area].total += r.count;
      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      if (order[bucket] > order[heatMap[area].max_risk]) heatMap[area].max_risk = bucket;
    });

    const heatList = Object.entries(heatMap).map(([area, data]) => ({ audit_area: area, ...data }));

    res.json({ success: true, heat_map: heatList, areas_count: heatList.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
