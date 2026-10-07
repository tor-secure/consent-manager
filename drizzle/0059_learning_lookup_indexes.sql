CREATE INDEX IF NOT EXISTS "learning_events_learner_action_idx" ON "learning_events" ("organization_id", "user_id", "course_id", "action");
