ALTER TABLE "api_keys"
ADD COLUMN IF NOT EXISTS "scopes" text[] DEFAULT ARRAY['consent:evaluate']::text[] NOT NULL;
