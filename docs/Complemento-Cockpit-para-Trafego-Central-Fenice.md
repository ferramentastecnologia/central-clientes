# Complemento — Cockpit Starken → Tráfego Pago (Central Fenice)

> **O que é:** ponte honesta entre o **cockpit de operações já construído e validado em produção** (Central Starken · `central.starkentecnologia.com.br/admin/operacoes.html`) e o **Plano - Dashboard Tráfego Pago (Central)** da Fenice (v2, Sobral+Hormozi, ainda em plano).
> **Para que serve:** reaproveitar implementação real em vez de reescrever do zero. O Plano da Central é mais avançado na **camada de lucro** (margem `m`, lucro pós-ads, Plantão); o cockpit Starken já tem **estrutura, criativos, grading e período** rodando. Este doc cruza os dois.
> **Status:** referência de implementação · aguardando decisão do Juan sobre o que portar. (Cópia local; para mover ao `00-Central` da Fenice, confirmar — Drive compartilhado.)

---

## 0. TL;DR

- O cockpit Starken **já entrega** ~70% da **Camada 3 (card), Camada 4 (drill) e período** do Plano — em JS vanilla, fácil de portar.
- O Plano da Central **ganha** do cockpit em 1 ponto que muda o produto: o **herói é Lucro pós-ads em R$** (precisa da margem `m`), não o ROAS. Isso o cockpit **não** computa hoje.
- O cockpit **ganha** do Plano em coisas que o Plano nem listou e já estão prontas: **drill por conjunto E anúncio, criativos (imagem + vídeo) no formato real, grading A–F por nível, seletor de período com campanhas concluídas/desativadas que gastaram na janela.**
- **Divergência a reconciliar:** benchmark de ROAS. Cockpit Starken usa meta `3×`; o Plano (delivery BR) diz **🟢 começa em `5×`**. Ver §5.

---

## 1. O que JÁ está construído e validado (cockpit Starken)

Stack idêntica à pasta `dashboard/` da Fenice (Node http puro + HTML/JS vanilla, sem build) — porte é direto.

**Backend** (`server.mjs` · `fetchEstruturas`):
| Função | O que faz | Reuso na Central |
|---|---|---|
| `parseInsightsFull` | spend, impressões, reach, freq, clicks, link_clicks, CTR, CPM, CPC, **compras (omni_purchase), revenue, ROAS, CPA** | base da math layer |
| `parseCreative` | título, copy, descrição, CTA, link, **imagens (hash→URL alta) e vídeos (video_id→source mp4 + poster + reel IG)** | ranking de criativos do drill |
| `parseTargeting` | geo (raio/cidades), idade, gênero, dispositivo, posicionamentos, interesses | drill |
| `computeAdsetFlags` | selos das regras da skill (mobile-only, pixel+PURCHASE, otimização, posic. manual, **day-parting**, freq) | validação de estrutura |
| `fetchEstruturas` | campanha→conjuntos→anúncios aninhados + insights por nível, **período parametrizável** (date_preset/time_range), **campanhas inativas com gasto no período**, resolução de hashes de imagem (`adimages`) e vídeos (`?ids=`) | núcleo do `/api/dashboard` |

**Frontend** (`admin/operacoes.html` — toda a inteligência num bloco `META` + funções `grade*`/`verdict`/`northStar`):
- **Métrica norteadora por objetivo** (`northStar`): Vendas→ROAS · Reconhecimento→CPM/Freq · Tráfego→CPC/CTR.
- **Nota A–F por nível** (`gradeRoas/gradeCpc/gradeCpm/gradeCtr`) — carteira, campanha, conjunto e **no canto do criativo**.
- **Veredito de ação** (`verdict`): 🟢 Escalar · 🟡 Otimizar · 🔴 Revisar · 🔵 Aprendizado · ⚪ Aguardando · 📅 Programada · 🏁 Encerrada.
- **Funil** (impr→cliques→vendas com taxas) · **barra de pacing** de orçamento · **alerta de fadiga** (freq > 5).
- **Detecção de "programada"** (`nextDaypartWindow`/`nextDelivery`): calcula a próxima janela de day-parting.
- **Rollup** (`rollup`/`campIns`): consolida insights de conjuntos quando a campanha ABO não traz no nível campanha.
- **Seletor de período** (Vida útil/Diário/Semanal/Mensal/Personalizado) + **campanhas concluídas/desativadas que tiveram gasto na janela** (seção separada, totais consolidados).
- **Criativos no aspect ratio real** (9:16/1:1, sem corte) + **vídeo em lightbox central** (volume/fullscreen) + reels do IG.
- **Anúncios desativados ocultáveis** com botão por conjunto.

