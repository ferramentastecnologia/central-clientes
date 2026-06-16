# AGENTS.md — Central de Clientes Starken

> Guia **canônico e agnóstico de ferramenta** pra qualquer assistente de código (Claude Code, Cursor,
> Windsurf, Cline, Copilot, Codex, Aider…). Se você é um agente operando este repo, **leia isto primeiro.**
> Os arquivos `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.clinerules` e
> `.github/copilot-instructions.md` apontam todos pra cá.

---

## 1. O que é

Dashboard/central de operações de uma **agência de tráfego pago (Meta Ads)** — Starken Tecnologia
(e clientes Fenice Lab). Reúne: cockpit de gestão de campanhas, portal de performance do cliente,
monitor em tempo real, galeria de posts, agendamento e publicação de stories/posts (IG+FB).

**Stack:** Node.js **puro** (`server.mjs`, sem dependências externas, sem framework) + HTML/CSS/JS
**vanilla** (sem build/bundler). Tudo é servido pelo próprio `server.mjs`.

## 2. Rodar local

```bash
node --env-file=.env server.mjs      # sobe em http://localhost:3032 (porta no .env)
```
- Precisa de um `.env` com `META_GRAPH_TOKEN`, `ADMIN_USER`, `ADMIN_PASS`, `PORT` (ver `.env.example`).
- Não há `npm install` (zero deps). Não há testes automatizados.
- Áreas `/admin/*`, `/api/admin/*`, `/portaldocliente`, `/api/cliente/*` exigem **Basic Auth** (creds no `.env`).

## 3. Deploy (produção)

Fluxo: **GitHub `main` → VPS → PM2 → `central.starkentecnologia.com.br`**.
```bash
# 1. commitar e push em main (usa PAT — ver §8)
# 2. na VPS:
ssh hostinger-vps "cd /var/www/central-clientes && git pull && pm2 restart central-clientes-starken"
```
- VPS: alias SSH `hostinger-vps` · path `/var/www/central-clientes` · processo PM2 `central-clientes-starken`.
- ⚠️ **O agente NÃO deve realizar commits, push ou deploy diretamente. O agente deve apenas aplicar as alterações necessárias nos arquivos locais (workspace) e deixar que o usuário faça o commit, push e deploy manualmente.**
- ⚠️ **LEMBRETE OBRIGATÓRIO:** Sempre que realizarmos modificações no código da central (HTML, JS, server, etc), o agente **DEVE lembrar ativamente o usuário** de rodar o comando da VPS (`ssh hostinger-vps...`) para que as mudanças entrem em tempo real.
- Commits terminam com `Co-Authored-By:` do modelo. Nunca pular hooks/assinatura sem pedido.

## 4. Superfícies principais (todas servidas por `server.mjs`)

| Rota | Arquivo | O que é |
|---|---|---|
| `/admin/operacoes.html` | `admin/operacoes.html` | **Cockpit de operações** do gestor: estrutura campanha→conjunto→anúncio, criativos (img/vídeo), nota A–F, semáforo, funil, período, campanhas inativas com gasto |
| `/portaldocliente` | `portaldocliente.html` | **Portal de performance do cliente** (abas Resumo/Campanhas/Criativos/Demografia), inteligência delivery BR, sem camada de lucro, branding por cliente |
| `/admin/monitor.html` | `admin/monitor.html` | Monitor de campanhas em tempo real (período, refresh) |
| `/admin/galeria.html` | `admin/galeria.html` | Galeria de posts publicados |
| `/agendamentos.html` | `agendamentos.html` | Agendamentos/crons + posts/stories publicados |
| `/admin/` | `admin/index.html` | Status de tokens/contas |
| `feio/`, `centro/`, `garcia/`, `eventos/` | — | **Relatórios/hubs client-facing** (marca do CLIENTE, não Starken) |

## 5. Backend `server.mjs`

- **Auth gate:** `/admin`, `/api/admin`, `/portaldocliente`, `/api/cliente` → Basic Auth.
- **Endpoints:** `/api/admin/{status,monitor,posts,estruturas}` · `/api/cliente/{resumo,saldo,timeseries,breakdown}`
  · `/api/{clients,agendamentos,renovacao}`. Todos com cache TTL (respeita rate-limit do Meta).
- **Token Meta:** `readToken()` lê `process.env.META_GRAPH_TOKEN` (prioridade) ou um `TOKEN_FILE` markdown.
- **Graph API:** v23.0 direto (`graph.facebook.com`). Funções-chave: `fetchEstruturas` (campanhas+insights+criativos,
  período parametrizável + inativas-com-gasto), `parseInsightsFull`, `parseCreative` (resolve image_hash via
  `adimages` e video_id via `?ids=`), `fetchResumoCliente/fetchSaldos/fetchTimeseriesCliente/fetchBreakdownCliente`.

## 6. Dados gitignored (VPS-owned) — NÃO estão no Git

`data/clients-mapping.json` (slug→ad_account/page/pixel/cor/seg), `data/crons.json` (agendamentos),
`data/stories-publicados.json`, `data/snapshot.json`, `academia/assets/*`, `feio/assets/photos/*`, `*.mp4/*.mov`.
→ Editar **direto na VPS** (ssh) ou **scp** do local. Não dá pra versionar (têm dados de cliente).

## 7. Automação de stories/posts (IG + Facebook)

**Mecanismo atual (à prova de reboot):** `data/crons.json` + **`scripts/cron-dispatcher.mjs`** rodando pelo
**crontab do sistema a cada 10 min** na VPS. O dispatcher lê as crons pendentes vencidas (janela 90min),
publica genérico por cliente no IG (`ig_business_id`) + FB (page do `client_slug`) e marca completed/skipped.
**4 formatos por `kind`:**
- **story** (`kind` ausente/`story`): `image_url` → stories IG+FB.
- **feed** (`kind:'feed'` + `caption`): post de feed IG+FB. O FB feed tem **recuperação anti-duplicata** —
  se o Graph responder *"Please reduce the amount of data…"* (erro, mas às vezes publica), confere os posts
  recentes antes de falhar, evitando republicação dupla.
