CREATE TABLE IF NOT EXISTS "inbound_webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(50) NOT NULL,
  "event_id" varchar(255) NOT NULL,
  "event_type" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inbound_webhooks_provider_event_unique"
  ON "inbound_webhooks" ("provider", "event_id");

CREATE INDEX IF NOT EXISTS "inbound_webhooks_created_idx"
  ON "inbound_webhooks" ("created_at");
