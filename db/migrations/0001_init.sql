-- Esquema inicial do Legislação 2.0

CREATE TABLE IF NOT EXISTS categories (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  sphere text NOT NULL
);

CREATE TABLE IF NOT EXISTS norms (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL,
  number text,
  year integer,
  title text NOT NULL,
  nickname text,
  description text NOT NULL DEFAULT '',
  note text,
  ementa text,
  sphere text NOT NULL,
  source text,                 -- 'planalto' | 'normas.leg.br' | ...
  source_url text,
  source_etag text,
  source_last_modified text,
  content_hash text,
  status text NOT NULL DEFAULT 'pending', -- pending | ok | not_found | error | unsupported
  status_detail text,
  article_count integer NOT NULL DEFAULT 0,
  checked_at timestamptz,      -- última conferência com a fonte
  changed_at timestamptz,      -- última vez em que o texto mudou
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS norm_categories (
  norm_id integer NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (norm_id, category_id)
);

CREATE TABLE IF NOT EXISTS norm_nodes (
  id serial PRIMARY KEY,
  norm_id integer NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  ord integer NOT NULL,
  kind text NOT NULL,
  label text,
  text text NOT NULL DEFAULT '',
  heading text,
  notes jsonb NOT NULL DEFAULT '[]',
  article_key text,
  anchor text NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  level integer NOT NULL DEFAULT 0,
  tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(label, '') || ' ' || coalesce(heading, '') || ' ' || coalesce(text, ''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS norm_nodes_norm_ord ON norm_nodes (norm_id, ord);
CREATE INDEX IF NOT EXISTS norm_nodes_article ON norm_nodes (norm_id, article_key);
CREATE INDEX IF NOT EXISTS norm_nodes_tsv ON norm_nodes USING gin (tsv);

-- Histórico de alterações detectadas pelo robô de atualização
CREATE TABLE IF NOT EXISTS norm_changes (
  id serial PRIMARY KEY,
  norm_id integer NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  old_hash text,
  new_hash text,
  summary text
);

CREATE TABLE IF NOT EXISTS jurisprudence (
  id serial PRIMARY KEY,
  court text NOT NULL,          -- STJ | STF
  kind text NOT NULL,           -- tema_repetitivo | acordao | sumula | sumula_vinculante | repercussao_geral
  external_id text NOT NULL,
  title text NOT NULL,          -- "Tema Repetitivo 1.270", "REsp 1.990.285/SP"
  summary text,                 -- tese firmada ou ementa
  body text,                    -- questão submetida / decisão
  status text,                  -- situação (ex.: "Trânsito em Julgado")
  judged_at date,
  published_at date,
  rapporteur text,
  organ text,
  url text,
  source text NOT NULL,
  UNIQUE (court, kind, external_id)
);

CREATE TABLE IF NOT EXISTS jurisprudence_links (
  jurisprudence_id integer NOT NULL REFERENCES jurisprudence(id) ON DELETE CASCADE,
  norm_id integer NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
  article_key text NOT NULL,
  detail text,                  -- "inc. I", "§ 2º"
  method text NOT NULL,         -- 'referencia_oficial' (campo estruturado do tribunal) | 'texto' (extraído da tese)
  PRIMARY KEY (jurisprudence_id, norm_id, article_key)
);
CREATE INDEX IF NOT EXISTS jlinks_norm_article ON jurisprudence_links (norm_id, article_key);

CREATE TABLE IF NOT EXISTS glossary_terms (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  term text NOT NULL,
  aliases jsonb NOT NULL DEFAULT '[]',
  area text NOT NULL,
  short_definition text NOT NULL,
  definition text NOT NULL,
  legal_basis text,
  example text,
  related jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user', -- admin | user
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,          -- hash SHA-256 do token do cookie
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id serial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  kind text NOT NULL,
  checked integer NOT NULL DEFAULT 0,
  changed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  log text
);

CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
