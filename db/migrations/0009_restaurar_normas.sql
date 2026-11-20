-- Uma falha passageira do Planalto (madrugada de 20/11/2026) marcou como "não localizada" 26 normas que já
-- tinham texto gravado, entre elas a Constituição. Como as conferências seguintes recebiam 304 (sem mudança),
-- o status nunca voltava. O texto continua no banco: basta reabrir essas normas.
UPDATE norms SET status = 'ok', status_detail = NULL
 WHERE status IN ('not_found', 'error') AND content_hash IS NOT NULL AND article_count > 0
   AND EXISTS (SELECT 1 FROM norm_nodes nn WHERE nn.norm_id = norms.id);
