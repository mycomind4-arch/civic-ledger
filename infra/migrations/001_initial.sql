CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roles text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sources_org_id_idx ON sources(organization_id, id);

CREATE TABLE parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  apn_normalized text NOT NULL,
  address_normalized text NOT NULL,
  source_id_text text NOT NULL,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jurisdiction, apn_normalized)
);
CREATE INDEX parcels_org_id_idx ON parcels(organization_id, id);

CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id uuid NOT NULL REFERENCES parcels(id),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  status text NOT NULL CHECK (status IN ('open', 'awaiting_review', 'report_ready', 'closed')),
  created_by uuid NOT NULL REFERENCES users(id),
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cases_org_id_idx ON cases(organization_id, id);
CREATE INDEX cases_org_parcel_idx ON cases(organization_id, parcel_id);

CREATE TABLE acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL,
  correlation_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'retryable_failure', 'terminal_failure', 'awaiting_review', 'cancelled')),
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (organization_id, source_id, idempotency_key)
);
CREATE INDEX acquisitions_org_id_idx ON acquisitions(organization_id, id);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id),
  acquisition_id uuid NOT NULL REFERENCES acquisitions(id),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  storage_key text NOT NULL,
  media_type text NOT NULL,
  byte_length bigint NOT NULL CHECK (byte_length >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, storage_key)
);
CREATE INDEX documents_org_id_idx ON documents(organization_id, id);

CREATE TABLE observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  acquisition_id uuid NOT NULL REFERENCES acquisitions(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  observed_at timestamptz NOT NULL,
  content_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX observations_org_id_idx ON observations(organization_id, id);
CREATE INDEX observations_org_acquisition_idx ON observations(organization_id, acquisition_id);

CREATE TABLE evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id),
  observation_id uuid NOT NULL REFERENCES observations(id),
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  location jsonb NOT NULL,
  excerpt text NOT NULL CHECK (length(btrim(excerpt)) > 0),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evidence_items_org_id_idx ON evidence_items(organization_id, id);
CREATE INDEX evidence_items_org_case_idx ON evidence_items(organization_id, case_id);

CREATE TABLE civic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id),
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  summary text NOT NULL CHECK (length(btrim(summary)) > 0),
  derivation_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX civic_events_org_id_idx ON civic_events(organization_id, id);
CREATE INDEX civic_events_org_case_idx ON civic_events(organization_id, case_id, occurred_at);

CREATE TABLE civic_event_evidence (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  civic_event_id uuid NOT NULL REFERENCES civic_events(id) ON DELETE CASCADE,
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id),
  PRIMARY KEY (organization_id, civic_event_id, evidence_item_id)
);
CREATE INDEX civic_event_evidence_org_idx ON civic_event_evidence(organization_id, civic_event_id);

CREATE TABLE policy_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  description text NOT NULL,
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_id, rule_version)
);
CREATE INDEX policy_requirements_org_id_idx ON policy_requirements(organization_id, id);

CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id),
  policy_requirement_id uuid NOT NULL REFERENCES policy_requirements(id),
  status text NOT NULL CHECK (status IN ('satisfied', 'apparently_unsatisfied', 'indeterminate', 'not_applicable', 'review_required')),
  explanation text NOT NULL,
  input_facts jsonb NOT NULL,
  consequential boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX findings_org_id_idx ON findings(organization_id, id);
CREATE INDEX findings_org_case_idx ON findings(organization_id, case_id);

CREATE TABLE finding_evidence (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id),
  PRIMARY KEY (organization_id, finding_id, evidence_item_id)
);
CREATE INDEX finding_evidence_org_idx ON finding_evidence(organization_id, finding_id);

CREATE TABLE review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES findings(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  disposition text NOT NULL CHECK (disposition IN ('approved', 'rejected', 'corrected', 'deferred', 'superseded')),
  rationale text NOT NULL CHECK (length(btrim(rationale)) > 0),
  supersedes_decision_id uuid REFERENCES review_decisions(id),
  occurred_at timestamptz NOT NULL,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_decisions_org_id_idx ON review_decisions(organization_id, id);
CREATE INDEX review_decisions_org_finding_idx ON review_decisions(organization_id, finding_id, occurred_at);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id),
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('draft', 'released', 'superseded')),
  schema_version text NOT NULL,
  body jsonb NOT NULL,
  evidence_manifest_sha256 char(64) NOT NULL CHECK (evidence_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  report_sha256 char(64) NOT NULL CHECK (report_sha256 ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL,
  approved_by uuid REFERENCES users(id),
  released_at timestamptz,
  supersedes_report_id uuid REFERENCES reports(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_id, version),
  UNIQUE (organization_id, idempotency_key)
);
CREATE INDEX reports_org_id_idx ON reports(organization_id, id);
CREATE INDEX reports_org_case_idx ON reports(organization_id, case_id, version);

CREATE TABLE report_evidence (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id),
  PRIMARY KEY (organization_id, report_id, evidence_item_id)
);
CREATE INDEX report_evidence_org_idx ON report_evidence(organization_id, report_id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  correlation_id uuid NOT NULL,
  payload jsonb NOT NULL,
  previous_hash char(64) NOT NULL CHECK (previous_hash ~ '^[0-9a-f]{64}$'),
  event_hash char(64) NOT NULL CHECK (event_hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX audit_events_org_id_idx ON audit_events(organization_id, id);
CREATE INDEX audit_events_org_target_idx ON audit_events(organization_id, target_type, target_id, occurred_at);

CREATE TABLE idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  result_type text NOT NULL,
  result_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, scope, idempotency_key)
);
CREATE INDEX idempotency_records_org_id_idx ON idempotency_records(organization_id, id);

CREATE FUNCTION civic_ledger_prevent_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER observations_immutable
BEFORE UPDATE OR DELETE ON observations
FOR EACH ROW EXECUTE FUNCTION civic_ledger_prevent_mutation();

CREATE TRIGGER review_decisions_immutable
BEFORE UPDATE OR DELETE ON review_decisions
FOR EACH ROW EXECUTE FUNCTION civic_ledger_prevent_mutation();

CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION civic_ledger_prevent_mutation();

CREATE FUNCTION civic_ledger_protect_released_report() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'released' THEN
    RAISE EXCEPTION 'released reports are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_released_immutable
BEFORE UPDATE OR DELETE ON reports
FOR EACH ROW EXECUTE FUNCTION civic_ledger_protect_released_report();
