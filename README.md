# ⚡ Central de Clientes Starken

> Dashboard web para acompanhar campanhas Meta Ads, relatórios mensais e gestão dos clientes da **Starken Tecnologia**: Hamburgueria Feio, Academia São Pedro e os 3 Madrugões (Centro, Garcia, Fortaleza).

Construído sobre a **Meta Graph API v23.0** com Node.js 22 puro (sem framework, sem dependências npm).

---

## 🚀 Em produção

| Recurso | URL |
|---|---|
| **Aplicação** | _a definir após DNS_ |
| **Repositório** | https://github.com/ferramentastecnologia/central-clientes |

---

## 🎯 Funcionalidades

### 1. Central de Clientes (`/`)
Landing pública com cards de todos os clientes Starken ativos. Cada card mostra: avatar IG, nome, @handle, total de seguidores, número de posts. Clique abre o relatório do mês ou hub do cliente.

### 2. Relatórios Mensais (`/<cliente>/relatorio-{mes}.html`)
Páginas HTML responsivas com KPIs, funil de conversão SVG triangular, ranking detalhado de campanhas (ad set + top 3 ads por gasto). Compartilháveis via WhatsApp.

Relatórios atuais:
- 🍔 Hamburgueria Feio · `/feio/relatorio-maio.html`
- 🥩 Madrugão Centro · `/centro/relatorio-maio.html`
- 🥩 Madrugão Garcia · `/garcia/relatorio-maio.html`
- 🍔 Hamburger Day 28/05 (consolidado Madrugões) · `/eventos/hamburger-day-madrugao-28-05.html`

### 3. Dashboards Real-time
- `/agendamentos.html` — posts agendados via Graph API + crons Claude registrados
- `/renovacao.html` — fluxo de renovação mensal de campanhas (cards comparativos)

### 4. Painel Admin (`/admin/`) — Basic Auth
Central de monitoramento de credenciais Meta: status do token, páginas FB + Instagram vinculados, ad accounts (status, gasto, saldo), Business Managers, app usage.

---

## 🔌 Endpoints API

| Endpoint | Auth | Função |
|---|---|---|
| `GET /api/clients` | público | Lista clientes agrupados por agência (sem dados financeiros) |
| `GET /api/agendamentos` | público | Status do token + posts agendados FB de cada cliente + crons |
| `GET /api/renovacao` | público | Config mensal + métricas (gasto histórico + last_month + ROAS) |
| `GET /api/admin/status` | Basic Auth | Token health, páginas, IGs, ad accounts, BMs, app usage |

Cache de 60s. Use `?force=1` pra bypass.

---

## 💻 Setup local

### Pré-requisitos
- Node.js 22+
- Git

### Passos

```bash
# 1. Clone
git clone https://github.com/ferramentastecnologia/central-clientes.git
cd central-clientes

# 2. Configure .env
cp .env.example .env
# Edite .env com seu token Meta + admin user/pass

# 3. Crie os data/*.json a partir dos .example
cp data/clients-mapping.example.json data/clients-mapping.json
cp data/client-aliases.example.json data/client-aliases.json
# Edite com seus dados reais (page_id, ig_id, ad_account_id de cada cliente)

# 4. Inicie o servidor
node --env-file=.env server.mjs
```

Servidor em `http://localhost:3000`.

---

## 🏗️ Estrutura

```
.
├── server.mjs               # Servidor Node HTTP único
├── package.json             # Sem dependências npm
├── .env.example             # Template de variáveis
├── .gitignore               # Tokens e dados privados ficam fora
│
├── index.html               # Central de Clientes (landing)
├── agendamentos.html        # Posts FB agendados
├── renovacao.html           # Renovação mensal
│
├── admin/index.html         # Painel admin (Basic Auth)
│
├── data/
│   ├── *.example.json       # Templates (commitados)
│   └── *.json               # Dados reais (Git-ignored)
│
├── assets/                  # Logos, fonts compartilhados
│
├── feio/                    # Hamburgueria Feio (hub + relatórios)
├── centro/                  # Madrugão Centro (relatórios)
├── garcia/                  # Madrugão Garcia (relatórios)
│
└── eventos/
    └── hamburger-day-madrugao-28-05.html
```

---

## 🔐 Variáveis de ambiente

| Var | Descrição |
|---|---|
| `PORT` | Porta HTTP (default 3000) |
| `META_GRAPH_TOKEN` | Long-Lived Token Meta Graph API (60 dias) |
| `ADMIN_USER` | Usuário do Basic Auth (`/admin/`) |
| `ADMIN_PASS` | Senha do Basic Auth |
| `TOKEN_FILE` | (opcional) Caminho para arquivo `.md` com token (fallback) |
| `CLIENTS_DIR` | (opcional) Pasta raiz dos clientes (pra servir assets) |

**Falha segura do Admin:** sem `ADMIN_USER`/`ADMIN_PASS` no `.env`, área retorna 503 (não abre sem auth).

---

## 📊 Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 22 puro (ESM, módulos `.mjs`) |
| HTTP server | módulo `http` nativo (sem Express/Fastify) |
| HTTP client | `fetch` nativo (Node 18+) |
| Frontend | HTML5 + CSS vanilla + JS vanilla |
| Fontes | Inter, Bebas Neue, Playfair Display (via Google Fonts CDN) |
| Charts | SVG inline (funis triangulares) — sem libs |
| API externa | Meta Graph API v23.0 |
| Cache | em memória (60s) |
| Versionamento | Git + GitHub |

**Zero dependências npm** — só Node built-in. Mantém o projeto leve, sem `node_modules`, sem `package-lock`.

---

## 🎨 Identidades visuais

| Cliente | BG | Accent | Fonte display |
|---|---|---|---|
| **Hamburgueria Feio** | Marrom `#1A0F08` | Amarelo `#F4B400` | Bebas Neue |
| **Madrugão** (Centro+Garcia) | Preto `#0A0A0A` | Laranja `#FF6B00` + Amarelo neon `#FFD60A` | Bebas Neue |

Padrão comum em todos os relatórios:
- Banner do mês tipográfico (Playfair 56-72px, gradient branco→cor identidade)
- Funil SVG triangular (gradient grafite → cor identidade, etapa final SEMPRE verde com glow)
- Ranking de campanhas com ad set metrics (Imp, Reach, Freq, CTR, CPM) + top 3 ads
- Footer com "Starken Tecnologia · Marketing Digital & Performance · Blumenau/SC"

---

## 🛣️ Roadmap

- [ ] Hubs faltantes: criar `/academia/`, `/centro/`, `/garcia/`, `/fortaleza/`
- [ ] Geração automatizada de PDF/PNG dos relatórios via Chrome headless
- [ ] Endpoint `/api/relatorio/{cliente}/{mes}` com dados em tempo real
- [ ] Notificação WhatsApp/email quando token < 7 dias
- [ ] Comparativo mês-a-mês automatizado em cada relatório

---

## 📄 Licença

MIT — projeto open-source, livre pra adaptar.

---

## 🏢 Sobre

**Mantenedor:** Starken Tecnologia Ltda (Blumenau/SC)
**Projeto-irmão:** [feniceLab/dashboard-tr-fego-pago](https://github.com/feniceLab/dashboard-tr-fego-pago) — versão com clientes Fenice Lab (Suprema, Arena, Oca, Império, cotafácil).

Os 2 projetos compartilham o mesmo motor (servidor Node + estrutura HTML/CSS), diferenciados pelos clientes mapeados em `data/clients-mapping.json` e pelo branding visual.
