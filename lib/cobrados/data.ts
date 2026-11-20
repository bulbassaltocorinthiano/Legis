// Artigos mais cobrados em provas (concursos e Exame de Ordem), por norma.
//
// Cada entrada indica a base que a sustenta. Há dois tipos de base:
//  - levantamentos públicos de incidência feitos por cursos preparatórios (com link);
//  - "curadoria": artigos de incidência reconhecidamente alta em provas objetivas, incluídos
//    editorialmente e sem contagem publicada. Ficam separados para poderem ser revistos.
//
// Formato do artigo: "5", "217-A", "1845", faixas "150-155" ou "852-A..852-H", e "adct-10" para o ADCT.
// Os números seguem a chave de artigo do leitor (sem pontos de milhar nem º).

export interface CobradoSource {
  title: string;
  url?: string;
  detail: string;
}

export const SOURCES = {
  "gran-oab": {
    title: "Gran Cursos — Artigos mais cobrados na OAB (2026)",
    url: "https://oab.grancursosonline.com.br/blog/artigos-mais-cobrados-oab/",
    detail: "Lista por matéria da 1ª fase do Exame de Ordem, segundo os professores do curso, com base nas provas anteriores (publicada em 29/06/2026).",
  },
  "estrategia-patrimonio": {
    title: "Estratégia Concursos — Análise estatística: crimes contra o patrimônio",
    url: "https://www.estrategiaconcursos.com.br/blog/analise-estatistica-crimes-patrimonio/",
    detail: "318 questões de 8 bancas (Cebraspe, FCC, FGV, AOCP, IBFC, Idecan, Quadrix, Vunesp), 2015–2023. Furto 32%, roubo e extorsão 31%, estelionato 15%.",
  },
  "estrategia-vida": {
    title: "Estratégia Concursos — Análise estatística: crimes contra a vida",
    url: "https://www.estrategiaconcursos.com.br/blog/analise-estatistica-crimes-vida/",
    detail: "123 questões de 8 bancas, 2015–2023. Homicídio responde por 72% das questões.",
  },
  "estrategia-adm-publica": {
    title: "Estratégia Concursos — Crimes contra a Administração Pública",
    url: "https://www.estrategiaconcursos.com.br/blog/crimes-administracao-publica/",
    detail: "272 questões de 8 bancas, 2017–2023. Peculato 28%, concussão 20%, corrupção passiva 11%, conceito de funcionário público 10%.",
  },
  curadoria: {
    title: "Curadoria Legis",
    detail: "Artigo de incidência reconhecidamente alta em provas objetivas, incluído editorialmente, sem contagem publicada que o sustente.",
  },
} satisfies Record<string, CobradoSource>;

export type SourceId = keyof typeof SOURCES;

type Entry = [articles: string, sources: SourceId[]];

