-- Drop existing tables
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS compliance_checklists CASCADE;
DROP TABLE IF EXISTS audit_findings CASCADE;
DROP TABLE IF EXISTS workpapers CASCADE;
DROP TABLE IF EXISTS statistical_sampling CASCADE;
DROP TABLE IF EXISTS audit_evidence CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'auditor',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Evidence table
CREATE TABLE audit_evidence (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source VARCHAR(255),
  evidence_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Pending',
  audit_area VARCHAR(255),
  risk_level VARCHAR(50) DEFAULT 'Medium',
  collected_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Statistical Sampling table
CREATE TABLE statistical_sampling (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  population_size INTEGER,
  sample_size INTEGER,
  confidence_level DECIMAL(5,2),
  sampling_method VARCHAR(100),
  audit_area VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Planned',
  materiality_threshold DECIMAL(15,2),
  tolerable_error DECIMAL(15,2),
  expected_error_rate DECIMAL(5,2),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workpapers table
CREATE TABLE workpapers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  reference_number VARCHAR(50),
  audit_area VARCHAR(255),
  engagement VARCHAR(255),
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Draft',
  objective TEXT,
  scope TEXT,
  procedures_performed TEXT,
  conclusion TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Findings table
CREATE TABLE audit_findings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  finding_type VARCHAR(100),
  severity VARCHAR(50),
  audit_area VARCHAR(255),
  condition TEXT,
  criteria TEXT,
  cause TEXT,
  effect TEXT,
  recommendation TEXT,
  management_response TEXT,
  status VARCHAR(50) DEFAULT 'Open',
  assigned_to VARCHAR(255),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Checklists table
CREATE TABLE compliance_checklists (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  framework VARCHAR(100),
  category VARCHAR(255),
  requirement TEXT,
  description TEXT,
  compliance_status VARCHAR(50) DEFAULT 'Not Started',
  evidence_reference VARCHAR(500),
  assigned_to VARCHAR(255),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'Medium',
  regulation_reference VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Trail table
CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id INTEGER,
  record_title VARCHAR(500),
  details TEXT,
  performed_by VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Users (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password_hash, role) VALUES
('Sarah Mitchell', 'admin@auditpro.com', '$2a$10$aJRFCTG0Ojd/QOUR9Ld1E.dn5zRsQ8I4SAiRLe05vINvNW3S8TM5u', 'admin'),
('John Anderson', 'john@auditpro.com', '$2a$10$aJRFCTG0Ojd/QOUR9Ld1E.dn5zRsQ8I4SAiRLe05vINvNW3S8TM5u', 'senior_auditor'),
('Emily Chen', 'emily@auditpro.com', '$2a$10$aJRFCTG0Ojd/QOUR9Ld1E.dn5zRsQ8I4SAiRLe05vINvNW3S8TM5u', 'auditor');

-- Seed Audit Evidence (15+ items)
INSERT INTO audit_evidence (title, description, source, evidence_type, status, audit_area, risk_level, collected_by, notes) VALUES
('Bank Reconciliation - Q4 2025', 'Monthly bank reconciliation statements for all operating accounts for October through December 2025', 'First National Bank', 'Documentary', 'Verified', 'Cash & Bank', 'Low', 'Sarah Mitchell', 'All reconciling items cleared within 30 days. No unusual items noted.'),
('Accounts Receivable Confirmations', 'Positive confirmations sent to top 25 customers representing 80% of total AR balance', 'Direct Customer Response', 'Confirmation', 'In Progress', 'Revenue & Receivables', 'High', 'John Anderson', '18 of 25 confirmations received. 3 exceptions noted requiring follow-up.'),
('Inventory Physical Count Sheets', 'Complete physical inventory count documentation from annual inventory performed 12/31/2025', 'Internal Count Teams', 'Physical Inspection', 'Verified', 'Inventory', 'High', 'Emily Chen', 'Count conducted with dual-count procedures. Variance of 0.3% noted.'),
('Vendor Invoice Sample - Expenses', 'Sample of 60 vendor invoices selected for expense testing across all departments', 'Accounts Payable Department', 'Documentary', 'Pending Review', 'Expenses & AP', 'Medium', 'Sarah Mitchell', 'Invoices selected using MUS sampling. Testing in progress.'),
('Revenue Recognition Contracts', 'Review of 15 significant revenue contracts for ASC 606 compliance assessment', 'Legal Department', 'Documentary', 'Verified', 'Revenue & Receivables', 'High', 'John Anderson', 'Performance obligations identified and documented for each contract.'),
('Fixed Asset Inspection Report', 'Physical inspection of major fixed assets exceeding $100K capitalization threshold', 'Facilities Management', 'Physical Inspection', 'Completed', 'Property & Equipment', 'Medium', 'Emily Chen', 'All assets physically verified. Two assets require impairment assessment.'),
('Board Meeting Minutes', 'Minutes from quarterly board meetings for FY2025 including audit committee sessions', 'Corporate Secretary', 'Documentary', 'Verified', 'Governance', 'Low', 'Sarah Mitchell', 'All significant transactions approved by board. Related party disclosures reviewed.'),
('Payroll Register Analysis', 'Complete payroll register for December 2025 with analytical procedures comparison to prior year', 'HR/Payroll Department', 'Analytical', 'In Progress', 'Payroll & Benefits', 'Medium', 'John Anderson', 'Overall payroll increased 8.2% YoY. Investigating variances > 15% by department.'),
('IT General Controls Assessment', 'Documentation of ITGC testing covering access controls, change management, and operations', 'IT Department', 'Inquiry & Observation', 'Pending Review', 'IT Controls', 'High', 'Emily Chen', 'Preliminary findings indicate 2 control deficiencies in access provisioning.'),
('Lease Agreement Summaries', 'ASC 842 lease classification analysis for all material lease agreements', 'Legal/Accounting', 'Documentary', 'Verified', 'Leases', 'Medium', 'Sarah Mitchell', 'ROU asset calculations verified. One lease requires reclassification from operating to finance.'),
('Related Party Transaction Log', 'Complete listing and analysis of all related party transactions for FY2025', 'Management', 'Inquiry', 'Completed', 'Related Parties', 'High', 'John Anderson', 'All transactions appear at arms-length. Board approval documented for transactions > $50K.'),
('Subsequent Events Review', 'Analysis of subsequent events from year-end through audit report date', 'Multiple Sources', 'Inquiry & Documentary', 'In Progress', 'Subsequent Events', 'Medium', 'Emily Chen', 'One Type I subsequent event identified requiring adjustment. No Type II events noted.'),
('Tax Provision Workpapers', 'Income tax provision calculation supporting documentation including deferred tax analysis', 'Tax Department', 'Documentary', 'Pending Review', 'Income Taxes', 'High', 'Sarah Mitchell', 'Effective tax rate reconciliation shows 2% variance from statutory rate.'),
('Debt Covenant Compliance', 'Analysis of compliance with all financial covenants under credit facility agreements', 'Treasury Department', 'Documentary', 'Verified', 'Debt & Equity', 'High', 'John Anderson', 'All covenants met as of 12/31/2025. Debt-to-equity ratio has minimal cushion.'),
('Management Representation Letter', 'Draft management representation letter with all required representations per AU-C 580', 'Management', 'Written Representation', 'Draft', 'Overall Engagement', 'Low', 'Sarah Mitchell', 'Letter drafted pending final review and signature by CEO and CFO.');

-- Seed Statistical Sampling (15+ items)
INSERT INTO statistical_sampling (title, population_size, sample_size, confidence_level, sampling_method, audit_area, status, materiality_threshold, tolerable_error, expected_error_rate, description, notes) VALUES
('AP Disbursement Testing', 12500, 60, 95.00, 'Monetary Unit Sampling', 'Expenses & AP', 'Completed', 250000.00, 125000.00, 1.50, 'Testing of accounts payable disbursements for proper authorization and documentation', 'MUS applied to full year disbursements. Top stratum items tested 100%.'),
('Revenue Transaction Testing', 8750, 45, 95.00, 'Monetary Unit Sampling', 'Revenue & Receivables', 'In Progress', 500000.00, 250000.00, 0.75, 'Revenue recognition testing for proper cut-off and classification', 'Focus on Q4 transactions and year-end adjustments.'),
('Inventory Price Testing', 3200, 40, 90.00, 'Random Sampling', 'Inventory', 'Planned', 175000.00, 87500.00, 2.00, 'Test inventory unit costs against recent purchase invoices and market prices', 'Include both raw materials and finished goods populations.'),
('Payroll Sample Selection', 2400, 30, 95.00, 'Systematic Sampling', 'Payroll & Benefits', 'Completed', 100000.00, 50000.00, 1.00, 'Monthly payroll testing for proper calculation and authorization', 'Selected every 80th employee from sorted payroll register.'),
('Fixed Asset Additions', 450, 25, 95.00, 'Monetary Unit Sampling', 'Property & Equipment', 'In Progress', 200000.00, 100000.00, 0.50, 'Testing of capital asset additions for proper capitalization and classification', 'All additions > $100K tested plus MUS sample of remaining.'),
('Journal Entry Testing', 15600, 50, 95.00, 'Haphazard + Targeted', 'Overall Engagement', 'Completed', 300000.00, 150000.00, 2.50, 'Non-standard journal entry testing focusing on fraud risk indicators', 'Targeted entries: weekend postings, round amounts, unusual accounts.'),
('Customer Credit Memo Sample', 1800, 35, 90.00, 'Random Sampling', 'Revenue & Receivables', 'Planned', 75000.00, 37500.00, 3.00, 'Testing credit memos for proper authorization and validity', 'Focus on credit memos issued in last 2 weeks of fiscal year.'),
('Expense Report Compliance', 4500, 40, 90.00, 'Stratified Random', 'Expenses & AP', 'In Progress', 50000.00, 25000.00, 5.00, 'Employee expense report testing for policy compliance', 'Stratified by amount: >$5K, $1K-$5K, <$1K.'),
('Intercompany Transaction Testing', 2100, 30, 95.00, 'Monetary Unit Sampling', 'Consolidation', 'Planned', 400000.00, 200000.00, 1.00, 'Testing intercompany transactions for proper elimination and pricing', 'Cover all significant intercompany balances across subsidiaries.'),
('Warranty Reserve Sample', 850, 20, 90.00, 'Random Sampling', 'Estimates & Reserves', 'Completed', 150000.00, 75000.00, 2.00, 'Testing warranty claims to validate reserve estimation methodology', 'Compare actual claims to estimated amounts for reasonableness.'),
('Investment Valuation Testing', 125, 15, 95.00, 'Selection of All Items', 'Investments', 'Completed', 500000.00, 250000.00, 0.25, 'Fair value testing of investment portfolio holdings', 'All material investments tested. Third-party pricing service used.'),
('Insurance Policy Testing', 45, 15, 95.00, 'Selection of All Items', 'Prepaid & Other', 'In Progress', 100000.00, 50000.00, 1.00, 'Testing of insurance policies for proper coverage and prepaid calculation', 'All policies > $10K premium tested.'),
('Grant Compliance Testing', 680, 25, 95.00, 'Stratified Random', 'Grants & Contracts', 'Planned', 200000.00, 100000.00, 2.00, 'Federal grant expenditure testing for allowability and allocability', 'Stratified by federal program. Single Audit requirements apply.'),
('Sales Returns Testing', 3400, 35, 90.00, 'Random Sampling', 'Revenue & Receivables', 'In Progress', 125000.00, 62500.00, 4.00, 'Testing sales returns and allowances for proper period recording', 'Focus on returns processed in January following year-end.'),
('Construction Contract Sampling', 180, 20, 95.00, 'Monetary Unit Sampling', 'Revenue & Receivables', 'Planned', 350000.00, 175000.00, 1.50, 'ASC 606 percentage-of-completion testing for construction contracts', 'Test cost estimates and progress measurements for material contracts.');

-- Seed Workpapers (15+ items)
INSERT INTO workpapers (title, reference_number, audit_area, engagement, prepared_by, reviewed_by, status, objective, scope, procedures_performed, conclusion, notes) VALUES
('Cash & Bank Balances Lead Sheet', 'A-100', 'Cash & Bank', 'FY2025 Annual Audit', 'Emily Chen', 'Sarah Mitchell', 'Reviewed', 'To verify the existence and completeness of cash and bank balances', 'All bank accounts and cash equivalents as of 12/31/2025', 'Obtained bank confirmations, performed bank reconciliations, tested outstanding checks and deposits in transit', 'Cash and bank balances are fairly stated. No exceptions noted.', 'Includes 8 bank accounts across 3 financial institutions.'),
('Accounts Receivable Testing', 'B-200', 'Revenue & Receivables', 'FY2025 Annual Audit', 'John Anderson', 'Sarah Mitchell', 'In Progress', 'To verify existence, valuation, and completeness of accounts receivable', 'Trade receivables and allowance for doubtful accounts as of 12/31/2025', 'Sent positive confirmations, performed aging analysis, tested subsequent receipts, evaluated allowance methodology', NULL, 'Confirmation response rate at 72%. Alternative procedures needed for non-responses.'),
('Inventory Observation & Testing', 'C-300', 'Inventory', 'FY2025 Annual Audit', 'Emily Chen', 'John Anderson', 'Draft', 'To verify existence, valuation, and proper classification of inventory', 'Raw materials, WIP, and finished goods inventory at all locations', 'Observed physical counts, performed test counts, tested pricing, evaluated obsolescence reserve', NULL, 'Three warehouse locations observed. Cycle count program evaluated.'),
('Revenue Recognition Analysis', 'D-100', 'Revenue & Receivables', 'FY2025 Annual Audit', 'Sarah Mitchell', 'John Anderson', 'Reviewed', 'To evaluate revenue recognition in compliance with ASC 606', 'All revenue streams including product sales, services, and licensing', 'Identified performance obligations, tested transaction prices, evaluated timing of recognition, performed cut-off testing', 'Revenue is recognized in accordance with ASC 606. One immaterial timing difference noted.', 'Five-step model analysis documented for each revenue stream.'),
('PP&E and Depreciation Testing', 'E-100', 'Property & Equipment', 'FY2025 Annual Audit', 'John Anderson', 'Sarah Mitchell', 'In Progress', 'To verify existence, completeness, and proper valuation of fixed assets', 'Property, plant, equipment, and accumulated depreciation', 'Tested additions and disposals, recalculated depreciation, performed physical inspection of major assets', NULL, 'Useful life assessment for manufacturing equipment in progress.'),
('Accounts Payable Completeness', 'F-200', 'Expenses & AP', 'FY2025 Annual Audit', 'Emily Chen', 'Sarah Mitchell', 'Draft', 'To verify completeness and accuracy of accounts payable', 'Trade payables and accrued expenses as of 12/31/2025', 'Performed search for unrecorded liabilities, tested vendor statements, reviewed post year-end disbursements', NULL, 'Reviewing disbursements through 2/15/2026 for unrecorded liabilities.'),
('Income Tax Provision Review', 'G-100', 'Income Taxes', 'FY2025 Annual Audit', 'Sarah Mitchell', NULL, 'Draft', 'To evaluate the reasonableness of the income tax provision and deferred taxes', 'Current and deferred income tax balances, effective tax rate reconciliation', 'Reviewed tax provision calculation, tested significant temporary differences, evaluated uncertain tax positions', NULL, 'Awaiting final tax return data from client tax department.'),
('Debt & Covenant Compliance', 'H-100', 'Debt & Equity', 'FY2025 Annual Audit', 'John Anderson', 'Sarah Mitchell', 'Reviewed', 'To verify debt balances and compliance with debt covenants', 'Long-term debt, current maturities, and related covenant calculations', 'Confirmed debt balances, reviewed loan agreements, recalculated covenant ratios, tested interest expense', 'Debt balances confirmed. All covenants met with adequate cushion.', 'Refinancing of revolving credit facility noted in subsequent events.'),
('Equity & Stockholders Transactions', 'I-100', 'Debt & Equity', 'FY2025 Annual Audit', 'Emily Chen', 'John Anderson', 'Draft', 'To verify equity transactions and proper disclosure', 'Common stock, retained earnings, AOCI, and treasury stock', 'Reviewed board minutes, tested dividend calculations, verified share counts with transfer agent', NULL, 'Stock option plan activity testing in progress.'),
('Lease Accounting - ASC 842', 'J-100', 'Leases', 'FY2025 Annual Audit', 'Sarah Mitchell', 'John Anderson', 'Reviewed', 'To verify proper classification and measurement of leases under ASC 842', 'All operating and finance leases with terms > 12 months', 'Reviewed lease agreements, recalculated ROU assets and lease liabilities, tested discount rates, verified disclosures', 'Lease accounting is in compliance with ASC 842. One reclassification noted.', 'Portfolio approach applied to equipment leases with similar characteristics.'),
('Payroll & Benefits Testing', 'K-100', 'Payroll & Benefits', 'FY2025 Annual Audit', 'John Anderson', 'Sarah Mitchell', 'In Progress', 'To verify accuracy and completeness of payroll and benefit expenses', 'Salaries, wages, bonuses, benefits, and related accruals', 'Tested payroll calculations, verified benefits enrollment, tested accrued bonus calculations, reviewed payroll tax compliance', NULL, 'Analytical procedures show 8.2% increase in total compensation.'),
('Related Party Transactions', 'L-100', 'Related Parties', 'FY2025 Annual Audit', 'Sarah Mitchell', 'John Anderson', 'Reviewed', 'To identify and evaluate related party transactions for proper disclosure', 'All transactions with related parties as defined by ASC 850', 'Obtained management representations, reviewed board minutes, tested pricing for arms-length basis, verified disclosures', 'All related party transactions are properly disclosed and appear at arms-length.', 'Management representation obtained regarding completeness of related party identification.'),
('Subsequent Events Evaluation', 'M-100', 'Subsequent Events', 'FY2025 Annual Audit', 'Emily Chen', 'Sarah Mitchell', 'In Progress', 'To identify and evaluate subsequent events per ASC 855', 'Events from 12/31/2025 through audit report date', 'Reviewed minutes, inquired of management, reviewed subsequent period financials, examined legal correspondence', NULL, 'Dual-date consideration for one potential Type I event.'),
('Going Concern Assessment', 'N-100', 'Overall Engagement', 'FY2025 Annual Audit', 'Sarah Mitchell', 'John Anderson', 'Draft', 'To evaluate whether substantial doubt exists about going concern', 'Companys ability to continue as going concern for 12 months beyond FS date', 'Analyzed financial trends, reviewed forecasts, evaluated debt maturities, assessed management plans', NULL, 'Preliminary assessment: no substantial doubt. Final analysis pending.'),
('Consolidation & Eliminations', 'O-100', 'Consolidation', 'FY2025 Annual Audit', 'John Anderson', 'Sarah Mitchell', 'Draft', 'To verify proper consolidation and elimination of intercompany transactions', 'Parent and all subsidiary financial statements', 'Tested elimination entries, verified minority interests, reconciled intercompany balances', NULL, 'Three domestic and two foreign subsidiaries included in consolidation.');

-- Seed Audit Findings (15+ items)
INSERT INTO audit_findings (title, finding_type, severity, audit_area, condition, criteria, cause, effect, recommendation, management_response, status, assigned_to, due_date, notes) VALUES
('Inadequate Segregation of Duties in AP', 'Internal Control', 'High', 'Expenses & AP', 'The same individual can create vendors, approve invoices, and process payments in the accounting system', 'COSO Framework requires adequate segregation of duties; SOX Section 404 requirements', 'Staff reduction during reorganization eliminated one AP position', 'Increased risk of unauthorized payments and potential fraud', 'Implement compensating controls or hire additional AP staff to separate incompatible duties', 'Management agrees. Plan to implement dual-approval workflow by Q2 2026.', 'Open', 'John Anderson', '2026-06-30', 'Material weakness in internal controls. Repeat finding from prior year.'),
('Revenue Cut-off Errors', 'Financial Statement', 'High', 'Revenue & Receivables', 'Three revenue transactions totaling $285,000 were recorded in incorrect period', 'ASC 606 requires revenue recognition when performance obligations are satisfied', 'Manual revenue recognition process lacks automated cut-off controls', 'Revenue overstatement of $285,000 in Q4 2025', 'Implement automated revenue recognition controls linked to shipping/delivery confirmation', NULL, 'Open', 'Sarah Mitchell', '2026-03-31', 'Exceeds clearly trivial threshold. Proposed adjustment accepted by client.'),
('Missing Inventory Count Documentation', 'Compliance', 'Medium', 'Inventory', 'Physical inventory count sheets for Warehouse B were incomplete - 12 count areas had missing second counts', 'Company policy requires dual-count procedures for all inventory locations', 'Count team supervisor reassigned staff before completing all areas', 'Unable to verify accuracy of $1.2M in inventory in affected areas', 'Ensure adequate staffing and supervision for physical inventory. Implement count completion checklists.', 'Management will implement enhanced count procedures for next year.', 'Remediation Planned', 'Emily Chen', '2026-12-01', 'Performed alternative procedures to gain comfort over affected areas.'),
('IT Access Control Deficiencies', 'Internal Control', 'High', 'IT Controls', '15 terminated employees retained active system access for average of 45 days post-termination', 'Access should be revoked within 24 hours of employment termination per IT policy', 'No automated integration between HR system and IT access management', 'Risk of unauthorized access to financial systems and data', 'Implement automated deprovisioning triggered by HR termination processing', 'IT implementing identity management system. Expected completion Q3 2026.', 'Open', 'Emily Chen', '2026-09-30', 'Significant deficiency. Tested sample of 30 terminations in FY2025.'),
('Lease Classification Error', 'Financial Statement', 'Medium', 'Leases', 'One equipment lease classified as operating should be classified as finance lease under ASC 842', 'ASC 842 classification criteria - lease transfers substantially all economic benefits', 'Complex lease terms with variable payments not properly evaluated', 'Operating lease expense overstated; depreciation and interest understated by $45,000', 'Reclassify the lease and retrain accounting staff on ASC 842 classification criteria', 'Agreed. Will reclassify and enhance lease review procedures.', 'Remediation Planned', 'Sarah Mitchell', '2026-03-31', 'Immaterial to financial statements overall but noted for corrective action.'),
('Inadequate Journal Entry Controls', 'Internal Control', 'Medium', 'Overall Engagement', 'Non-standard journal entries lack required supporting documentation in 8 of 50 tested entries', 'Company policy requires approval and documentation for all manual journal entries', 'Inconsistent enforcement of documentation requirements', 'Risk of material misstatement from unsupported adjustments', 'Enforce mandatory documentation upload before journal entry posting. Implement system controls.', NULL, 'Open', 'John Anderson', '2026-06-30', 'Eight exceptions ranged from $5,000 to $125,000.'),
('Bank Reconciliation Timeliness', 'Compliance', 'Low', 'Cash & Bank', 'Bank reconciliations for two accounts were completed 15-20 days after month-end versus 5-day policy', 'Company policy requires bank reconciliations within 5 business days of month-end', 'Controller vacancy during August-September resulted in backlog', 'Delayed detection of reconciling items and potential errors', 'Establish backup reconciliation assignments and escalation procedures', 'New controller hired. Reconciliation backlog cleared.', 'Closed', 'Sarah Mitchell', '2026-01-31', 'No misstatements identified in late reconciliations.'),
('Insufficient Allowance for Doubtful Accounts', 'Financial Statement', 'High', 'Revenue & Receivables', 'Allowance for doubtful accounts appears understated by approximately $320,000 based on aging analysis', 'ASC 326 requires estimation based on expected credit losses', 'Allowance methodology not updated to reflect current economic conditions', 'Potential understatement of bad debt expense and overstatement of net receivables', 'Update allowance methodology to incorporate forward-looking economic indicators per ASC 326', NULL, 'Open', 'John Anderson', '2026-03-31', 'Key accounting estimate requiring significant auditor judgment.'),
('Missing Disclosure - Contingent Liabilities', 'Financial Statement', 'Medium', 'Legal & Contingencies', 'Pending litigation with estimated exposure of $500K-$1.5M not disclosed in financial statement footnotes', 'ASC 450 requires disclosure of reasonably possible loss contingencies', 'Legal department did not communicate updated litigation status to accounting', 'Financial statement footnotes are incomplete', 'Establish quarterly legal representation process and update disclosure procedures', 'Will add disclosure. Implementing quarterly legal update process.', 'Remediation Planned', 'Sarah Mitchell', '2026-03-31', 'Outside counsel confirmed loss is reasonably possible but not probable.'),
('Payroll Tax Filing Delays', 'Compliance', 'Medium', 'Payroll & Benefits', 'Quarterly payroll tax filings in two states were submitted 10-15 days late', 'Federal and state regulations require timely filing of payroll tax returns', 'Transition to new payroll service provider caused processing delays', 'Late filing penalties of approximately $8,500 incurred', 'Implement payroll tax filing calendar with automated reminders and backup procedures', 'Payroll provider issues resolved. No further late filings expected.', 'Closed', 'Emily Chen', '2026-01-15', 'Penalties expensed in Q3 2025.'),
('Depreciation Calculation Errors', 'Financial Statement', 'Low', 'Property & Equipment', 'Depreciation for 5 assets incorrectly calculated due to wrong useful life assignments', 'Consistent application of depreciation policies per ASC 360', 'Data entry errors during asset master file migration', 'Net depreciation understated by $28,000 for FY2025', 'Reconcile asset master file and implement validation controls for useful life entries', 'Corrections made. Asset master file review in progress.', 'Remediation Planned', 'John Anderson', '2026-04-30', 'Below materiality threshold but corrected.'),
('Weak Password Policy Enforcement', 'Internal Control', 'Medium', 'IT Controls', 'ERP system allows passwords that do not meet minimum complexity requirements', 'IT security policy requires 12+ character passwords with complexity requirements', 'Legacy system configuration not updated during security policy revision', 'Increased vulnerability to unauthorized access and brute force attacks', 'Update ERP password configuration to enforce current security policy requirements', 'IT scheduled system update for password enforcement in next maintenance window.', 'Open', 'Emily Chen', '2026-04-30', 'Compensating control: MFA is enabled for all ERP users.'),
('Intercompany Balance Discrepancies', 'Financial Statement', 'Medium', 'Consolidation', 'Intercompany balances between parent and two subsidiaries do not reconcile - $175K difference', 'Intercompany balances must reconcile to zero upon consolidation elimination', 'Timing differences and currency translation not properly coordinated', 'Consolidation adjustments required; potential misstatement of individual entity financials', 'Implement monthly intercompany reconciliation process with defined resolution timeline', NULL, 'Open', 'John Anderson', '2026-05-31', 'Investigating whether difference is timing or error.'),
('Inadequate Vendor Due Diligence', 'Compliance', 'Medium', 'Expenses & AP', 'New vendor onboarding process lacks verification of tax identification numbers and business registration', 'IRS requirements for TIN verification; company procurement policy', 'Vendor management procedures not updated since 2019', 'Risk of payments to fictitious vendors; potential 1099 reporting issues', 'Update vendor onboarding procedures to include TIN verification and business registration checks', 'Procurement team updating vendor onboarding checklist.', 'Remediation Planned', 'Sarah Mitchell', '2026-06-30', 'No fictitious vendor activity detected in testing.'),
('Equity Method Investment Accounting', 'Financial Statement', 'High', 'Investments', 'Equity method investment income not properly adjusted for investees reported adjustments', 'ASC 323 requires timely recognition of equity in investee earnings', 'Investee financial statements received after year-end close', 'Investment income potentially understated by $210,000', 'Establish communication protocol with investees for timely financial reporting', NULL, 'Open', 'Sarah Mitchell', '2026-03-31', 'Material amount. Proposed adjustment under discussion with management.');

-- Seed Compliance Checklists (15+ items)
INSERT INTO compliance_checklists (title, framework, category, requirement, description, compliance_status, evidence_reference, assigned_to, due_date, priority, regulation_reference, notes) VALUES
('Access Control Policy Review', 'SOX', 'IT General Controls', 'Logical access to financial systems must be restricted based on job responsibilities', 'Review and test logical access controls for all financially significant applications including ERP, GL, and reporting systems', 'Compliant', 'ITGC-AC-001 through AC-025', 'Emily Chen', '2026-02-28', 'High', 'SOX Section 404; PCAOB AS 2201', 'Annual access review completed 1/15/2026. Three exceptions remediated.'),
('Change Management Controls', 'SOX', 'IT General Controls', 'All changes to financial applications must follow approved change management procedures', 'Verify that system changes are properly authorized, tested, and approved before implementation', 'Compliant', 'ITGC-CM-001 through CM-015', 'Emily Chen', '2026-02-28', 'High', 'SOX Section 404; COBIT 5', 'Tested 15 changes. All properly documented and approved.'),
('Financial Close Process', 'SOX', 'Financial Reporting', 'Month-end and year-end close processes must be documented and consistently followed', 'Evaluate the completeness and timeliness of the financial close process including journal entries, reconciliations, and reviews', 'Partially Compliant', 'FR-CLOSE-001 through CLOSE-010', 'Sarah Mitchell', '2026-03-15', 'High', 'SOX Section 302/404', 'Two reconciliations consistently late. Corrective action plan in place.'),
('Revenue Recognition Controls', 'SOX', 'Financial Reporting', 'Revenue recognition must comply with ASC 606 with appropriate controls over the process', 'Test controls over revenue recognition including contract review, performance obligation identification, and transaction price allocation', 'Non-Compliant', 'FR-REV-001 through REV-020', 'John Anderson', '2026-03-31', 'Critical', 'SOX Section 404; ASC 606', 'Three cut-off errors identified. Control redesign recommended.'),
('Data Privacy - Customer Records', 'SOC 2', 'Privacy', 'Customer personal information must be collected, used, retained, and disclosed in accordance with privacy commitments', 'Evaluate data privacy controls including consent management, data minimization, and retention policies', 'Compliant', 'PRV-001 through PRV-012', 'Emily Chen', '2026-04-30', 'High', 'SOC 2 Type II; TSC Privacy Criteria', 'Annual privacy impact assessment completed.'),
('Incident Response Procedures', 'SOC 2', 'Security', 'Organization must maintain and test incident response procedures for security events', 'Verify incident response plan exists, is current, and has been tested within the past 12 months', 'Partially Compliant', 'SEC-IR-001 through IR-008', 'Emily Chen', '2026-04-30', 'High', 'SOC 2 Type II; TSC CC7.3-CC7.5', 'Plan exists but tabletop exercise not conducted in FY2025.'),
('Anti-Money Laundering Screening', 'BSA/AML', 'Customer Due Diligence', 'All new customer relationships must be screened against OFAC and other sanctions lists', 'Test AML/KYC procedures including customer identification, screening, and suspicious activity monitoring', 'Compliant', 'AML-CDD-001 through CDD-015', 'John Anderson', '2026-06-30', 'Critical', 'Bank Secrecy Act; FinCEN Requirements', 'Automated screening system in place. No false negative findings.'),
('Business Continuity Planning', 'SOC 2', 'Availability', 'Organization must maintain and test business continuity and disaster recovery plans', 'Evaluate BCP/DR plans for completeness and verify annual testing was performed', 'Partially Compliant', 'AV-BCP-001 through BCP-005', 'Sarah Mitchell', '2026-04-30', 'Medium', 'SOC 2 Type II; TSC A1.2', 'DR test completed. BCP tabletop exercise scheduled for Q2 2026.'),
('Vendor Risk Management', 'SOC 2', 'Security', 'Third-party service providers must be assessed for security and compliance risks', 'Review vendor risk assessment program including initial due diligence and ongoing monitoring', 'Non-Compliant', 'SEC-VRM-001 through VRM-010', 'Sarah Mitchell', '2026-05-31', 'High', 'SOC 2 Type II; TSC CC9.2', 'Only 60% of critical vendors have current risk assessments on file.'),
('Employee Security Training', 'SOC 2', 'Security', 'All employees must complete annual security awareness training', 'Verify security training completion rates and content adequacy', 'Compliant', 'SEC-TRN-001 through TRN-003', 'Emily Chen', '2026-03-31', 'Medium', 'SOC 2 Type II; TSC CC1.4', 'Training completion rate: 98%. Two new hires pending completion.'),
('HIPAA Risk Assessment', 'HIPAA', 'Administrative Safeguards', 'Annual risk assessment of ePHI must be conducted per HIPAA Security Rule', 'Evaluate the comprehensiveness of the HIPAA risk assessment including threat identification and vulnerability analysis', 'Partially Compliant', 'HIPAA-RA-001 through RA-005', 'John Anderson', '2026-06-30', 'Critical', 'HIPAA Security Rule 45 CFR 164.308(a)(1)', 'Risk assessment completed but remediation plan for 3 items overdue.'),
('PCI-DSS Network Segmentation', 'PCI-DSS', 'Network Security', 'Cardholder data environment must be properly segmented from other network segments', 'Test network segmentation controls and verify scope reduction for PCI compliance', 'Compliant', 'PCI-NS-001 through NS-008', 'Emily Chen', '2026-07-31', 'Critical', 'PCI-DSS v4.0 Requirement 1', 'Penetration test confirmed proper segmentation.'),
('GDPR Data Subject Rights', 'GDPR', 'Data Subject Rights', 'Organization must be able to fulfill data subject rights requests within required timeframes', 'Test the organizations ability to process access, deletion, and portability requests', 'Partially Compliant', 'GDPR-DSR-001 through DSR-006', 'Sarah Mitchell', '2026-05-31', 'High', 'GDPR Articles 15-22', 'Access request process functional. Deletion process needs automation improvement.'),
('Internal Audit Charter Compliance', 'IIA Standards', 'Governance', 'Internal audit function must operate under an approved charter with appropriate authority', 'Review internal audit charter for compliance with IIA standards and board approval', 'Compliant', 'GOV-IAC-001 through IAC-003', 'Sarah Mitchell', '2026-03-31', 'Medium', 'IIA Standard 1000', 'Charter last approved by Audit Committee 11/2025.'),
('Whistleblower Program Effectiveness', 'SOX', 'Ethics & Compliance', 'Organization must maintain confidential channels for reporting financial and ethical concerns', 'Evaluate whistleblower program including anonymous reporting channels, investigation procedures, and non-retaliation policies', 'Compliant', 'ETH-WB-001 through WB-005', 'John Anderson', '2026-04-30', 'High', 'SOX Section 301/806', 'Hotline operational 24/7. 12 reports received in FY2025, all investigated and resolved.');

-- Seed Audit Trail (recent activity)
INSERT INTO audit_trail (action, module, record_id, record_title, details, performed_by, created_at) VALUES
('CREATE', 'Evidence', 1, 'Bank Reconciliation - Q4 2025', 'Created new evidence item', 'Sarah Mitchell', NOW() - INTERVAL '7 days'),
('UPDATE', 'Evidence', 2, 'Accounts Receivable Confirmations', 'Updated status to In Progress', 'John Anderson', NOW() - INTERVAL '6 days'),
('CREATE', 'Workpapers', 1, 'Cash & Bank Balances Lead Sheet', 'Created new workpaper', 'Emily Chen', NOW() - INTERVAL '6 days'),
('UPDATE', 'Findings', 1, 'Inadequate Segregation of Duties in AP', 'Updated severity to High', 'John Anderson', NOW() - INTERVAL '5 days'),
('CREATE', 'Sampling', 1, 'AP Disbursement Testing', 'Created new sampling plan', 'Sarah Mitchell', NOW() - INTERVAL '5 days'),
('UPDATE', 'Checklists', 4, 'Revenue Recognition Controls', 'Updated status to Non-Compliant', 'John Anderson', NOW() - INTERVAL '4 days'),
('CREATE', 'Evidence', 6, 'Fixed Asset Inspection Report', 'Created new evidence item', 'Emily Chen', NOW() - INTERVAL '4 days'),
('UPDATE', 'Workpapers', 4, 'Revenue Recognition Analysis', 'Updated status to Reviewed', 'Sarah Mitchell', NOW() - INTERVAL '3 days'),
('DELETE', 'Sampling', NULL, 'Obsolete Test Plan', 'Deleted sampling plan', 'John Anderson', NOW() - INTERVAL '3 days'),
('CREATE', 'Findings', 2, 'Revenue Cut-off Errors', 'Created new finding', 'Sarah Mitchell', NOW() - INTERVAL '2 days'),
('UPDATE', 'Evidence', 3, 'Inventory Physical Count Sheets', 'Updated status to Verified', 'Emily Chen', NOW() - INTERVAL '2 days'),
('CREATE', 'Checklists', 7, 'Anti-Money Laundering Screening', 'Created new checklist item', 'John Anderson', NOW() - INTERVAL '1 day'),
('UPDATE', 'Workpapers', 2, 'Accounts Receivable Testing', 'Updated procedures performed', 'John Anderson', NOW() - INTERVAL '1 day'),
('UPDATE', 'Findings', 4, 'IT Access Control Deficiencies', 'Updated management response', 'Emily Chen', NOW() - INTERVAL '12 hours'),
('CREATE', 'Evidence', 12, 'Subsequent Events Review', 'Created new evidence item', 'Emily Chen', NOW() - INTERVAL '6 hours'),
('UPDATE', 'Sampling', 2, 'Revenue Transaction Testing', 'Updated status to In Progress', 'Sarah Mitchell', NOW() - INTERVAL '4 hours'),
('UPDATE', 'Checklists', 3, 'Financial Close Process', 'Updated compliance status to Partially Compliant', 'Sarah Mitchell', NOW() - INTERVAL '2 hours'),
('CREATE', 'Findings', 9, 'Missing Disclosure - Contingent Liabilities', 'Created new finding', 'Sarah Mitchell', NOW() - INTERVAL '1 hour');
