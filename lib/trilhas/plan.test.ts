import { test } from "node:test";
import assert from "node:assert/strict";
import { planTrail, rangeLabel, streaks, type PlanArticle } from "./plan";

const art = (i: number, words: number, blockStart = false): PlanArticle => ({ key: String(i), label: `Art. ${i}`, ord: i * 10, endOrd: i * 10 + 5, words, blockStart });

test("divide artigos inteiros respeitando o orçamento diário", () => {
  const arts = Array.from({ length: 20 }, (_, i) => art(i + 1, 100));
  const days = planTrail([{ normId: 1, articles: arts }], 5, 100); // 500 palavras/dia
  assert.equal(days.length, 4);
  assert.deepEqual(days.map((d) => d.articles), [5, 5, 5, 5]);
  assert.equal(days[0].segments[0].from_key, "1");
  assert.equal(days[3].segments[0].to_key, "20");
});

test("prefere encerrar o dia no início de um capítulo", () => {
  const arts = [art(1, 220), art(2, 220), art(3, 50, true), art(4, 50)];
  const days = planTrail([{ normId: 1, articles: arts }], 5, 100);
  assert.equal(days[0].segments[0].to_key, "2");
  assert.equal(days[1].segments[0].from_key, "3");
});

test("artigo gigante ocupa um dia sozinho e não é partido", () => {
  const days = planTrail([{ normId: 1, articles: [art(1, 100), art(2, 5000), art(3, 100)] }], 5, 100);
  assert.deepEqual(days.map((d) => d.segments[0].from_key), ["1", "2", "3"]);
});

test("nova norma começa em dia novo quando o dia já está cheio", () => {
  const days = planTrail(
    [
      { normId: 1, articles: [art(1, 400)] },
      { normId: 2, articles: [art(1, 100)] },
    ],
    5,
    100,
  );
  assert.equal(days.length, 2);
  assert.equal(days[1].segments[0].norm_id, 2);
});

test("artigos revogados (0 palavras) não geram dia vazio", () => {
  const days = planTrail([{ normId: 1, articles: [art(1, 500), art(2, 0), art(3, 0)] }], 5, 100);
  assert.equal(days.length, 1);
  assert.equal(days[0].segments[0].to_key, "3");
  assert.equal(days[0].articles, 1);
});

test("insere dias de revisão", () => {
  const arts = Array.from({ length: 12 }, (_, i) => art(i + 1, 500));
  const days = planTrail([{ normId: 1, articles: arts }], 5, 100, 4);
  assert.equal(days.length, 15);
  assert.equal(days[4].kind, "revisao");
  assert.deepEqual(days[4].review_of, [1, 2, 3, 4]);
  assert.deepEqual(days[9].review_of, [6, 7, 8, 9]);
});

test("rótulo do trecho", () => {
  assert.equal(rangeLabel({ from_label: "Art. 1º", to_label: "Art. 45" }), "Arts. 1º a 45");
  assert.equal(rangeLabel({ from_label: "Art. 5º", to_label: "Art. 5º" }), "Art. 5º");
  assert.equal(rangeLabel({ from_label: "ADCT art. 1º", to_label: "ADCT art. 40" }), "ADCT, arts. 1º a 40");
  assert.equal(rangeLabel({ from_label: "Art. 205", to_label: "ADCT art. 40" }), "Art. 205 até ADCT art. 40");
});

test("sequência de dias", () => {
  const now = new Date("2026-11-20T15:00:00Z");
  assert.deepEqual(streaks(["2026-11-18", "2026-11-19", "2026-11-20"], now), { current: 3, best: 3, today: true });
  assert.deepEqual(streaks(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-19"], now), { current: 1, best: 3, today: false });
  assert.equal(streaks(["2026-11-10"], now).current, 0);
});
