import { test } from "node:test";
import assert from "node:assert/strict";
import { splitPrazos } from "./prazos";

const prazos = (t: string) => splitPrazos(t).filter((s) => s.prazo).map((s) => s.text);

test("prazo com algarismo e extenso", () => {
  assert.deepEqual(prazos("A parte será intimada para, no prazo de 15 (quinze) dias úteis, manifestar-se."), [
    "no prazo de 15 (quinze) dias úteis",
  ]);
});

test("prazo por extenso", () => {
  assert.deepEqual(prazos("Prescreve em dez anos, quando a lei não lhe haja fixado prazo menor."), ["em dez anos"]);
  assert.deepEqual(prazos("dentro de vinte e quatro horas"), ["dentro de vinte e quatro horas"]);
});

test("intervalo", () => {
  assert.deepEqual(prazos("no prazo de dois a cinco anos"), ["no prazo de dois a cinco anos"]);
});

test("dia útil ordinal", () => {
  assert.deepEqual(prazos("pagamento até o quinto dia útil do mês"), ["até o quinto dia útil"]);
});

test("ignora idade", () => {
  assert.deepEqual(prazos("São absolutamente incapazes os menores de 16 (dezesseis) anos."), []);
  assert.deepEqual(prazos("pessoas com idade igual ou superior a 60 (sessenta) anos"), []);
  assert.deepEqual(prazos("o maior de dezoito anos"), []);
});

test("ignora pena", () => {
  assert.deepEqual(prazos("Pena - reclusão, de seis a vinte anos."), []);
  assert.deepEqual(prazos("Pena - detenção, de um a três anos, e multa."), []);
});

test("prazo em dobro", () => {
  assert.deepEqual(prazos("gozará de prazo em dobro para todas as suas manifestações"), ["prazo em dobro"]);
});
