CREATE TABLE IF NOT EXISTS transfer_recipient_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  key_id varchar(80) NOT NULL,
  algorithm varchar(40) NOT NULL DEFAULT 'X25519-HKDF-SHA256-AES256GCM',
  public_key_spki varchar(512) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  valid_from timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfer_recipient_key_status_check CHECK (status IN ('active','retired','revoked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS transfer_recipient_key_unique ON transfer_recipient_keys(organization_id, vendor_id, key_id);
CREATE INDEX IF NOT EXISTS transfer_recipient_keys_vendor_idx ON transfer_recipient_keys(organization_id, vendor_id, status);

CREATE TABLE IF NOT EXISTS transfer_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  transfer_id uuid NOT NULL REFERENCES cross_border_transfers(id) ON DELETE CASCADE,
  processing_activity_id uuid NOT NULL REFERENCES processing_activities(id) ON DELETE RESTRICT,
  recipient_vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  recipient_key_id uuid NOT NULL REFERENCES transfer_recipient_keys(id) ON DELETE RESTRICT,
  consent_record_id uuid NOT NULL REFERENCES consent_records(id) ON DELETE RESTRICT,
  consent_decision_id uuid NOT NULL,
  session_id uuid REFERENCES consent_sessions(id) ON DELETE SET NULL,
  purpose_id uuid NOT NULL REFERENCES purposes(id) ON DELETE RESTRICT,
  state varchar(20) NOT NULL DEFAULT 'active',
  single_use boolean NOT NULL DEFAULT true,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  consumed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfer_authorization_state_check CHECK (state IN ('active','revoked','consumed','expired')),
  CONSTRAINT transfer_authorization_time_check CHECK (expires_at > issued_at)
);
CREATE INDEX IF NOT EXISTS transfer_auth_org_site_idx ON transfer_authorizations(organization_id, website_id, state);
CREATE INDEX IF NOT EXISTS transfer_auth_transfer_idx ON transfer_authorizations(transfer_id, state);
CREATE INDEX IF NOT EXISTS transfer_auth_consent_idx ON transfer_authorizations(consent_record_id);

CREATE TABLE IF NOT EXISTS secure_transfer_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  transfer_id uuid NOT NULL REFERENCES cross_border_transfers(id) ON DELETE CASCADE,
  authorization_id uuid NOT NULL REFERENCES transfer_authorizations(id) ON DELETE RESTRICT,
  recipient_vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  recipient_key_id uuid NOT NULL REFERENCES transfer_recipient_keys(id) ON DELETE RESTRICT,
  idempotency_key varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ready',
  envelope jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT secure_transfer_status_check CHECK (status IN ('ready','delivered','expired','revoked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS secure_transfer_idempotency_unique ON secure_transfer_envelopes(organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS secure_transfer_org_created_idx ON secure_transfer_envelopes(organization_id, created_at);
CREATE INDEX IF NOT EXISTS secure_transfer_authorization_idx ON secure_transfer_envelopes(authorization_id);
