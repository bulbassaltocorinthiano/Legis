-- Estatísticas de leitura de qualquer norma (independe das trilhas).
-- Artigos efetivamente vistos na tela (por pelo menos alguns segundos) e tempo ativo de leitura.
CREATE TABLE IF NOT EXISTS article_reads (
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  norm_id int NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  article_key text NOT NULL,
  anchor text NOT NULL,
  views int NOT NULL DEFAULT 1,
  first_at timestamptz NOT NULL DEFAULT now(),
  last_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, norm_id, article_key)
);
CREATE INDEX IF NOT EXISTS article_reads_user_last ON article_reads(user_id, last_at DESC);

CREATE TABLE IF NOT EXISTS reading_time (
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  norm_id int NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  day date NOT NULL,
  hour smallint NOT NULL,
  seconds int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, norm_id, day, hour)
);
CREATE INDEX IF NOT EXISTS reading_time_user_day ON reading_time(user_id, day);
