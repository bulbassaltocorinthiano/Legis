-- Corrige valores JSON gravados como texto (o driver postgres.js codificava duas vezes os parâmetros ::jsonb).
UPDATE norm_nodes SET notes = (notes #>> '{}')::jsonb WHERE jsonb_typeof(notes) = 'string';
UPDATE glossary_terms SET aliases = (aliases #>> '{}')::jsonb WHERE jsonb_typeof(aliases) = 'string';
