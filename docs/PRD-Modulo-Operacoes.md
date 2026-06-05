# PRD — Módulo "Central de Operações" (Tráfego Pago)

> Documento de requisitos do novo módulo de acompanhamento operacional da Central de Clientes Starken.
> Status: **Rascunho v0.1** — para estruturação conjunta (Juan + agente).
> Data: 2026-06-05

---

## 1. Visão geral

Hoje a Central tem peças **isoladas e ao vivo**: Monitor de Campanhas, Galeria de Posts, Agendamentos. O que falta é uma camada que **consolide a OPERAÇÃO por cliente** — o que foi feito, o que está rodando, o que vem por aí, as estruturas de campanha, os criativos, o investimento e os alertas — **conectada ao monitoramento**.

Este módulo é o **"command center" do gestor de tráfego**: abre a tela e em segundos entende a situação de qualquer cliente.

## 2. Problema / dor atual

- Campanhas criadas (ex.: Madrugão Centro — Feijoada Awareness R$500 + Vendas Delivery R$80) ficam **só no Gerenciador + docs soltos** (`.md` na pasta do cliente).
- Não há **histórico consolidado das ações** (campanhas, posts, stories, edições) por cliente.
- **Planejamento por cliente** é manual/disperso (na cabeça ou em arquivos).
- **Investimento e pacing** não têm visão consolidada com alerta (ex.: lifetime gastando rápido demais).
- O **Monitor ao Vivo** mostra o "agora", mas não conecta com o histórico nem com o planejamento.
- Descobertas operacionais (regras, workarounds) vivem na **skill `trafego-pago`**, mas não há cruzamento com a execução real.

## 3. Objetivos

1. **Centralizar a operação** de tráfego por cliente (passado + presente + futuro).
2. Visão imediata: **o que foi feito / o que está rodando / o que vem**.
3. **Alertas proativos** (pacing, CPM, ROAS, gasto travado, saldo, token).
4. **Reaproveitar** o que já existe (monitor, galeria, agendamentos, mapping, docs).
5. Reduzir "campanha esquecida" e retrabalho.

## 4. Personas

| Persona | Uso |
|---|---|
| **Gestor de tráfego (Juan)** | Principal · interno (área admin, Basic Auth) |
| Sócio/operação Starken | Visão consolidada da carteira |
| *(futuro)* Cliente | Read-only do próprio painel (sem dados sensíveis de margem) |

## 5. Escopo / funcionalidades

### 5.1 Visão geral (cross-client) — tela inicial do módulo
- **Cards por cliente:** status da conta, nº de campanhas ativas, **investido no mês**, ROAS/alcance do período, **badge de alerta**.
- **Resumo da carteira:** total investido, total ativo, alertas abertos, contas com problema.
- Filtro por agência (Starken / Fenice) e por status.

### 5.2 Hub por cliente (drill-down) — o coração do módulo
Abas/seções por cliente:

- **📋 Ações & histórico (timeline):** tudo que foi feito — campanhas criadas, posts/stories publicados, edições de budget/horário, renovações. Cada item com data, tipo, IDs e link.
- **🗓️ Planejamento:** roadmap/calendário do cliente — próximas ações, eventos sazonais (ex.: Feijoada 06/06, Dia do Hambúrguer), datas de troca de criativo.
- **🏗️ Estruturas de campanha:** árvore **campanha → conjunto → anúncio** (puxada do Meta ao vivo), mostrando objetivo, budget (CBO/ABO), day-parting, placements, otimização, status — com as **regras da skill** sinalizadas (✅ mobile, ✅ pixel, ⚠️ multi-advertiser).
- **🖼️ Criativos:** galeria dos criativos **usados nas campanhas** (image_hash + preview) + os **publicados orgânicos** (reusa a Galeria).
- **💰 Investimento:** verba por campanha, **pacing** (gasto vs orçamento vs tempo), gasto histórico, projeção, **alertas de ritmo**.
- **📡 Monitor:** atalho pro Monitor ao Vivo já filtrado no cliente.
- **📄 Docs:** os `.md` de campanha/renovação da pasta do cliente, renderizados.

