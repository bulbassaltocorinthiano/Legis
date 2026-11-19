-- Marcações (marca-texto) e notas pessoais: cada registro pertence a um único usuário.
CREATE TABLE IF NOT EXISTS user_highlights (
  id bigserial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  norm_id int NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  anchor text NOT NULL,
  start_off int NOT NULL,
  end_off int NOT NULL,
  color text NOT NULL DEFAULT 'amarelo',
  quote text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_highlights_user_norm ON user_highlights(user_id, norm_id);

CREATE TABLE IF NOT EXISTS user_notes (
  id bigserial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  norm_id int NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  anchor text NOT NULL,
  quote text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notes_user_norm ON user_notes(user_id, norm_id);