export const COBRADOS: Record<string, Entry[]> = {
  // Constituição Federal
  "CF-1988": [
    ["5", ["gran-oab", "curadoria"]],
    ["7", ["gran-oab"]],
    ["37", ["gran-oab", "curadoria"]],
    ["60", ["gran-oab"]],
    ["102", ["gran-oab"]],
    ["103", ["gran-oab"]],
    ["114", ["gran-oab"]],
    ["150-155", ["gran-oab"]],
    ["225", ["gran-oab"]],
    ["1", ["curadoria"]],
    ["3", ["curadoria"]],
    ["6", ["curadoria"]],
    ["12", ["curadoria"]],
    ["14", ["curadoria"]],
    ["41", ["curadoria"]],
    ["62", ["curadoria"]],
    ["103-A", ["curadoria"]],
    ["105", ["curadoria"]],
    ["144", ["curadoria"]],
  ],
  // Código Civil
  "LEI-10406-2002": [
    ["186", ["gran-oab", "curadoria"]],
    ["927-933", ["gran-oab"]],
    ["966", ["gran-oab"]],
    ["1659", ["gran-oab"]],
    ["1660", ["gran-oab"]],
    ["1845", ["gran-oab"]],
    ["1846", ["gran-oab"]],
    ["3", ["curadoria"]],
    ["4", ["curadoria"]],
    ["166", ["curadoria"]],
    ["171", ["curadoria"]],
    ["187", ["curadoria"]],
    ["1829", ["curadoria"]],
  ],
  // Código de Processo Civil
  "LEI-13105-2015": [
    ["485", ["gran-oab", "curadoria"]],
    ["1009", ["gran-oab"]],
    ["1015", ["gran-oab", "curadoria"]],
    ["300", ["curadoria"]],
    ["319", ["curadoria"]],
    ["330", ["curadoria"]],
    ["487", ["curadoria"]],
    ["489", ["curadoria"]],
    ["1022", ["curadoria"]],
  ],
  // Código Penal
  "DL-2848-1940": [
    ["13-23", ["gran-oab"]],
    ["109", ["gran-oab"]],
    ["121", ["gran-oab", "estrategia-vida"]],
    ["122", ["gran-oab", "estrategia-vida"]],
    ["155-157", ["gran-oab", "estrategia-patrimonio"]],
    ["158", ["estrategia-patrimonio"]],
    ["159", ["estrategia-patrimonio"]],
    ["160", ["estrategia-patrimonio"]],
    ["171", ["estrategia-patrimonio"]],
    ["168", ["estrategia-patrimonio"]],
    ["213", ["gran-oab"]],
    ["217-A", ["gran-oab"]],
    ["312", ["estrategia-adm-publica"]],
    ["316", ["estrategia-adm-publica"]],
    ["317", ["estrategia-adm-publica"]],
    ["319", ["estrategia-adm-publica"]],
    ["320", ["estrategia-adm-publica"]],
    ["321", ["estrategia-adm-publica"]],
    ["327", ["estrategia-adm-publica"]],
    ["59", ["curadoria"]],
    ["107", ["curadoria"]],
  ],
  // Código de Processo Penal
  "DL-3689-1941": [
    ["5", ["gran-oab"]],
    ["28", ["gran-oab"]],
    ["70", ["gran-oab"]],
    ["581", ["gran-oab"]],
    ["41", ["curadoria"]],
    ["302", ["curadoria"]],
    ["312", ["curadoria"]],
    ["313", ["curadoria"]],
  ],
  // CLT
  "DL-5452-1943": [
    ["59", ["gran-oab"]],
    ["62", ["gran-oab"]],
    ["457", ["gran-oab"]],
    ["477", ["gran-oab"]],
    ["482", ["gran-oab"]],
    ["843", ["gran-oab"]],
    ["852-A..852-H", ["gran-oab"]],
    ["893-897", ["gran-oab"]],
  ],
  // CTN
  "LEI-5172-1966": [
    ["151", ["gran-oab"]],
    ["156", ["gran-oab"]],
    ["175", ["gran-oab"]],
    ["185", ["gran-oab"]],
    ["3", ["curadoria"]],
    ["173", ["curadoria"]],
    ["174", ["curadoria"]],
  ],
  // CDC
  "LEI-8078-1990": [
    ["6", ["gran-oab"]],
    ["12-14", ["gran-oab"]],
    ["39", ["gran-oab"]],
    ["51", ["gran-oab"]],
    ["2", ["curadoria"]],
    ["3", ["curadoria"]],
    ["18", ["curadoria"]],
    ["26", ["curadoria"]],
    ["27", ["curadoria"]],
  ],
  // ECA
  "LEI-8069-1990": [
    ["2", ["gran-oab"]],
    ["19", ["gran-oab"]],
    ["136", ["gran-oab"]],
    ["112", ["curadoria"]],
    ["121", ["curadoria"]],
  ],
  // Estatuto da Advocacia e da OAB
  "LEI-8906-1994": [
    ["7", ["gran-oab"]],
    ["34", ["gran-oab"]],
  ],
  // Política Nacional do Meio Ambiente
  "LEI-6938-1981": [["14", ["gran-oab"]]],
  // Lei de Improbidade Administrativa
  "LEI-8429-1992": [
    ["1", ["curadoria"]],
    ["9", ["curadoria"]],
    ["10", ["curadoria"]],
    ["11", ["curadoria"]],
    ["12", ["curadoria"]],
    ["17", ["curadoria"]],
    ["23", ["curadoria"]],
  ],
  // Nova Lei de Licitações
  "LEI-14133-2021": [
    ["5", ["curadoria"]],
    ["6", ["curadoria"]],
    ["28", ["curadoria"]],
    ["72", ["curadoria"]],
    ["74", ["curadoria"]],
    ["75", ["curadoria"]],
    ["124", ["curadoria"]],
    ["155", ["curadoria"]],
    ["156", ["curadoria"]],
  ],
  // Estatuto dos Servidores Públicos Federais
  "LEI-8112-1990": [
    ["5", ["curadoria"]],
    ["20", ["curadoria"]],
    ["116", ["curadoria"]],
    ["117", ["curadoria"]],
    ["127", ["curadoria"]],
    ["132", ["curadoria"]],
  ],
  // Processo administrativo federal
  "LEI-9784-1999": [
    ["2", ["curadoria"]],
    ["53", ["curadoria"]],
    ["54", ["curadoria"]],
  ],
  // Lei Maria da Penha
  "LEI-11340-2006": [
    ["5", ["curadoria"]],
    ["7", ["curadoria"]],
    ["22", ["curadoria"]],
  ],
  // Lei de Drogas
  "LEI-11343-2006": [
    ["28", ["curadoria"]],
    ["33", ["curadoria"]],
  ],
};