### 5.3 Alertas (motor de regras)
- **Regras configuráveis:** CPM > X, ROAS < Y, gasto travado (sem progresso), pacing fora (vai estourar/sobrar budget), conta sem saldo/desativada, token data-access expirando, dia-do-evento sem entrega.
- **Exibição:** badge no card do cliente + lista priorizada (🔴/🟡).
- *(futuro)* notificação ativa (push/email/WhatsApp via cron).

### 5.4 Integração com o existente (não reinventar)
| Já temos | Reaproveitamento |
|---|---|
| `/api/admin/monitor` | Dados ao vivo de campanhas (gasto, ROAS, ativas) — por período |
| `/api/admin/posts` (Galeria) | Criativos publicados orgânicos |
| `/api/agendamentos` | Agendados + publicados + stories + crons |
| `clients-mapping.json` | Base de clientes (page/IG/ad account/pixel) |
| Docs `.md` por cliente | Estruturas e renovações documentadas |
| Skill `trafego-pago` | Regras pra validar/sinalizar nas estruturas |

## 6. Arquitetura técnica

Mantém o padrão atual (Node puro `server.mjs`, sem deps; páginas HTML estáticas; Basic Auth no admin; cache com TTL).

- **Frontend:**
  - `/admin/operacoes.html` — visão cross-client (protegida).
  - Hub do cliente: `/admin/operacoes.html?cliente=<slug>` (uma página, drill-down via query) ou `/admin/cliente/<slug>.html`.
- **Backend (novos endpoints, admin-only):**
  - `GET /api/admin/operacoes` — agrega carteira (resumo + cards) — **cache 10-15 min**.
  - `GET /api/admin/cliente?slug=<slug>` — detalhe do cliente (estruturas Meta + investimento + ações + planejamento + docs).
  - `GET /api/admin/alertas` — avalia regras e retorna alertas abertos.
- **Reusa funções existentes:** `fetchMonitor` (por período), `getPageToken` (cache), `fetchPostsGaleria`.
- **Estruturas Meta:** `ads_get_ad_entities` / Graph `act_X/campaigns?fields=...,adsets{...,ads{...}}` — **cache agressivo** (estrutura muda pouco).
- **Rate limit:** tudo cacheado, sem polling agressivo (lição do `X-App-Usage` 186% → 37%). Page tokens já cacheados.

## 7. Modelo de dados (proposto)

### Reusa (já existem)
- `clients-mapping.json` · `posts-publicados.json` · `stories-publicados.json` · `crons.json`

### Novos (VPS-owned, gitignored — como crons/stories)
- **`data/acoes/<slug>.json`** — histórico de ações por cliente:
  ```json
  {"acoes":[{"id":"...","tipo":"campanha_criada|post|story|edicao|renovacao","data":"ISO",
            "titulo":"...","ids":{"campaign":"...","adset":"...","ad":"..."},"link":"...","obs":"..."}]}
  ```
  > Ideal: **auto-registro** — quando criamos campanha via MCP ou publicamos post/story, grava aqui (como o auto-registro de stories que já fizemos).
- **`data/planejamento/<slug>.json`** — roadmap/calendário do cliente:
  ```json
  {"itens":[{"data":"2026-06-06","tipo":"evento|troca_criativo|relatorio","titulo":"Feijoada","status":"planejado|feito"}]}
  ```
- **`data/alertas-config.json`** — regras de alerta (thresholds CPM/ROAS/pacing).

## 8. Fases de implementação

| Fase | Entrega | Esforço |
|---|---|---|
| **V1 (MVP)** | Visão cross-client (cards + resumo) · Hub por cliente com **estruturas Meta ao vivo** + **investimento/pacing** + atalho pro monitor · histórico de ações via JSON curado | Médio |
| **V2** | **Planejamento/roadmap** por cliente · **motor de alertas** (CPM/ROAS/pacing/saldo) | Médio |
| **V3** | **Criativos consolidados** (hashes das campanhas + galeria) · **auto-registro de ações** (campanha criada via MCP grava sozinho) | Médio-alto |
| **V4** | Notificações ativas (cron) · *(futuro)* visão read-only pro cliente | Alto |

