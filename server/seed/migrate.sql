-- Migration: Add AI persistence tables and evidence adequacy scores
-- Run this against the audit_workpaper database after init.sql

-- AI Analyses persistence table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(100) NOT NULL,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  model_used VARCHAR(255),
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_endpoint ON ai_analyses(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);

-- Evidence adequacy scores table (for the new Evidence Adequacy Scorer feature)
CREATE TABLE IF NOT EXISTS evidence_adequacy_scores (
  id SERIAL PRIMARY KEY,
  evidence_id INTEGER REFERENCES audit_evidence(id) ON DELETE CASCADE,
  sufficiency_score INTEGER CHECK (sufficiency_score BETWEEN 0 AND 100),
  appropriateness_score INTEGER CHECK (appropriateness_score BETWEEN 0 AND 100),
  reliability_score INTEGER CHECK (reliability_score BETWEEN 0 AND 100),
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('High', 'Medium', 'Low')),
  gaps JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  raw_analysis TEXT,
  model_used VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_adequacy_evidence_id ON evidence_adequacy_scores(evidence_id);

-- Unique constraint required by ON CONFLICT in /api/ai/score-evidence-adequacy
CREATE UNIQUE INDEX IF NOT EXISTS uniq_evidence_adequacy_evidence_id ON evidence_adequacy_scores(evidence_id);
