-- ---------------------------------------------------------------------------
-- Migration: 0033_data_principal_requests
-- Creates the data_principal_requests table for DPDP 2023 §11-14 compliance.
-- SLA deadlines (acknowledge_by = +48h, due_at = +30d) are set at insert time
-- by the application layer so they are always timezone-aware.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "data_principal_requests" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- tenant scope
  "organization_id"   uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id"        uuid REFERENCES "websites"("id") ON DELETE SET NULL,

  -- classification
  "request_type"      varchar(50) NOT NULL,
  "status"            varchar(50) NOT NULL DEFAULT 'received',

  -- requester identity
  "requester_name"    varchar(255) NOT NULL,
  "requester_email"   varchar(320) NOT NULL,
  "requester_phone"   varchar(50),

  -- optional link to an existing consent record
  "consent_id"        varchar(255),

  -- request content
  "description"       text NOT NULL,
  "response_notes"    text,

  -- SLA timestamps
  "acknowledge_by"    timestamptz NOT NULL,
  "due_at"            timestamptz NOT NULL,
  "acknowledged_at"   timestamptz,
  "completed_at"      timestamptz,

  -- audit
  "received_at"       timestamptz NOT NULL DEFAULT now(),
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_organization_idx"    ON "data_principal_requests" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_website_idx"         ON "data_principal_requests" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_status_idx"          ON "data_principal_requests" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_due_at_idx"          ON "data_principal_requests" ("due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_received_at_idx"     ON "data_principal_requests" ("received_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_requester_email_idx" ON "data_principal_requests" ("requester_email");
