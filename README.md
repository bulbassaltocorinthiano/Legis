# Legis — legislação atualizada

Site fechado (até 20 usuários) para leitura da legislação federal e do Maranhão a partir das **fontes oficiais**, com prazos em negrito, jurisprudência do STJ por artigo e biblioteca doutrinária.

## Como funciona

| Camada | O quê |
| --- | --- |
| **Fonte do texto** | Planalto (texto compilado). É a fonte mais atual: já reflete, por exemplo, a revogação dos arts. 757+ do CC pela Lei 15.040/2024. O robô descarta a redação tachada (`<strike>`), separa as notas "(Redação dada pela…)" e estrutura artigos, parágrafos, incisos e alíneas. |
| **Metadados** | Ementa oficial via Dados Abertos do Senado Federal. |
| **Atualização** | Requisição condicional (ETag/Last-Modified) a cada execução; só reprocessa o que mudou e registra a alteração em `norm_changes`. Roda pelo GitHub Actions a cada 6 h (`.github/workflows/atualizar-legislacao.yml`) e, como reserva, pelo Vercel Cron (`/api/cron/atualizar`). |
| **Jurisprudência** | STJ Dados Abertos: temas repetitivos (tese firmada) e espelhos de acórdãos, que trazem a referência legislativa estruturada (`LEG:FED LEI:013105 ... ART:00787`) e por isso são ligados ao artigo exato. |
| **Doutrina** | Verbetes em `lib/glossary/data.ts` (carga inicial), editáveis em *Admin → Doutrina*. Termos são sublinhados no texto das áreas correspondentes; qualquer palavra selecionada pode ser consultada. |
| **Acesso** | Login e senha (bcrypt, sessão em cookie httpOnly), sem cadastro aberto, limite de 20 contas. |

### Fontes que ainda não estão integradas

- **STF** (súmulas, repercussão geral): o portal bloqueia acessos de datacenters fora do Brasil (WAF). O robô precisa rodar a partir de uma rede brasileira.
- **Resoluções CNJ/CNMP/TSE/TCU/Senado, Conama, portarias** e **normas do Maranhão**: têm portais próprios, sem API. Aparecem no catálogo como "fonte não integrada" e **não exibem texto** até haver um leitor oficial para elas — nada é digitado à mão.

## Rodar localmente

```bash
npm install
npm run ingest -- --keys CF-1988,LEI-10406-2002   # ou --all
npm run ingest:stj -- --months 6
npm run user:create -- admin SenhaForte123 "Seu Nome" admin
npm run dev
```

Sem `DATABASE_URL`, o banco é um Postgres embutido (PGlite) em `./.data/pg`.

## Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório (a Vercel detecta o Next.js).
2. Em **Storage → Create Database → Neon (Postgres)**, crie o banco e conecte ao projeto. A variável `DATABASE_URL` é criada automaticamente.
3. Em **Settings → Environment Variables**, defina `ADMIN_USERNAME`, `ADMIN_PASSWORD` (mín. 8 caracteres, com letras e números), `ADMIN_NAME` e `CRON_SECRET` (texto longo aleatório). Faça **Redeploy**.
   No primeiro acesso o sistema cria as tabelas, o catálogo, a doutrina e o usuário administrador.
4. No GitHub, em **Settings → Secrets and variables → Actions → New repository secret**, crie `DATABASE_URL` com o mesmo valor do Neon (copie em Vercel → Storage → seu banco → `.env.local`).
5. Carga inicial: em **Actions → Atualizar legislação → Run workflow** (deixe "6" meses). Leva cerca de 1 hora; depois disso o robô roda sozinho a cada 6 h.

Os demais usuários (até 20) são criados em *Admin → Usuários*. `vercel.json` fixa a região `gru1` (São Paulo).

## Testes

```bash
npm test        # detector de prazos e extrator de citações
npm run typecheck
```