## 9. Métricas de sucesso
- Ver o status completo de um cliente em **< 10 segundos**.
- **Zero campanhas "esquecidas"** (toda ação no histórico).
- Alertas pegam o problema **antes do cliente reclamar**.
- Reduz consultas manuais ao Gerenciador para acompanhamento.

## 10. Riscos & considerações
- **Rate limit Meta** — cache agressivo obrigatório; nada de polling. (Já mitigado: monitor 30min, page tokens cacheados.)
- **Manutenção de dados** — priorizar **automático** (Meta API + auto-registro) sobre curadoria manual; JSON curado só onde a API não cobre (planejamento).
- **App em dev mode** — criação via MCP; leitura via Graph API direta (padrão atual).
- **Escopo grande** — fasear com rigor; V1 já entrega valor.
- **Dados privados** — novos JSON VPS-owned/gitignored (padrão crons/stories).

## 11. Decisões (fechadas em 2026-06-05)
1. ✅ **MVP (V1):** começar por **Estruturas de campanha** (árvore campanha→conjunto→anúncio ao vivo do Meta, com regras da skill sinalizadas).
2. ✅ **Histórico de ações:** **auto-registro** — toda ação que passa pelo nosso fluxo (campanha criada via MCP, post/story publicado) grava sozinha (como já fazemos com stories).
3. ✅ **Acesso:** **admin-only** por enquanto (Basic Auth), como monitor/galeria.
4. 🟡 **Nome do módulo:** working name **"Central de Operações"** (confirmar/trocar depois).
5. 🟡 **Granularidade do investimento:** definir na V2 (por campanha basta no MVP; pacing diário fica pra V2).

---

## 12. V1 detalhado (MVP) — Estruturas de Campanha + base de auto-registro

### 12.1 Entregas da V1
1. **Página `/admin/operacoes.html`** (admin) com **seletor de cliente** + visão de **estruturas de campanha**.
2. **Endpoint `GET /api/admin/estruturas?slug=<slug>`** — árvore do cliente, cache 10-15 min.
3. **Base de auto-registro** — helper `registrarAcao()` que grava em `data/acoes/<slug>.json`, já plugado no fluxo de criação de campanha (MCP) e publicação (post/story). *(O histórico em si vira tela na V2, mas a captura começa na V1 pra não perder dados.)*

### 12.2 O que a árvore mostra (por cliente)
```
📁 CAMPANHA — nome · objetivo · status · budget(CBO/ABO) · stop_time
   └─ 🎯 CONJUNTO — otimização · budget(ABO) · day-parting · placements · device · geo · frequência · pixel(promoted_object)
        └─ 🖼️ ANÚNCIO — status · criativo(asset custom?) · CTA · link · pixel(tracking)
```

### 12.3 Selos de regra (cruzando com a skill `trafego-pago`)
Cada nó exibe ✅/⚠️ conforme as regras §2/§3:
- **Vendas:** mobile-only · pixel+PURCHASE · CTA ORDER_NOW · otimização OFFSITE_CONVERSIONS · day-parting via ABO
- **Madrugão:** posicionamento manual
- **Sempre:** ⚠️ lembrete "multi-advertiser" (API não controla) · gasto vs budget (snapshot do monitor)

### 12.4 Técnico
- Reusa `getPageToken` (cache) e o padrão de fetch do `fetchMonitor`.
- Graph: `act_<id>/campaigns?fields=name,objective,effective_status,daily_budget,lifetime_budget,stop_time,adsets{name,optimization_goal,lifetime_budget,daily_budget,pacing_type,adset_schedule,promoted_object,targeting{...},ads{name,effective_status,creative{...},tracking_specs}}` — em 1-2 chamadas por cliente, **cacheado**.
- Status efetivo colorido (ACTIVE / PAUSED / IN_REVIEW / WITH_ISSUES).
- Snapshot de gasto por campanha: reaproveita o `/api/admin/monitor` (período).

### 12.5 Fora da V1 (vem depois)
Planejamento/roadmap, motor de alertas, galeria de criativos consolidada, notificações, tela de histórico — V2+.

---
*PRD criado em 2026-06-05 · Central de Clientes Starken · base: skill trafego-pago + arquitetura atual (monitor, galeria, agendamentos)*