---

## 2. Mapa: peça construída → camada do Plano

| Camada do Plano - Dashboard Tráfego Pago (Central) | Já existe no cockpit? | Observação |
|---|---|---|
| **Tela 1 — Plantão de Hoje** (fila de ação) | ❌ não | maior gap; ver §3 |
| **Camada 2 — Carteira** (ROAS ponderado, saúde, ranking) | 🟡 parcial | cockpit tem totais consolidados + nota da carteira; falta **ROAS ponderado por investido** e ranking lado a lado |
| **Camada 3 — Card por cliente** (herói + semáforo + tendência) | 🟡 parcial | tem grade/veredito/KPIs; **herói é ROAS, não lucro**; falta sparkline 7d e tendência MoM |
| **Camada 4 — Drill** (funil %, heatmap, ranking criativo, diagnóstico) | 🟢 bom | funil ✅, diagnóstico CTR/CPM/CPC ✅, criativos ✅; falta **heatmap day-parting** e **ranking por lucro** (hoje por ROAS/CTR) |
| **Math layer** (BE-CPA, ROAS mín, lucro pós-ads, margem seg.) | ❌ não | precisa da margem `m`; ver §3 |
| **Benchmarks + semáforo composto** | 🟡 parcial | tem grading A–F e veredito, mas **thresholds diferentes** e semáforo **não-hierárquico**; ver §5 |
| **Seletor de período** | 🟢 pronto | portar direto |
| **Estados honestos** (sem conta / sem dado) | 🟢 pronto | "aguardando dados", "no_ad_account", etc. |

---

## 3. Gaps do Plano que o cockpit NÃO cobre (e a base reaproveitável)

1. **Lucro pós-ads em R$ (herói) + math layer** — *input bloqueante: margem `m` por cliente.*
   - Cockpit já tem `revenue`, `spend`, `purchases`, `CPA`, `ticket` (= revenue/purchases) em `parseInsightsFull`. Falta só aplicar `m`:
     `lucro = revenue×m − spend` · `BE_CPA = ticket×m` · `margem_seg = (BE_CPA − CPA)/BE_CPA` · `ROAS_min = 1/m`.
   - **Onde plugar:** ao lado de `parseInsightsFull`, ler `data/margens.json` e derivar. Trocar o `northStar` de ROAS → lucro pós-ads quando `m` existir (degradar pra ROAS com aviso "falta margem" quando não existir — estado honesto).
2. **Plantão de Hoje (fila de ação)** — não existe.
   - Reaproveita 100% do `verdict` + `computeAdsetFlags` + fadiga: basta varrer os clientes, gerar linhas `{cliente, problema, número, ação, R$ em jogo}` ordenadas por `severidade × investido`. É uma camada de agregação por cima do que já existe.
3. **Heatmap day-parting (dia×bloco por ROAS/CPA)** — não existe.
   - Precisa de insights com `breakdown=hourly_stats_aggregated_by_advertiser_time_zone`. O cockpit já lê o `adset_schedule` (janelas) — falta a chamada de breakdown.
4. **Ranking de criativos por LUCRO** — hoje o "🏆 melhor" é por ROAS/CTR.
   - Trocar o critério no `adsetBlock` (já calcula o melhor anúncio) pra `contribuição = revenue×m − spend`.
5. **CPA marginal (7d vs 7d anterior)** e **tendência/sparkline** — não existe; precisa de série temporal (2 janelas ou `time_increment`).

---

## 4. O que o cockpit traz ALÉM do Plano (já pronto, vale incorporar)

