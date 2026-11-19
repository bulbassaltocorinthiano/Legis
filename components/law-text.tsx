import { Fragment } from "react";
import { splitPrazos } from "@/lib/text/prazos";
import { splitTerms, type TermMatcher } from "@/lib/text/terms";

/** Renderiza um trecho de texto legal com prazos em negrito e termos doutrinários clicáveis. */
export function LawText({ text, matcher, seen }: { text: string; matcher: TermMatcher; seen: Set<string> }) {
  const segs = splitPrazos(text);
  return (
    <>
      {segs.map((s, i) =>
        s.prazo ? (
          <strong key={i} className="prazo">
            {s.text}
          </strong>
        ) : (
          <Fragment key={i}>
            {splitTerms(s.text, matcher, seen).map((t, j) =>
              t.slug ? (
                <span key={j} className="termo" data-term={t.slug} role="button" tabIndex={0}>
                  {t.text}
                </span>
              ) : (
                <Fragment key={j}>{t.text}</Fragment>
              ),
            )}
          </Fragment>
        ),
      )}
    </>
  );
}
