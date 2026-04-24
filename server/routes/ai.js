const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/openrouter');

// AI: Analyze audit evidence
router.post('/analyze-evidence', auth, async (req, res) => {
  try {
    const { evidence } = req.body;
    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in audit evidence analysis. Analyze the provided audit evidence and provide:
1. Evidence quality assessment (Sufficient, Appropriate, Reliable)
2. Key observations and potential risks
3. Recommended additional procedures
4. Overall assessment summary
Format your response with clear sections and professional language suitable for audit workpapers.`;

    const prompt = `Analyze this audit evidence:\n\nTitle: ${evidence.title}\nType: ${evidence.evidence_type}\nSource: ${evidence.source}\nAudit Area: ${evidence.audit_area}\nRisk Level: ${evidence.risk_level}\nDescription: ${evidence.description}\nNotes: ${evidence.notes || 'N/A'}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Calculate optimal sample size
router.post('/calculate-sample', auth, async (req, res) => {
  try {
    const { sampling } = req.body;
    const systemPrompt = `You are an expert statistical auditor AI assistant. Calculate and recommend optimal sample sizes for audit procedures. Provide:
1. Recommended sample size with statistical justification
2. Sampling methodology recommendation
3. Risk assessment for the sampling approach
4. Key assumptions and limitations
5. Confidence interval analysis
Use professional audit standards (ISA 530, AICPA AU-C 530) as references.`;

    const prompt = `Calculate optimal sample for this audit sampling plan:\n\nTitle: ${sampling.title}\nPopulation Size: ${sampling.population_size}\nCurrent Sample Size: ${sampling.sample_size}\nConfidence Level: ${sampling.confidence_level}%\nSampling Method: ${sampling.sampling_method}\nAudit Area: ${sampling.audit_area}\nMateriality Threshold: ${sampling.materiality_threshold}\nTolerable Error: ${sampling.tolerable_error}\nExpected Error Rate: ${sampling.expected_error_rate}%\nDescription: ${sampling.description || 'N/A'}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Generate workpaper content
router.post('/generate-workpaper', auth, async (req, res) => {
  try {
    const { workpaper } = req.body;
    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in workpaper preparation. Generate comprehensive workpaper content including:
1. Detailed audit objectives
2. Scope of procedures
3. Step-by-step procedures to be performed
4. Expected evidence to gather
5. Conclusion template
Format the output professionally as would appear in a CPA firm's audit workpapers, following PCAOB and AICPA standards.`;

    const prompt = `Generate comprehensive workpaper content for:\n\nTitle: ${workpaper.title}\nReference: ${workpaper.reference_number}\nAudit Area: ${workpaper.audit_area}\nEngagement: ${workpaper.engagement}\nObjective: ${workpaper.objective || 'To be determined'}\nScope: ${workpaper.scope || 'To be determined'}\nCurrent Procedures: ${workpaper.procedures_performed || 'None documented yet'}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Analyze finding and generate recommendation
router.post('/analyze-finding', auth, async (req, res) => {
  try {
    const { finding } = req.body;
    const systemPrompt = `You are an expert CPA auditor AI assistant specializing in audit findings documentation. Analyze the audit finding and provide:
1. Root cause analysis
2. Impact assessment (financial, operational, compliance)
3. Detailed remediation recommendations
4. Management response suggestions
5. Follow-up procedures
6. Risk rating justification
Format as professional audit finding documentation per IIA and PCAOB standards.`;

    const prompt = `Analyze this audit finding:\n\nTitle: ${finding.title}\nType: ${finding.finding_type}\nSeverity: ${finding.severity}\nAudit Area: ${finding.audit_area}\nCondition: ${finding.condition}\nCriteria: ${finding.criteria}\nCause: ${finding.cause || 'To be determined'}\nEffect: ${finding.effect || 'To be determined'}\nCurrent Recommendation: ${finding.recommendation || 'None yet'}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Generate compliance assessment
router.post('/assess-compliance', auth, async (req, res) => {
  try {
    const { checklist } = req.body;
    const systemPrompt = `You are an expert compliance auditor AI assistant. Assess compliance status and provide:
1. Compliance gap analysis
2. Required evidence for compliance demonstration
3. Remediation steps if non-compliant
4. Best practices for maintaining compliance
5. Cross-reference to related regulatory requirements
6. Testing procedures to verify compliance
Reference applicable frameworks (SOX, SOC2, HIPAA, GDPR, PCI-DSS, etc.) as appropriate.`;

    const prompt = `Assess compliance for this checklist item:\n\nTitle: ${checklist.title}\nFramework: ${checklist.framework}\nCategory: ${checklist.category}\nRequirement: ${checklist.requirement}\nDescription: ${checklist.description}\nCurrent Status: ${checklist.compliance_status}\nRegulation Reference: ${checklist.regulation_reference || 'N/A'}\nEvidence Reference: ${checklist.evidence_reference || 'None provided'}`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
