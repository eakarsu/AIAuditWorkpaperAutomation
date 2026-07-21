CREATE TABLE IF NOT EXISTS governed_workpapers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  engagement_id TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','evidence_ready','review_pending','approved','rejected')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS governed_workpaper_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workpaper_id BIGINT NOT NULL REFERENCES governed_workpapers(id),
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION reject_governed_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'governed workpaper history is append-only'; END $$;
DROP TRIGGER IF EXISTS governed_workpaper_events_immutable ON governed_workpaper_events;
CREATE TRIGGER governed_workpaper_events_immutable BEFORE UPDATE OR DELETE ON governed_workpaper_events
FOR EACH ROW EXECUTE FUNCTION reject_governed_event_mutation();
CREATE INDEX IF NOT EXISTS governed_workpapers_tenant_status_idx ON governed_workpapers(tenant_id,status,updated_at DESC);

