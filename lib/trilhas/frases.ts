// Frases de incentivo exibidas nas trilhas (escolhidas de forma estável por dia/contexto).
export const FRASES_INICIO = [
  "Lei seca se vence artigo por artigo. Bora para o de hoje?",
  "Constância vale mais que maratona. Seus minutos de hoje contam.",
  "Quem lê a lei todo dia não se assusta com a prova.",
  "Um dia de cada vez: hoje é só este trecho.",
  "A banca cobra a letra da lei. Você está lendo a letra da lei.",
  "Pequenas leituras diárias, grandes resultados no gabarito.",
  "Disciplina é escolher o que você quer mais em vez do que você quer agora.",
  "O artigo que você ler hoje pode ser a questão que você vai acertar.",
  "Cada dia concluído é um passo a menos até a aprovação.",
  "Foco no trecho de hoje. O resto da trilha espera por você.",
];

export const FRASES_CONCLUSAO = [
  "Mandou bem! Mais um dia de lei seca no currículo.",
  "Leitura concluída. Sua versão do dia da prova agradece.",
  "Isso é constância! Continue assim.",
  "Missão cumprida. Amanhã tem mais.",
  "Excelente! A repetição é a mãe da memorização.",
  "Show! Você está construindo um hábito de aprovado.",
  "Feito! Cada artigo lido é munição para a prova.",
  "Parabéns! Hoje você fez o que muita gente deixa para amanhã.",
];

export const FRASES_RETOMADA = [
  "Parou alguns dias? Sem culpa: o importante é voltar. Comece pelo próximo trecho.",
  "Recomeçar também é avançar. Que tal um dia de leitura agora?",
];

export function pick(list: string[], seed: number) {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

export function todaySeed() {
  return Math.floor(Date.now() / 86400_000);
}
