// Catálogo-base de normas pedido pelo usuário (20 áreas).
// Formato de cada linha:  TIPO NUM/ANO | Apelido (opcional) | Descrição [| nota]
// Uma linha "## n | Título" abre uma área. Normas repetidas em várias áreas são unificadas pela chave TIPO+NUM+ANO.
// TIPO: CF, ADCT (dentro da CF), LEI, LC, DL, DEC, EC, MP, RES-CNJ, RES-CNMP, RES-TSE, RES-TCU, RES-SF,
//       RES-CONAMA, PROV-CNJ, PORT-INTERMIN, PORT-MTP, e estaduais do MA: CE-MA, LEI-MA, LC-MA, DEC-MA,
//       e "DOC" para documentos sem número oficial (regimentos, códigos de normas).
export const CATALOG_TEXT = String.raw`
## 1 | Constitucional, organização do Estado e ações constitucionais
CF 1988 | CF/88 | Constituição Federal de 1988 e ADCT
DL 4657/1942 | LINDB | Lei de Introdução às Normas do Direito Brasileiro
DEC 9830/2019 | | Regulamenta os arts. 20 a 30 da LINDB
LC 95/1998 | | Elaboração, redação, alteração e consolidação das leis
LEI 9868/1999 | Lei da ADI/ADC | ADI, ADC e ADO
LEI 9882/1999 | Lei da ADPF | Arguição de descumprimento de preceito fundamental
LEI 12562/2011 | | Representação interventiva
LEI 11417/2006 | | Súmulas vinculantes
LEI 13300/2016 | | Mandado de injunção
LEI 12016/2009 | Lei do MS | Mandado de segurança individual e coletivo
LEI 9507/1997 | | Habeas data
LEI 4717/1965 | Lei da Ação Popular | Ação popular
LEI 9709/1998 | | Plebiscito, referendo e iniciativa popular
LEI 1079/1950 | | Crimes de responsabilidade
DL 201/1967 | | Responsabilidade de prefeitos e vereadores
LEI 1579/1952 | | Comissões parlamentares de inquérito
LEI 8038/1990 | | Processos perante o STF e o STJ
LEI 8437/1992 | | Medidas cautelares contra atos do poder público
LEI 9494/1997 | | Tutela antecipada contra a Fazenda Pública

## 2 | Administrativo, licitações, servidores e patrimônio público
DL 200/1967 | | Organização da Administração Federal
LEI 9784/1999 | Lei do Processo Administrativo | Processo administrativo federal
LEI 8112/1990 | Estatuto dos Servidores | Servidores públicos civis federais
LEI 8745/1993 | | Contratação temporária federal
LEI 8429/1992 | LIA | Improbidade administrativa
LEI 14230/2021 | | Reforma da Lei de Improbidade Administrativa
LEI 12846/2013 | Lei Anticorrupção | Lei Anticorrupção
DEC 11129/2022 | | Regulamenta a Lei Anticorrupção
LEI 12813/2013 | | Conflito de interesses no Executivo federal
LEI 12527/2011 | LAI | Acesso à informação
DEC 7724/2012 | | Regulamenta a Lei de Acesso à Informação
LEI 13460/2017 | | Direitos dos usuários de serviços públicos
LEI 14129/2021 | | Governo Digital
LEI 14133/2021 | Nova Lei de Licitações | Licitações e contratos administrativos
DEC 11246/2022 | | Agentes de contratação, gestores e fiscais de contratos
DEC 11462/2023 | | Sistema federal de registro de preços
LEI 8666/1993 | | Antiga Lei de Licitações (revogada) | Aplicável aos contratos celebrados sob sua disciplina
LEI 10520/2002 | Lei do Pregão | Pregão (revogada) | Aplicável aos contratos celebrados sob sua disciplina
LEI 12462/2011 | RDC | Regime Diferenciado de Contratações | Arts. 1º a 47-A, revogados, aplicáveis aos contratos celebrados sob sua disciplina
LEI 13303/2016 | Lei das Estatais | Estatuto das empresas estatais
LEI 8987/1995 | | Concessões e permissões de serviços públicos
LEI 9074/1995 | | Outorga e prorrogação de concessões
LEI 11079/2004 | Lei das PPPs | Parcerias público-privadas
LEI 11107/2005 | | Consórcios públicos
DEC 6017/2007 | | Regulamenta os consórcios públicos
LEI 9637/1998 | | Organizações sociais
LEI 9790/1999 | | OSCIPs
LEI 13019/2014 | MROSC | Parcerias com organizações da sociedade civil
LEI 13848/2019 | | Agências reguladoras federais
LEI 9873/1999 | | Prescrição da ação punitiva da Administração Pública Federal
LEI 13726/2018 | | Simplificação de atos e procedimentos administrativos
LEI 13874/2019 | Lei da Liberdade Econômica | Liberdade econômica
DEC 20910/1932 | | Prescrição contra a Fazenda Pública
DL 4597/1942 | | Prescrição contra a Fazenda Pública
DL 3365/1941 | | Desapropriação por utilidade pública
LEI 4132/1962 | | Desapropriação por interesse social
DL 25/1937 | | Tombamento e patrimônio histórico e artístico nacional
DL 9760/1946 | | Bens imóveis da União
LEI 9636/1998 | | Bens imóveis da União

## 3 | Financeiro, orçamento, controle externo e tribunais de contas
LEI 4320/1964 | | Normas gerais de direito financeiro e contabilidade pública
LC 101/2000 | LRF | Lei de Responsabilidade Fiscal
LC 131/2009 | | Transparência da gestão fiscal
LC 156/2016 | | Auxílio e reequilíbrio fiscal dos estados e do DF
LC 159/2017 | | Regime de Recuperação Fiscal
LC 178/2021 | | Acompanhamento, transparência e equilíbrio fiscal
LC 200/2023 | | Regime fiscal sustentável da União
LC 210/2024 | | Proposição e execução de emendas parlamentares
LC 212/2025 | | Programa de Pleno Pagamento de Dívidas dos Estados
LEI 10028/2000 | | Crimes contra as finanças públicas
LEI 10180/2001 | | Sistemas federais de planejamento, orçamento, contabilidade e controle interno
LEI 8443/1992 | LOTCU | Lei Orgânica do TCU
RES-TCU 246/2011 | RITCU | Regimento Interno do TCU
RES-SF 40/2001 | | Dívida pública consolidada de estados e municípios
RES-SF 43/2001 | | Operações de crédito de estados e municípios
DEC 93872/1986 | | Administração financeira e execução orçamentária federal
DEC 10540/2020 | | Padrão mínimo do SIAFIC
PORT-INTERMIN 163/2001 | | Classificação das receitas e despesas públicas (STN/SOF)
LEI 14113/2020 | Lei do Fundeb | Fundeb
LC 141/2012 | | Aplicação mínima e fiscalização dos gastos em saúde

## 4 | Tributário, execução fiscal e reforma tributária
LEI 5172/1966 | CTN | Código Tributário Nacional
EC 132/2023 | Reforma Tributária | Reforma tributária do consumo
LC 214/2025 | | IBS, CBS e Imposto Seletivo
LC 227/2026 | | Comitê Gestor do IBS, processo administrativo do IBS e normas gerais de ITCMD
LC 225/2026 | | Código de Defesa do Contribuinte
LEI 6830/1980 | LEF | Lei de Execução Fiscal
LEI 8397/1992 | | Medida cautelar fiscal
LEI 13988/2020 | | Transação tributária federal
DEC 70235/1972 | | Processo administrativo fiscal federal
LEI 9784/1999 | Lei do Processo Administrativo | Processo administrativo federal (aplicação subsidiária)
LC 24/1975 | | Convênios de ICMS
LC 87/1996 | Lei Kandir | ICMS
LC 160/2017 | | Benefícios fiscais de ICMS
LC 190/2022 | | Diferencial de alíquotas do ICMS
LC 116/2003 | | ISS
LC 123/2006 | Estatuto da ME e EPP | Simples Nacional
LC 63/1990 | | Repartição de receitas tributárias com os municípios
LC 105/2001 | | Sigilo das operações financeiras
LC 118/2005 | | Alterações do CTN sobre cobrança, prescrição e garantias
LEI 9393/1996 | | ITR
LEI 9250/1995 | | Imposto de renda da pessoa física
LEI 9249/1995 | | Tributação federal de pessoas jurídicas
LEI 9430/1996 | | Tributação federal de pessoas jurídicas
LEI 12973/2014 | | Tributação federal de pessoas jurídicas
LEI 7689/1988 | | CSLL
LEI 10637/2002 | | PIS/Pasep não cumulativo
LEI 10833/2003 | | Cofins não cumulativa
LEI 10865/2004 | | PIS/Pasep-Importação e Cofins-Importação
DL 37/1966 | | Legislação aduaneira
DEC 6759/2009 | Regulamento Aduaneiro | Regulamento aduaneiro
LEI 10522/2002 | | Cadin, parcelamento e cobrança de créditos federais
LEI 12514/2011 | | Contribuições aos conselhos profissionais
LEI 8137/1990 | | Crimes contra a ordem tributária, econômica e relações de consumo

## 5 | Civil, família, sucessões, imóveis e contratos
LEI 10406/2002 | Código Civil | Código Civil
DL 4657/1942 | LINDB | Lei de Introdução às Normas do Direito Brasileiro
LEI 14905/2024 | | Atualização monetária e juros legais no Código Civil
LEI 15040/2024 | Marco Legal dos Seguros | Contrato de seguro
LEI 8009/1990 | | Bem de família
LEI 8245/1991 | Lei do Inquilinato | Locações de imóveis urbanos
LEI 4591/1964 | | Condomínio em edificações e incorporações imobiliárias
LEI 6766/1979 | | Parcelamento do solo urbano
LEI 9514/1997 | | SFI e alienação fiduciária de imóveis
DL 911/1969 | | Alienação fiduciária de bens móveis
LEI 10931/2004 | | Patrimônio de afetação, crédito imobiliário e CCB
LEI 13777/2018 | | Multipropriedade imobiliária
LEI 13786/2018 | Lei do Distrato | Distrato em incorporações e loteamentos
LEI 14711/2023 | Marco Legal das Garantias | Marco Legal das Garantias
LEI 5478/1968 | Lei de Alimentos | Ação de alimentos
LEI 11804/2008 | | Alimentos gravídicos
LEI 8560/1992 | | Investigação de paternidade
LEI 12318/2010 | | Alienação parental
LEI 11698/2008 | | Guarda compartilhada
LEI 13058/2014 | | Guarda compartilhada
LEI 14713/2023 | | Guarda compartilhada e risco de violência doméstica
LEI 9263/1996 | | Planejamento familiar
LEI 9434/1997 | | Transplantes e disposição de órgãos
LEI 9610/1998 | | Direitos autorais
LEI 12965/2014 | Marco Civil da Internet | Marco Civil da Internet
LEI 13709/2018 | LGPD | Lei Geral de Proteção de Dados
LEI 14010/2020 | | Regime jurídico emergencial na pandemia (direito intertemporal)

## 6 | Processo civil, tutela coletiva e Fazenda Pública em juízo
LEI 13105/2015 | CPC | Código de Processo Civil
LEI 7347/1985 | Lei da Ação Civil Pública | Ação civil pública
LEI 8078/1990 | CDC | Código de Defesa do Consumidor
LEI 4717/1965 | Lei da Ação Popular | Ação popular
LEI 12016/2009 | Lei do MS | Mandado de segurança
LEI 9099/1995 | Lei dos Juizados | Juizados Especiais Cíveis e Criminais
LEI 10259/2001 | | Juizados Especiais Federais
LEI 12153/2009 | | Juizados Especiais da Fazenda Pública
LEI 9307/1996 | Lei de Arbitragem | Arbitragem
LEI 13140/2015 | Lei de Mediação | Mediação e autocomposição na Administração Pública
LEI 11419/2006 | | Processo judicial eletrônico
LEI 14195/2021 | | Ambiente de negócios, citação eletrônica e prescrição intercorrente
LEI 8437/1992 | | Medidas cautelares contra atos do poder público
LEI 9494/1997 | | Tutela antecipada contra a Fazenda Pública
LEI 9469/1997 | | Intervenção, acordos e transações da União
LEI 13463/2017 | | Precatórios e RPVs federais | Observadas as decisões do STF
LEI 8906/1994 | Estatuto da OAB | Estatuto da Advocacia e da OAB
LC 80/1994 | | Organização da Defensoria Pública
RES-CNJ 125/2010 | | Tratamento adequado dos conflitos
RES-CNJ 303/2019 | | Gestão de precatórios

## 7 | Empresarial, sociedades, crédito e insolvência
LEI 10406/2002 | Código Civil | Código Civil (Direito de Empresa e títulos de crédito)
LEI 556/1850 | Código Comercial | Código Comercial (parte marítima remanescente)
LEI 6404/1976 | Lei das S.A. | Sociedades por ações
LEI 6385/1976 | | Mercado de valores mobiliários e CVM
LEI 5764/1971 | | Cooperativas
LEI 8934/1994 | | Registro Público de Empresas Mercantis
LEI 11101/2005 | Lei de Falências | Recuperação judicial, extrajudicial e falência
LEI 14112/2020 | | Reforma da Lei de Falências
LEI 6024/1974 | | Intervenção e liquidação extrajudicial de instituições financeiras
LEI 4595/1964 | | Sistema Financeiro Nacional
LEI 7357/1985 | Lei do Cheque | Cheque
LEI 5474/1968 | Lei das Duplicatas | Duplicatas
LEI 13775/2018 | | Duplicata escritural
DEC 57663/1966 | Lei Uniforme de Genebra | Letras de câmbio e notas promissórias
LEI 9492/1997 | Lei de Protesto | Protesto de títulos e documentos de dívida
LEI 9279/1996 | LPI | Propriedade industrial
LEI 9609/1998 | Lei do Software | Programas de computador
LEI 12529/2011 | Lei de Defesa da Concorrência | Defesa da concorrência
LEI 13966/2019 | Lei de Franquia | Franquia empresarial
LEI 14195/2021 | | Ambiente de negócios
LC 182/2021 | Marco Legal das Startups | Marco Legal das Startups
LEI 14430/2022 | | Securitização de direitos creditórios

## 8 | Penal, processo penal e execução penal
DL 2848/1940 | Código Penal | Código Penal
DL 3689/1941 | CPP | Código de Processo Penal
DL 3688/1941 | LCP | Lei das Contravenções Penais
LEI 7210/1984 | LEP | Lei de Execução Penal
LEI 13964/2019 | Pacote Anticrime | Pacote Anticrime
LEI 9099/1995 | Lei dos Juizados | Juizados Especiais Criminais
LEI 7960/1989 | | Prisão temporária
LEI 8072/1990 | Lei dos Crimes Hediondos | Crimes hediondos
LEI 7716/1989 | | Crimes de racismo
LEI 14532/2023 | | Injúria racial
LEI 2889/1956 | | Genocídio
LEI 9455/1997 | | Tortura
LEI 9296/1996 | | Interceptação telefônica e captação ambiental
LEI 9613/1998 | | Lavagem de dinheiro
LEI 9807/1999 | | Proteção a vítimas e testemunhas
LEI 10826/2003 | Estatuto do Desarmamento | Estatuto do Desarmamento
LEI 11343/2006 | Lei de Drogas | Lei de Drogas
LEI 11340/2006 | Lei Maria da Penha | Lei Maria da Penha
LEI 14994/2024 | | Feminicídio como crime autônomo
LEI 12850/2013 | | Organizações criminosas e colaboração premiada
LEI 15358/2026 | | Marco Legal do Combate ao Crime Organizado
LEI 13260/2016 | | Terrorismo
LEI 13344/2016 | | Tráfico de pessoas
LEI 13869/2019 | | Abuso de autoridade
LEI 12037/2009 | | Identificação criminal
LEI 12654/2012 | | Identificação por perfil genético
LEI 12830/2013 | | Investigação criminal conduzida por delegado
LEI 12694/2012 | | Julgamento colegiado em primeiro grau
LEI 7492/1986 | Lei do Colarinho Branco | Crimes contra o Sistema Financeiro Nacional
LEI 8137/1990 | | Crimes contra a ordem tributária, econômica e relações de consumo
LEI 1521/1951 | | Crimes contra a economia popular
LEI 9605/1998 | Lei de Crimes Ambientais | Crimes ambientais
LEI 9503/1997 | CTB | Código de Trânsito Brasileiro
LEI 13431/2017 | | Escuta especializada e depoimento especial
LEI 14344/2022 | Lei Henry Borel | Violência doméstica contra crianças e adolescentes
LEI 14811/2024 | | Violência em estabelecimentos educacionais, bullying e cyberbullying
LEI 14197/2021 | | Crimes contra o Estado Democrático de Direito
LEI 7170/1983 | Lei de Segurança Nacional | Revogada (sucessão de leis penais)
LEI 13608/2018 | | Informantes e comunicação de crimes
LEI 11671/2008 | | Presídios federais de segurança máxima
LEI 12433/2011 | | Remição da pena por trabalho ou estudo
LEI 14843/2024 | | Saídas temporárias, monitoração e exame criminológico
LEI 14133/2021 | Nova Lei de Licitações | Crimes em licitações (incorporados ao CP)
DL 1001/1969 | CPM | Código Penal Militar
DL 1002/1969 | CPPM | Código de Processo Penal Militar

## 9 | Consumidor, infância, saúde, educação e direitos humanos
LEI 8078/1990 | CDC | Código de Defesa do Consumidor
DEC 2181/1997 | | Sistema Nacional de Defesa do Consumidor
LEI 14181/2021 | | Superendividamento
LEI 12414/2011 | | Cadastro positivo
LEI 9656/1998 | | Planos de saúde
LEI 8069/1990 | ECA | Estatuto da Criança e do Adolescente
LEI 12594/2012 | Sinase | Sistema Nacional de Atendimento Socioeducativo
LEI 13257/2016 | | Marco Legal da Primeira Infância
LEI 12010/2009 | | Adoção
LEI 13509/2017 | | Adoção e acolhimento
LEI 14826/2024 | | Parentalidade positiva e direito ao brincar
LEI 15211/2025 | ECA Digital | Estatuto Digital da Criança e do Adolescente
LEI 12852/2013 | | Estatuto da Juventude
LEI 10741/2003 | Estatuto da Pessoa Idosa | Estatuto da Pessoa Idosa
LEI 8842/1994 | | Política Nacional da Pessoa Idosa
LEI 13146/2015 | LBI | Lei Brasileira de Inclusão
LEI 7853/1989 | | Apoio e tutela coletiva das pessoas com deficiência
LEI 10048/2000 | | Atendimento prioritário
LEI 10098/2000 | | Acessibilidade
LEI 12764/2012 | | Pessoa com transtorno do espectro autista
LEI 10216/2001 | | Pessoas com transtornos mentais
LEI 12288/2010 | | Estatuto da Igualdade Racial
LEI 12711/2012 | Lei de Cotas | Cotas nas instituições federais de ensino
LEI 14723/2023 | | Atualização da Lei de Cotas
LEI 15142/2025 | | Reserva de vagas em concursos públicos federais
LEI 8080/1990 | Lei Orgânica da Saúde | Lei Orgânica da Saúde
LEI 8142/1990 | | Participação social e transferências no SUS
DEC 7508/2011 | | Organização do SUS
LEI 8742/1993 | LOAS | Lei Orgânica da Assistência Social
LEI 9394/1996 | LDB | Lei de Diretrizes e Bases da Educação
LEI 13716/2018 | | Atendimento educacional durante internação
LEI 9474/1997 | | Refúgio
LEI 13445/2017 | Lei de Migração | Lei de Migração
LEI 6001/1973 | Estatuto do Índio | Estatuto do Índio
DEC 678/1992 | Pacto de San José | Convenção Americana sobre Direitos Humanos
DEC 4463/2002 | | Competência contenciosa da Corte IDH
DEC 591/1992 | PIDESC | Pacto Internacional de Direitos Econômicos, Sociais e Culturais
DEC 592/1992 | PIDCP | Pacto Internacional de Direitos Civis e Políticos
DEC 99710/1990 | | Convenção sobre os Direitos da Criança
DEC 6949/2009 | | Convenção sobre os Direitos das Pessoas com Deficiência
DEC 10932/2022 | | Convenção Interamericana contra o Racismo
DEC 1973/1996 | Convenção de Belém do Pará | Violência contra a mulher
DEC 4377/2002 | CEDAW | Eliminação da discriminação contra a mulher
DEC 40/1991 | | Convenção da ONU contra a Tortura
DEC 4388/2002 | Estatuto de Roma | Tribunal Penal Internacional
DEC 10088/2019 | | Convenções da OIT (Anexo LXXII: Convenção 169) | Anexo LXXII

## 10 | Ambiental, urbanístico, agrário e patrimônio cultural
LEI 6938/1981 | PNMA | Política Nacional do Meio Ambiente
LC 140/2011 | | Competências administrativas ambientais
LEI 15190/2025 | | Lei Geral do Licenciamento Ambiental
LEI 9605/1998 | Lei de Crimes Ambientais | Crimes ambientais
DEC 6514/2008 | | Infrações administrativas ambientais
LEI 12651/2012 | Código Florestal | Código Florestal
LEI 9985/2000 | SNUC | Unidades de Conservação
DEC 4340/2002 | | Regulamenta o SNUC
LEI 9433/1997 | | Política Nacional de Recursos Hídricos
LEI 12305/2010 | PNRS | Política Nacional de Resíduos Sólidos
DEC 10936/2022 | | Regulamenta a PNRS
LEI 11445/2007 | | Saneamento básico
LEI 14026/2020 | Marco do Saneamento | Novo marco do saneamento
LEI 12187/2009 | | Política Nacional sobre Mudança do Clima
LEI 9795/1999 | | Educação ambiental
LEI 10650/2003 | | Acesso a informações ambientais
LEI 11428/2006 | Lei da Mata Atlântica | Mata Atlântica
LEI 11284/2006 | | Gestão de florestas públicas
LEI 5197/1967 | | Proteção à fauna
LEI 11105/2005 | | Biossegurança
LEI 13123/2015 | | Patrimônio genético e conhecimento tradicional
LEI 7661/1988 | | Gerenciamento costeiro
LEI 12334/2010 | | Segurança de barragens
LEI 14785/2023 | | Agrotóxicos
RES-CONAMA 1/1986 | | Avaliação de impacto ambiental
RES-CONAMA 237/1997 | | Licenciamento ambiental
LEI 10257/2001 | Estatuto da Cidade | Estatuto da Cidade
LEI 13089/2015 | | Estatuto da Metrópole
LEI 12587/2012 | | Política Nacional de Mobilidade Urbana
LEI 13465/2017 | Lei da Reurb | Regularização fundiária urbana e rural
DEC 9310/2018 | | Regulamenta a Reurb
LEI 14620/2023 | | Minha Casa, Minha Vida
LEI 4504/1964 | Estatuto da Terra | Estatuto da Terra
LEI 8629/1993 | | Reforma agrária
LC 76/1993 | | Desapropriação de imóvel rural para reforma agrária
LEI 6383/1976 | | Processo discriminatório de terras devolutas
LEI 5709/1971 | | Aquisição de imóvel rural por estrangeiro
LEI 8171/1991 | | Política agrícola
DEC 59566/1966 | | Arrendamento e parceria rural
LEI 11952/2009 | | Regularização fundiária na Amazônia Legal
DEC 4887/2003 | | Territórios quilombolas
DEC 1775/1996 | | Demarcação de terras indígenas
LEI 3924/1961 | | Patrimônio arqueológico e pré-histórico
DL 25/1937 | | Tombamento e patrimônio histórico e artístico nacional

## 11 | Eleitoral
LEI 4737/1965 | Código Eleitoral | Código Eleitoral
LC 64/1990 | Lei das Inelegibilidades | Inelegibilidades e AIJE
LC 135/2010 | Lei da Ficha Limpa | Ficha Limpa
LEI 9096/1995 | Lei dos Partidos | Partidos políticos
LEI 9504/1997 | Lei das Eleições | Lei das Eleições
LEI 6091/1974 | | Transporte de eleitores
LC 78/1993 | | Número de deputados
LEI 14192/2021 | | Violência política contra a mulher
LEI 14208/2021 | | Federações partidárias
RES-TSE 23600/2019 | | Pesquisas eleitorais
RES-TSE 23607/2019 | | Prestação de contas eleitorais
RES-TSE 23608/2019 | | Representações e reclamações
RES-TSE 23609/2019 | | Registro de candidaturas
RES-TSE 23610/2019 | | Propaganda eleitoral
RES-TSE 23659/2021 | | Cadastro eleitoral

## 12 | Ministério Público, magistratura e advocacia pública
LEI 8625/1993 | LONMP | Lei Orgânica Nacional do Ministério Público
LC 75/1993 | | Estatuto do Ministério Público da União
LC 35/1979 | Loman | Lei Orgânica da Magistratura Nacional
LC 73/1993 | | Lei Orgânica da AGU
LEI 10480/2002 | | Procuradoria-Geral Federal
LEI 9028/1995 | | Atribuições e funcionamento da AGU
LEI 13327/2016 | | Carreiras jurídicas federais e honorários
DL 147/1967 | | Procuradoria-Geral da Fazenda Nacional
LEI 5010/1966 | | Justiça Federal de primeira instância
RES-CNMP 20/2007 | | Controle externo da atividade policial
RES-CNMP 23/2007 | | Inquérito civil
RES-CNMP 118/2014 | | Autocomposição no Ministério Público
RES-CNMP 164/2017 | | Recomendações
RES-CNMP 174/2017 | | Notícia de fato e procedimento administrativo
RES-CNMP 179/2017 | | Compromisso de ajustamento de conduta
RES-CNMP 181/2017 | | Procedimento investigatório criminal
RES-CNMP 279/2023 | | Acordo de não persecução civil
RES-CNJ 60/2008 | | Código de Ética da Magistratura
RES-CNJ 75/2009 | | Concursos da magistratura
RES-CNJ 213/2015 | | Audiências de custódia
RES-CNJ 225/2016 | | Justiça restaurativa
RES-CNJ 492/2023 | | Julgamento com perspectiva de gênero

## 13 | Notarial, registral e cartórios
LEI 6015/1973 | LRP | Lei de Registros Públicos
LEI 8935/1994 | Lei dos Cartórios | Notários e registradores
LEI 9492/1997 | Lei de Protesto | Protesto de títulos e documentos de dívida
LEI 10169/2000 | | Normas gerais sobre emolumentos
LEI 7433/1985 | | Requisitos para escrituras públicas
DEC 93240/1986 | | Regulamenta as escrituras públicas
LEI 8560/1992 | | Averiguação e reconhecimento de paternidade
LEI 9534/1997 | | Gratuidade do registro de nascimento e óbito
LEI 11441/2007 | | Inventário, partilha e divórcio extrajudiciais
LEI 11790/2008 | | Registro tardio de nascimento
LEI 12100/2009 | | Retificação administrativa de registros civis
LEI 13484/2017 | | Registro civil e ofícios da cidadania
LEI 14382/2022 | SERP | Sistema Eletrônico dos Registros Públicos
LEI 14711/2023 | Marco Legal das Garantias | Garantias e procedimentos extrajudiciais
LEI 13097/2015 | | Concentração dos atos na matrícula do imóvel
LEI 10267/2001 | | Georreferenciamento de imóveis rurais
DEC 4449/2002 | | Regulamenta o georreferenciamento
LEI 5868/1972 | | Sistema Nacional de Cadastro Rural
LEI 6739/1979 | | Matrícula e registro de imóveis rurais
LEI 743/1850 | | Registro de embarcações (histórico)
LEI 7652/1988 | | Registro da propriedade marítima
LEI 4380/1964 | | Sistema Financeiro da Habitação
LEI 4591/1964 | | Condomínio em edificações e incorporações imobiliárias
LEI 6766/1979 | | Parcelamento do solo urbano
LEI 9514/1997 | | SFI e alienação fiduciária de imóveis
LEI 13465/2017 | Lei da Reurb | Reurb, legitimação fundiária e direito de laje
LEI 6313/1975 | | Títulos de crédito à exportação
DL 167/1967 | | Títulos de crédito rural
DL 413/1969 | | Títulos de crédito industrial
LEI 6840/1980 | | Títulos de crédito comercial
LEI 8929/1994 | | Cédula de Produto Rural
LEI 10931/2004 | | Cédula de Crédito Bancário e títulos imobiliários
LEI 11076/2004 | | Títulos do agronegócio
MP 2200-2/2001 | ICP-Brasil | Infraestrutura de Chaves Públicas Brasileira
LEI 14063/2020 | | Assinaturas eletrônicas
DEC 8660/2016 | Apostila da Haia | Convenção da Apostila
RES-CNJ 35/2007 | | Escrituras de inventário, partilha e divórcio | Alterada pela Resolução 571/2024
RES-CNJ 81/2009 | | Concursos para delegações extrajudiciais
RES-CNJ 175/2013 | | Casamento civil entre pessoas do mesmo sexo
RES-CNJ 228/2016 | | Apostilamento
PROV-CNJ 149/2023 | CNN/CN/CNJ-Extra | Código Nacional de Normas do Foro Extrajudicial
PROV-CNJ 161/2024 | | Prevenção à lavagem de dinheiro no foro extrajudicial

## 14 | Trabalho, processo do trabalho e previdenciário
DL 5452/1943 | CLT | Consolidação das Leis do Trabalho
LEI 13467/2017 | Reforma Trabalhista | Reforma trabalhista
LEI 5584/1970 | | Normas processuais trabalhistas
LEI 7701/1988 | | Dissídios nos tribunais do trabalho
LEI 8036/1990 | Lei do FGTS | FGTS
LEI 7998/1990 | | Seguro-desemprego e abono salarial
LEI 7783/1989 | Lei de Greve | Greve
LEI 6019/1974 | | Trabalho temporário e terceirização
LC 150/2015 | | Trabalho doméstico
LEI 5889/1973 | | Trabalho rural
LEI 11788/2008 | Lei do Estágio | Estágio
LEI 9029/1995 | | Práticas discriminatórias no emprego
LEI 14611/2023 | | Igualdade salarial
LEI 8212/1991 | Lei de Custeio | Organização e custeio da seguridade social
LEI 8213/1991 | Lei de Benefícios | Benefícios do RGPS
DEC 3048/1999 | RPS | Regulamento da Previdência Social
EC 103/2019 | Reforma da Previdência | Reforma da Previdência
LEI 9717/1998 | | Regimes próprios de previdência
LEI 9796/1999 | | Compensação entre regimes previdenciários
LEI 10887/2004 | | Contribuições e benefícios de servidores
LC 108/2001 | | Previdência complementar (patrocínio público)
LC 109/2001 | | Previdência complementar
LEI 12618/2012 | | Previdência complementar dos servidores federais
LC 142/2013 | | Aposentadoria da pessoa com deficiência
LC 187/2021 | | Entidades beneficentes e imunidade
PORT-MTP 1467/2022 | | Organização e funcionamento dos RPPS

## 15 | Maranhão: Constituição, instituições e carreiras jurídicas
CE-MA 1989 | CE/MA | Constituição do Estado do Maranhão e ADCT estadual
LC-MA 14/1991 | Código de Divisão e Organização Judiciárias | Organização judiciária do Maranhão
DOC RI-TJMA | RITJMA | Regimento Interno do TJMA
DOC CN-CGJ-MA | | Código de Normas da Corregedoria (Foro Judicial)
LC-MA 13/1991 | | Lei Orgânica do MPMA
DOC RI-CSMP-MA | | Regimento Interno do Conselho Superior do MPMA
DOC RI-CPJ-MA | | Regimento Interno do Colégio de Procuradores do MPMA
RES-CSMP-MA 26/2024 | | Concurso para promotor de justiça substituto
LC-MA 20/1994 | | Lei Orgânica da PGE-MA
DOC RI-PGE-MA | | Regimento Interno da PGE-MA
DOC RI-ALEMA | | Regimento Interno da Assembleia Legislativa do Maranhão

## 16 | Maranhão: administração, servidores, transparência, previdência e contratações
LEI-MA 6107/1994 | Estatuto dos Servidores do MA | Servidores civis do Maranhão
LEI-MA 8959/2009 | | Processo administrativo estadual
DEC-MA 28860/2013 | | Regulamenta o processo administrativo estadual
LEI-MA 10217/2015 | | Acesso à informação (MA)
DEC-MA 31251/2015 | | Lei Anticorrupção no MA
LEI-MA 11463/2021 | | Programas de integridade
DEC-MA 40320/2025 | | Conflito de interesses no Executivo estadual
LC-MA 73/2004 | | Seguridade social dos servidores do MA
LC-MA 219/2019 | | Reforma previdenciária no MA
DEC-MA 23179/2007 | | Regulamenta a seguridade dos servidores estaduais
DEC-MA 38425/2023 | | Licitações e compras estratégicas estaduais
DEC-MA 38479/2023 | | Licitações e compras estratégicas estaduais

## 17 | Maranhão: TCE-MA, controle externo e orçamento
LEI-MA 8258/2005 | LOTCE-MA | Lei Orgânica do TCE-MA
RES-TCEMA 1/2000 | RITCE-MA | Regimento Interno do TCE-MA
LEI-MA 9936/2013 | | Organização administrativa do TCE-MA
LEI-MA 11134/2019 | | Quadro de pessoal do TCE-MA
LEI-MA 12787/2026 | | Carreiras do TCE-MA
IN-TCEMA 83/2026 | | Prestações de contas anuais
DN-TCEMA 49/2026 | | Aplicação da IN 83/2026 às contas de 2025
RES-TCEMA 242/2015 | | Ouvidoria do TCE-MA
RES-TCEMA 422/2025 | | Programa de Compliance do TCE-MA
LEI-MA 12167/2023 | PPA 2024-2027 | PPA do Maranhão
LEI-MA 12620/2025 | LDO 2026 | LDO do Maranhão para 2026
LEI-MA 12766/2025 | LOA 2026 | LOA do Maranhão para 2026
IN-SEPLAN-STC 1/2025 | | Ordem cronológica de pagamentos

## 18 | Maranhão: tributário estadual
LEI-MA 7799/2002 | | Sistema Tributário do Maranhão (ICMS, ITCD, IPVA, taxas)
DEC-MA 19714/2003 | RICMS/MA | Regulamento do ICMS
DEC-MA 20685/2004 | | Regulamento do IPVA
DEC-MA 14689/1995 | | Administração tributária e processo administrativo tributário
DEC-MA 19648/2003 | | Regimento do Tribunal Administrativo de Recursos Fiscais

## 19 | Maranhão: cartórios, emolumentos e custas
LC-MA 14/1991 | Código de Divisão e Organização Judiciárias | Organização e fiscalização das serventias
PROV-COGEX-MA 28/2026 | | Código de Normas do Foro Extrajudicial do MA
PROV-COGEX-MA 49/2026 | | Alteração do Código de Normas do Foro Extrajudicial
LEI-MA 9109/2009 | | Emolumentos extrajudiciais
RES-GP-TJMA 143/2025 | | Tabelas de emolumentos de 2026
LC-MA 48/2000 | | FERJ
LC-MA 221/2020 | | FADEP
LC-MA 222/2020 | | FEMP
LC-MA 284/2025 | | FERRFIS
LEI-MA 12193/2023 | | Custas processuais | Alterada pela Lei estadual 12.535/2025
RES-GP-TJMA 144/2025 | | Tabelas de custas judiciais de 2026

## 20 | Maranhão: ambiental, agrário e fundiário
LEI-MA 5315/1991 | Lei de Terras do MA | Terras de domínio do Estado
DEC-MA 17746/2000 | | Regulamenta a Lei de Terras
IN-ITERMA 2/2019 | | Regularização fundiária de terras rurais
LEI-MA 5405/1992 | | Código de Proteção de Meio Ambiente do MA
DEC-MA 13494/1993 | | Regulamenta o Código de Meio Ambiente
LEI-MA 8149/2004 | | Política Estadual de Recursos Hídricos | Alterada pela Lei estadual 8.375/2006
LEI-MA 9412/2011 | | Compensação ambiental
LEI-MA 9413/2011 | | Sistema Estadual de Unidades de Conservação
`;
