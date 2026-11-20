-- Trilhas de leitura da lei seca: plano diário por usuário + registro de leituras (base do ranking).
CREATE TABLE IF NOT EXISTS reading_trails (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  minutes_per_day int NOT NULL,
  words_per_minute int NOT NULL,
  pace text NOT NULL DEFAULT 'normal',
  review_every int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa', -- ativa | concluida
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS reading_trails_user ON reading_trails(user_id, status);

CREATE TABLE IF NOT EXISTS trail_norms (
  trail_id int NOT NULL REFERENCES reading_trails(id) ON DELETE CASCADE,
  norm_id int NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  position int NOT NULL,
  PRIMARY KEY (trail_id, norm_id)
);

CREATE TABLE IF NOT EXISTS trail_days (
  id serial PRIMARY KEY,
  trail_id int NOT NULL REFERENCES reading_trails(id) ON DELETE CASCADE,
  day_no int NOT NULL,
  kind text NOT NULL DEFAULT 'leitura', -- leitura | revisao
  segments jsonb NOT NULL DEFAULT '[]', -- [{norm_id, from_key, to_key, from_ord, to_ord, from_label, to_label, articles, words}]
  review_of jsonb NOT NULL DEFAULT '[]',
  words int NOT NULL DEFAULT 0,
  articles int NOT NULL DEFAULT 0,
  est_minutes int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  UNIQUE (trail_id, day_no)
);

-- Cada leitura concluída fica registrada aqui; sobrevive à exclusão da trilha para o ranking não "perder" leituras.
CREATE TABLE IF NOT EXISTS reading_log (
  id bigserial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_day_id int REFERENCES trail_days(id) ON DELETE SET NULL,
  words int NOT NULL DEFAULT 0,
  articles int NOT NULL DEFAULT 0,
  minutes int NOT NULL DEFAULT 0,
  read_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reading_log_user ON reading_log(user_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS reading_log_day ON reading_log(trail_day_id) WHERE trail_day_id IS NOT NULL;
