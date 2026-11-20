-- Questionário semanal opcional nas trilhas de leitura.
ALTER TABLE reading_trails ADD COLUMN IF NOT EXISTS weekly_quiz boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id bigserial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_day_id int REFERENCES trail_days(id) ON DELETE SET NULL,
  score int NOT NULL,
  total int NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user ON quiz_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS quiz_attempts_day ON quiz_attempts(trail_day_id);
