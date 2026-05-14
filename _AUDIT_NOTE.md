# Audit Apply Note — AIAuditWorkpaperAutomation

## Audit recommendations (from batch_00.md)

Substantive: 10 routes, 18 AI endpoints. Strong audit support platform.

### Missing AI counterparts
- AI account analysis (detect unusual GL movements)
- AI audit risk assessment (inherent + control risk)

### Missing non-AI features
- Accounting system integration (SAP, Oracle, NetSuite)
- External confirmation (third-party)
- Real-time monitoring (continuous auditing)

### Custom feature suggestions
- GL analysis automation
- Continuous audit monitoring
- XBRL/financial-statement analysis
- ERP integrations
- Audit-firm collaboration

## Implemented in this pass

None. Substantive project (18 AI endpoints). Remaining items need ERP integrations or large new subsystems (continuous-audit pipeline, GL ingest).

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| GL anomaly analysis | TOO-RISKY | New ingest + storage |
| AI inherent + control risk assessment | NEEDS-PRODUCT-DECISION | Audit framework |
| ERP integrations (SAP/Oracle/NetSuite) | NEEDS-CREDS | Vendor credentials |
| External confirmation workflow | NEEDS-PRODUCT-DECISION | Counter-party process |
| Real-time / continuous auditing | TOO-RISKY | Streaming pipeline |
| XBRL parser | TOO-RISKY | Heavy parser implementation |
| Audit-firm collaboration | NEEDS-PRODUCT-DECISION | Multi-tenant policy |

## Apply pass 4 (mechanical backlog)

- **Action:** SKIP — every remaining backlog item is tagged TOO-RISKY,
  NEEDS-CREDS, or NEEDS-PRODUCT-DECISION (ERP integrations,
  continuous-audit pipeline, GL anomaly ingest, XBRL parser, audit-firm
  collaboration). No MECHANICAL items to implement.

## Apply pass 3 (frontend)

- **Stack:** Express + Create-React-App (`client/`).
- **Backend AI endpoints:** 18 in `server/routes/ai.js` (analyze-evidence, calculate-sample, generate-workpaper, analyze-finding, assess-compliance, score-evidence-adequacy, classify-finding-severity, cross-audit-risk-linker, compliance-gap-analyzer, evidence-chain-validator, materiality-calculator, risk-heat-map, generate-from-template, history, etc.).
- **Action:** LEFT-AS-IS — FE already wired.
- **Notes:** `client/src/services/api.js` exports a wrapper for every AI endpoint, and per-feature pages (EvidenceAdequacyPage, MaterialityCalculatorPage, RiskHeatMapPage, AdvancedAIToolsPage, AIHistoryPage, WorkpaperTemplatesPage, etc.) consume them. No changes required.