- **Drill por conjunto E anúncio** com KPIs por nível (o Plano fala em criativos, mas não detalha a árvore conjunto→anúncio).
- **Criativos resolvidos de verdade:** imagem em alta (`adimages`), **vídeo tocável** (`video_id`→`source`), reel do IG, asset customization Feed+Story — tudo no formato real.
- **Grading A–F visual por nível** (inclusive no canto do criativo) — leitura instantânea.
- **Campanhas concluídas/desativadas com gasto no período** — o Plano não previu; é essencial pra fechar mês honesto (campanha que rodou e foi pausada não some do consolidado).
- **Validação de estrutura via regras da skill** (selos de conformidade) — útil pra auditoria (War Room).

---

## 5. Divergências a reconciliar (decisão do Juan)

| Tema | Cockpit Starken (hoje) | Plano Central (delivery BR) | Recomendação |
|---|---|---|---|
| **Herói do card** | ROAS (norteadora) | **Lucro pós-ads em R$** | adotar o do Plano assim que `m` existir; ROAS vira coadjuvante |
| **🟢 ROAS** | meta `3×` (grade A ≥ 5×) | **🟢 > 5× · 🟡 3–5× · 🔴 < 3×** | usar os thresholds do Plano (delivery) na Central; manter 3× só onde não for delivery |
| **CPA** | valor absoluto | **% do ticket do próprio cliente** | adotar % do ticket (precisa de `m`/ticket) |
| **Semáforo** | grade A–F independente por métrica | **composto hierárquico** (ROAS manda; freq antecipa) | adotar o hierárquico do Plano |
| **SCALE/HOLD/KILL** | veredito por faixa de ROAS | por **margem de segurança do CPA** (≥50% / 20–50% / <20%) | adotar o do Plano (mais correto) |

> ⚠️ **ALERTA (regra CLAUDE.md Fenice):** pintar tudo por ROAS sem a margem `m` é o "verde enganoso" que o Plano alerta (Arena ROAS 6,9× = lucro ~R$41). O cockpit Starken **hoje cairia nessa armadilha**. Por isso a margem `m` é o input #1 antes de levar a camada de lucro pra produção.

---

## 6. Caminho técnico de reuso

- **Backend:** `services/relatorios/server.mjs` (token server-side, já chama Graph) → criar `/api/dashboard?period=` reaproveitando `fetchEstruturas` + `parse*` do cockpit (JS vanilla, copiável quase 1:1). Adicionar a derivação de lucro a partir de `data/margens.json`.
- **Frontend:** o cockpit é HTML/JS vanilla; a Central v2 é **React** (`apps/painel/src/screens/Dashboard.tsx`). **A lógica** (`northStar`, `grade*`, `verdict`, `rollup`, `funnel`, `nextDaypartWindow`) porta direto como funções puras; **só a renderização** vira componente React com o **DS terroso** (Terra `#B23A2E`, Caffè `#2A211C`, Avorio — zero azul/dourado, ao contrário do tema navy/amarelo do Starken).
- **Período + inativas:** portar a lógica de `time_range`/`date_preset` e o segundo fetch (insights de conta → estrutura por IDs das campanhas que gastaram). Já validado em produção Starken.

---

## 7. Próximos passos sugeridos

1. **[Juan · bloqueante]** coletar a **margem de contribuição `m`** de Suprema e Arena → `data/margens.json`. Sem isso, a camada de lucro (coração do produto) é chute.
2. Decidir **onde** roda a Central de Tráfego: dashboard vanilla Fenice (porte rápido, mesma stack) **ou** portal v2 React (`surface=performance`, esforço maior — preciso de acesso ao repo `Cerntral-fenicelab`).
3. Portar primeiro o que já é à prova de bala (período, drill, criativos, grading) e **camadar o lucro/Plantão por cima** quando `m` chegar.
4. Reconciliar os thresholds (§5) com `/pedro-sobral` + `/alex-hormozi` antes de cravar no produto.

---

*Referência cruzada (docs Fenice em `00-Central`): Plano - Dashboard Tráfego Pago (Central) · Runbook - Fase 2b · PRD - Sistema Central Fenice Lab (v1) · skill `trafego-pago`. Implementação-fonte: Central Starken `server.mjs::fetchEstruturas` + `admin/operacoes.html`.*
