CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  policy_version_id uuid NOT NULL REFERENCES consent_policy_versions(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  variants jsonb NOT NULL,
  control_variant_id varchar(40) NOT NULL,
  allocation jsonb NOT NULL,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experiments_status_check CHECK (status IN ('DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','ARCHIVED'))
);
CREATE INDEX IF NOT EXISTS experiments_org_site_status_idx ON experiments(organization_id, website_id, status);
CREATE INDEX IF NOT EXISTS experiments_site_policy_idx ON experiments(website_id, policy_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS experiments_single_running_policy_idx ON experiments(website_id, policy_version_id) WHERE status = 'RUNNING';

CREATE TABLE IF NOT EXISTS experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  session_id uuid REFERENCES consent_sessions(id) ON DELETE SET NULL,
  visitor_hash varchar(64),
  event_id varchar(80) NOT NULL,
  event_type varchar(24) NOT NULL,
  variant_id varchar(40) NOT NULL,
  choice varchar(20),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experiment_events_type_check CHECK (event_type IN ('assignment','impression','interaction','consent_decision','withdrawal','completion')),
  CONSTRAINT experiment_events_dedupe_idx UNIQUE (experiment_id, event_id)
);
CREATE INDEX IF NOT EXISTS experiment_events_org_experiment_time_idx ON experiment_events(organization_id, experiment_id, occurred_at);
CREATE INDEX IF NOT EXISTS experiment_events_session_idx ON experiment_events(session_id);
CREATE INDEX IF NOT EXISTS experiment_events_variant_type_idx ON experiment_events(experiment_id, variant_id, event_type);
