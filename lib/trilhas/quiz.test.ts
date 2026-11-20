import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuiz, gradeQuiz, prazoCore, prazoKey, type QuizNode } from "./quiz";

const node = (kind: string, label: string | null, text: string, key: string | null, anchor: string): QuizNode => ({ kind, label, text, article_key: key, anchor, revoked: false });

const nodes: QuizNode[] = [
  node("rubrica", null, "Homicídio simples", null, "r1"),
  node("artigo", "Art. 121", "Matar alguém:", "121", "art121"),
  node("pena", "Pena", "reclusão, de seis a vinte anos.", "121", "art121-pena"),
  node("rubrica", null, "Lesão corporal", null, "r2"),
  node("artigo", "Art. 129", "Ofender a integridade corporal ou a saúde de outrem:", "129", "art129"),
  node("pena", "Pena", "detenção, de três meses a um ano.", "129", "art129-pena"),
  node("artigo", "Art. 130", "Expor alguém, por meio de relações sexuais ou qualquer ato libidinoso, a contágio de moléstia venérea:", "130", "art130"),
  node("pena", "Pena", "detenção, de três meses a um ano, ou multa.", "130", "art130-pena"),
  node("artigo", "Art. 131", "Praticar, com o fim de transmitir a outrem moléstia grave de que está contaminado, ato capaz de produzir o contágio:", "131", "art131"),
  node("pena", "Pena", "reclusão, de um a quatro anos, e multa.", "131", "art131-pena"),
  node("artigo", "Art. 132", "O fornecedor deverá responder ao consumidor no prazo de 10 (dez) dias contados da reclamação feita por escrito.", "132", "art132"),
];

test("núcleo e equivalência de prazos", () => {
  assert.equal(prazoCore("no prazo de 15 (quinze) dias"), "15 (quinze) dias");
  assert.equal(prazoCore("dentro do prazo de cento e oitenta dias"), "cento e oitenta dias");
  assert.equal(prazoKey("2 (dois) anos"), prazoKey("dois anos"));
  assert.notEqual(prazoKey("cinco dias úteis"), prazoKey("cinco dias"));
});

test("gera questões determinísticas, com resposta tirada do texto e sem alternativas repetidas", () => {
  const src = [{ slug: "cp", normTitle: "Código Penal", nodes }];
  const a = buildQuiz(src, 7, 30);
  const b = buildQuiz(src, 7, 30);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 4);
  for (const q of a) {
    assert.equal(new Set(q.options).size, q.options.length);
    assert.ok(q.answer >= 0 && q.answer < q.options.length);
  }
  const prazo = a.find((q) => q.type === "prazo" && q.ref.anchor === "art132")!;
  assert.equal(prazo.options[prazo.answer], "10 (dez) dias");
  assert.match(prazo.quote!, /no prazo de _____ contados/);
  const pena = a.find((q) => q.type === "pena" && q.ref.anchor === "art121")!;
  assert.equal(pena.options[pena.answer], "reclusão, de seis a vinte anos.");
});

test("correção", () => {
  const qs = buildQuiz([{ slug: "cp", normTitle: "Código Penal", nodes }], 3, 10);
  const g = gradeQuiz(qs, qs.map((q) => q.answer));
  assert.equal(g.score, qs.length);
  assert.equal(gradeQuiz(qs, []).score, 0);
});