- **carrossel** (`kind:'carousel'` + `images[]` + `caption`): múltiplas imagens IG+FB.
- **reel** (`kind:'reel'` + `video` + `caption`): vídeo via `scripts/publish-reel-feio.mjs` (transcode H.264 —
  HEVC não decodifica na VPS; exportar em H.264). `video` resolve em `/{client_slug}/assets/videos/`.

O `register()` grava `kind`, `caption` e `images` no `stories-publicados.json` → materiais nascem auto-tipados.
```bash
# crontab (instalar exige OK do usuário — bloqueado p/ agente):
*/10 * * * * cd /var/www/central-clientes && /usr/bin/node --env-file=.env scripts/cron-dispatcher.mjs >> logs/cron-dispatcher.log 2>&1
```
**Pra agendar:** adicionar entrada `pending` em `data/crons.json` (campos: `id`, `next_fire_iso` UTC,
`ig_business_id`, `client_slug` + o payload do formato acima). Sem recriar timers.
**Publicação avulsa/manual:** `scripts/publish-story-{feio,academia}.mjs --image=<arq> [--title=…]`.
**Dashboard `/agendamentos.html`:** 2 views — **Agendados** (por formato, com filtros clicáveis, preview de
reel em loop + lightbox e galeria de carrossel) e **Publicados** (reconhece o formato real via join id→kind,
separa Posts × Stories). ⚠️ **`systemd-run` (timers transientes) foi ABANDONADO** — sumiam no reboot. Não usar.
Doc-mestre: `docs/Automacao-Stories-e-Agendamentos.md`.

## 8. Credenciais (NUNCA committar — `.gitignore` cobre `.env`, `*token*`, `*.key`)

- **Token Meta** (`META_GRAPH_TOKEN`): no `.env` **local E da VPS** (mesmo valor). É **token de usuário**
  → **expira ~60 dias** e **morre se trocar a senha do Facebook** (erro 190 sub 460). Renovar pelo
  Graph API Explorer **ou** (ideal) migrar pra **System User token** (Business Manager → Usuários do Sistema),
  que não cai com senha. Após renovar: atualizar os 2 `.env` + `pm2 restart` + testar com `/me`.
- **GitHub PAT:** fora do repo, em `C:\Users\Juan\Documents\central-clientes-tokens\GitHub PAT.md`.
  Padrão de push: extrair o PAT, `git remote set-url` com token, push, **resetar a URL limpa** depois.
- **Admin Basic Auth:** `ADMIN_USER`/`ADMIN_PASS` no `.env`.
- `HANDOFF-STARKEN.md` (na raiz, **fora do Git**) tem credenciais antigas — manter fora do versionamento.

## 9. Design System (regra obrigatória)

Toda UI da Central usa o **Starken Design System** (`design-system/`, tema dark/tech, esmeralda `#10b981` +
slate). **Usar tokens (`var(--…)`), nunca hex solto.** Linkar `design-system/tokens/starken-tokens.css`.
**Exceção:** hubs **client-facing** (`feio/`, `centro/`, `garcia/`, `eventos/`) carregam a marca do **cliente**.
Detalhes: `design-system/Starken-Design-System.md` e `CLAUDE.md`.

## 10. Tráfego pago / Meta Ads (regras-chave)

Fonte da verdade: skill/pasta `trafego-pago/`. Regras obrigatórias p/ `OUTCOME_SALES`: **mobile-only**,
**pixel + custom_event PURCHASE**, CTA **ORDER_NOW** (cardápio digital), **multi-advertiser OFF**.
**Day-parting** funciona com **ABO** (orçamento no conjunto), não CBO. **Madrugão** = posicionamento manual.
Contas MCP-enabled: Feio, Madrugão Centro/Garcia, Suprema, Academia. Boost de post existente pode falhar
(`1487472` = música/áudio sem licença pra ad) → usar criativo sem música ou vídeo cru. Consultoria embutida:
Pedro Sobral (tática BR) + Alex Hormozi (math/oferta).

## 11. Clientes

**Starken:** Hamburgueria Feio (`feio`), Academia São Pedro (`academia`), Madrugão Centro/Garcia/Fortaleza
(`centro`/`garcia`/`fortaleza`). **Fenice Lab:** Arena, Suprema, Oca, Império. IDs em `data/clients-mapping.json`.

## 12. Gotchas (já mordemos)

- Token Meta **morre ao trocar senha do FB** + expira 60d → migrar p/ System User token.
- Timers `systemd-run` **somem no reboot** → usar o `cron-dispatcher` + crontab.
- Insights **account-level em `date_preset=maximum` NÃO trazem compras** → portal usa `this_month`/`last_30d`.
- URLs de criativo do **fbcdn expiram** (param `oe=`) → re-buscar quando for usar.
- Dev-mode do app bloqueia criar dark post via Graph; boost de post existente via **adcreative direto** funciona.

## 13. Convenções

- Sem build, sem deps: edições são diretas em `.html`/`.mjs`. Combinar com o estilo do arquivo vizinho.
- Naming de campanha: `[STARKEN|CLIENTE][VENDAS|RECO|TRAFEGO][CONTEXTO][DATA?]`.
- Datas de cron em **UTC** (`next_fire_iso`). BRT = UTC−3 (11h BRT = 14:00 UTC · 18h BRT = 21:00 UTC).
- Pausar antes de ações externas (publicar, subir anúncio, deploy) — confirmar com o usuário.
