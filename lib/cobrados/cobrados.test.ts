import { test } from "node:test";
import assert from "node:assert/strict";
import { expandArticles, getCobrados } from "./index";
import { COBRADOS } from "./data";
import { loadCatalog } from "../catalog";

test("expande faixas numéricas e de letras", () => {
  assert.deepEqual(expandArticles("150-155"), ["150", "151", "152", "153", "154", "155"]);
  assert.deepEqual(expandArticles("852-A..852-C"), ["852-A", "852-B", "852-C"]);
  assert.deepEqual(expandArticles("217-A"), ["217-A"]);
  assert.deepEqual(expandArticles("103-A"), ["103-A"]);
});

test("une fontes do mesmo artigo", () => {
  const cp = getCobrados("DL-2848-1940");
  assert.deepEqual(cp.get("121"), ["gran-oab", "estrategia-vida"]);
  assert.ok(cp.has("156"));
  assert.equal(getCobrados("XYZ").size, 0);
});

test("toda norma da lista existe no catálogo", () => {
  const keys = new Set(loadCatalog().norms.map((n) => n.key));
  for (const k of Object.keys(COBRADOS)) assert.ok(keys.has(k), k);
});
