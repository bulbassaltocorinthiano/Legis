import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCitations, parseStjReference } from "./citations";

test("cita CPC por sigla", () => {
  const c = extractCitations("Não aplicação do disposto na parte final do § 1º do art. 1.036 do Código de Processo Civil.");
  assert.deepEqual(c.map((x) => `${x.normKey}:${x.articleKey}`), ["LEI-13105-2015:1036"]);
});

test("cita lei numerada e vários artigos", () => {
  const c = extractCitations("nos termos dos arts. 20 e 21 da Lei n. 8.429/1992");
  assert.deepEqual(c.map((x) => `${x.normKey}:${x.articleKey}`), ["LEI-8429-1992:20", "LEI-8429-1992:21"]);
});

test("cita com parágrafo", () => {
  const c = extractCitations("aplica-se o art. 85, § 2º, do CPC");
  assert.equal(c[0].normKey, "LEI-13105-2015");
  assert.equal(c[0].articleKey, "85");
});

test("referência estruturada do STJ", () => {
  const c = parseStjReference("LEG:FED LEI:013105 ANO:2015\n *****  CPC-15\n ART:00550 PAR:00001 PAR:00005 ART:01022");
  assert.deepEqual(c, [
    { normKey: "LEI-13105-2015", articleKey: "550", detail: "§ 1º, § 5º" },
    { normKey: "LEI-13105-2015", articleKey: "1022", detail: null },
  ]);
  const cf = parseStjReference("LEG:FED CFB:****** ANO:1988\n ***** CF-1988\n ART:00105 INC:00003 LET:A");
  assert.deepEqual(cf, [{ normKey: "CF-1988", articleKey: "105", detail: "inc. III, al. a" }]);
});
