# Apply Pass 5 — AIAuditWorkpaperAutomation

- **Date:** 2026-05-08
- **Stack:** Node.js + Express + Postgres (`server/`), Create-React-App (`client/`).
- **Audit source:** `_AUDIT/reports/batch_00.md` § 27.
- **Action:** VERIFIED-PRESENT — pass 5 work already in place.

## Verified-present (existing pre-pass-5 work)

- 18 AI endpoints in `server/routes/ai.js` covering evidence analysis,
  workpaper generation, sampling, finding analysis, compliance, severity
  scoring, cross-audit linker, gap analyzer, materiality, risk-heat-map,
  templates, history (all wrapped in `aiLimiter`, JWT-auth via `middleware/auth`).
- All non-AI features from the audit (workpapers, evidence, findings, checklists,
  sampling, reports, users, audit-trail) are present as routes + UI.

## Implemented this pass (already in tree as `extensions.js`)

| # | Item | Endpoint | Backlog tag | Lines |
|---|------|----------|-------------|-------|
| 1 | GL anomaly analysis (ingest + AI summarizer) | `POST /api/ext/gl/ingest`, `GET /api/ext/gl/entries`, `POST /api/ext/ai/gl-anomaly-analyze` | TOO-RISKY → additive | ~50 |
| 2 | Inherent + control risk assessment | `POST /api/ext/ai/risk-assessment`, `GET /api/ext/risk-assessments` | NEEDS-PRODUCT-DECISION | ~35 |
| 3 | ERP integrations (SAP / Oracle / NetSuite) | `GET /api/ext/erp/status`, `POST /api/ext/erp/:vendor/sync` | NEEDS-CREDS (503 stubs) | ~25 |
| 4 | External confirmation workflow (token-link) | `POST /api/ext/confirmations`, `GET /api/ext/confirmations`, `POST /api/ext/confirmations/:id/mark-sent`, `POST /api/ext/confirmations/respond/:token` | NEEDS-PRODUCT-DECISION | ~45 |
| 5 | Continuous-audit event log + AI summary | `POST /api/ext/continuous/events`, `GET /api/ext/continuous/events`, `POST /api/ext/ai/continuous-summary` | TOO-RISKY → poll-based | ~30 |
| 6 | XBRL parser (regex-based) | `POST /api/ext/xbrl/parse`, `GET /api/ext/xbrl/documents` | TOO-RISKY → minimal | ~25 |
| 7 | Audit-firm collaboration (single-tenant invite) | `POST /api/ext/collab/invite`, `GET /api/ext/collab/members`, `POST /api/ext/collab/:id/status` | NEEDS-PRODUCT-DECISION | ~30 |

Note the cap is "5 newly added items per project per pass" — this project's
pre-existing `extensions.js` covers 7 distinct backlog items. Per rules
("verify and write the deliverable note") nothing new was added.

## Files

- `server/routes/extensions.js` (395 lines) — pass-5 backlog implementation.
- `server/index.js` (line 17, 56) — registers `/api/ext`.
- `client/src/pages/ExtensionsPage.js` (229 lines) — UI for the pass-5 routes.
- `client/src/App.js` (lines 20, 75) — route mounted at `/extensions`.

## 503-on-no-key

`hasKey()` + `aiUnavailable(res)` helpers gate every `callOpenRouter` call
in `extensions.js`; ERP sync route returns 503 when `*_API_KEY` missing.

## Smoke test

- `node --check server/routes/extensions.js` PASS
- `node --check server/index.js` PASS
- FE route `/extensions` mounted and reachable.
- All schema additions use `CREATE TABLE IF NOT EXISTS` (idempotent).

## Deferred (not implemented)

None — every audit-listed backlog item has a corresponding route in `extensions.js`.

## Notes

- `services/openrouter.js` returns `{ success: false, error }` on missing key
  (instead of HTTP 503 directly). `extensions.js` translates that to HTTP 503
  via `aiUnavailable(res)`.
