---
name: trafego-pago
description: Skill completa para operação de tráfego pago Meta Ads dos clientes da Fenice Lab e Starken Tecnologia. Cobre criação de campanhas, regras obrigatórias, day-parting, workarounds do MCP, monitoramento, geração de relatórios PDF/PNG e comunicação profissional. Inclui consultoria OBRIGATÓRIA de Pedro Sobral (estratégia tática BR) e Alex Hormozi (math + oferta) em momentos-chave do fluxo. Use sempre que o usuário pedir para criar/editar/analisar campanhas, gerar relatórios ou trabalhar performance de qualquer cliente.
---

# 🎯 Tráfego Pago — Operação Fenice Lab / Starken Tecnologia

> Esta skill consolida o conhecimento operacional construído em conjunto entre Juan (Fenice Lab) e o agente. É a fonte da verdade para qualquer ação de tráfego pago.

---

## 0. Visão Geral

A operação tem **DUAS agências** assinando relatórios e atendendo clientes:

| Agência | Clientes atuais |
|---|---|
| **⚡ Starken Tecnologia Ltda** | Hamburgueria Feio · Academia São Pedro · Madrugão (Centro, Garcia, Fortaleza) |
| **🔥 Fenice Lab** | Arena Gourmet · Suprema Pizza · Oca Restaurante · Império do Sabor |

> ⚠️ O prefixo `[STARKEN]` em nomes de campanha é **convenção do gestor de tráfego**, não indica a agência. Ex: Arena tem `[STARKEN][...]` mas é assinada por Fenice Lab.

Detalhes: ver memória [[reference-agencies-clients]].

---

## 1. Setup Inicial — Antes de qualquer ação

### Passo 1: Identificar conta MCP-enabled

Sempre que o usuário mencionar um cliente, verificar:

1. **Ad Account ID** está no master Madrugão / pasta do cliente?
2. **MCP status** — verificar via `ads_get_ad_account_pages` ou `ads_get_ad_entities`. Se retornar `is_ads_mcp_enabled: false` → operação manual via Gerenciador

### Contas validadas como MCP-enabled

| Cliente | Account ID | Page ID | Pixel |
|---|---|---|---|
| Hamburgueria Feio | `1002920447256042` | `101076538404413` | `446444010584354` |
| Madrugão Centro | `317032009743632` | `861711940599446` | `880561603819009` |
| Madrugão Garcia | `910709251642787` | `144478675721569` | `2784591895216854` |
| Suprema Pizza | `25139920355667016` | `833137869890801` | `1478660663225256` |
| Academia São Pedro | `598925851864085` | — | — |
| cotafácil | `568096382651495` | `537121479479094` | — |

### Contas BLOQUEADAS no rollout da Meta

- Arena Gourmet (`319635973841218`) — todas operações manuais
- Inovar Proteção Veicular (`983666630679002`) — todas operações manuais

Tools sempre bloqueadas em algumas contas (workaround obrigatório):
- `ads_get_creatives`, `ads_get_ad_images`, `ads_get_ad_videos`, `ads_get_datasets`, `ads_get_ad_account_custom_audiences`

---

## 2. Regras OBRIGATÓRIAS de campanhas de vendas

Aplicar SEMPRE para `OUTCOME_SALES` em qualquer cliente — sem exceção.

### 2.1 Dispositivos — Mobile Only

```json
"targeting": {
  ...,
  "device_platforms": ["mobile"]
}
```

- ❌ Desktop NUNCA
- ❌ "Somente Wi-Fi" NUNCA

**Por quê:** clientes vendem via cardápio digital, consumo é mobile. Desktop CPM caro e converte menos.

### 2.2 Multi-advertiser — OFF em DOIS níveis

⚠️ Existe checkbox em **dois lugares no Gerenciador**:

1. **Nível do adset** — controlado via API: `multi_advertiser_enabled: false`
2. **Nível do anúncio** — vem MARCADO por default no Gerenciador, mesmo quando criado via API. NÃO dá pra controlar 100% via API.

**Regra operacional:** sempre que criar um ad via API, AVISAR o usuário pra abrir no Gerenciador e desmarcar o checkbox "Anúncios com vários anunciantes" no nível ad antes de ativar.

**Por quê:** evita que outros anúncios aparecem junto ao do cliente. Protege identidade e tira o foco da venda.

### 2.3 CTA — ORDER_NOW

- ✅ Use `ORDER_NOW` ("Pedir Agora") para cardápio digital
- ❌ `BUY_NOW` é REJEITADO em Dynamic Creative + OUTCOME_SALES (erro 1885396)

### 2.4 Otimização

```json
"optimization_goal": "OFFSITE_CONVERSIONS",
"promoted_object": {"pixel_id": "<PIXEL>", "custom_event_type": "PURCHASE"},
"destination_type": "WEBSITE",
"billing_event": "IMPRESSIONS"
```

E no ad: `conversion_domain: "<dominio_cardapio>"`

### 2.5 Posicionamento — Default da Meta (com exceções)

**Default geral:** deixar Advantage+ Placements (não forçar manual).

**Exceção Madrugão:** posicionamento manual obrigatório (ver memória [[project-madrugao-campaign-rules]]):
```json
"publisher_platforms": ["facebook", "instagram", "threads"],
"facebook_positions": ["feed", "profile_feed", "marketplace", "story", "facebook_reels"],
"instagram_positions": ["stream", "profile_feed", "explore_home", "story", "reels"]
```
> Threads: só adicionar `"threads"` em publisher_platforms — sem `threads_positions`.
> Atenção: Instagram Feed = `"stream"` na API (não `"feed"`).

### 2.6 Naming convention

```
[STARKEN|CLIENTE][VENDAS|RECO|TRAFEGO][CONTEXTO][DATA?]
```

Exemplos validados:
- `[STARKEN][VENDAS][HAMBURGER_DAY][28/05]`
- `[SUPREMA PIZZA][VENDAS][FOOD PORN][29-31/05]`
- `[STARKEN][RECO][28/05][01]`

---

## 3. Day-Parting (programação de horários)

### 3.1 Funciona COM CBO! (descoberta importante)

Antes acreditávamos que precisava ser ABO. **Não.** Para CBO + day-parting, precisa:

## ✅ DAY-PARTING — A FÓRMULA QUE FUNCIONA: ABO (2026-05-29)

### A descoberta definitiva (Juan, 2026-05-29)

**Day-parting via API funciona com ABO (Orçamento no nível do conjunto de anúncios), NÃO com CBO.**

A combinação CBO + day-parting exige `is_using_l3_schedule: true` que a API expõe mas não aplica de verdade — sempre cai em "Veicular o tempo todo" no Gerenciador.

**Solução real:** usar ABO. Quando o budget está no adset (`lifetime_budget` no adset, sem `campaign_lifetime_budget` na campanha), a Meta libera o day-parting nativamente — `pacing_type: ["day_parting"]` + `adset_schedule` funcionam 100% via API. Confirmado visualmente no Gerenciador.

### Fórmula validada — DAY-PARTING via ABO

```json
// PASSO 1: ads_create_campaign — SEM budget na campanha
{
  "objective": "OUTCOME_SALES",
  "buying_type": "AUCTION",
  "special_ad_categories": "[]"
  // ❌ NÃO passar: campaign_lifetime_budget, campaign_daily_budget, campaign_bid_strategy
  // ❌ NÃO passar: is_using_l3_schedule (não precisa em ABO)
}

// PASSO 2: ads_create_ad_set — com budget próprio + day-parting
{
  "campaign_id": "<NOVO_ID>",
  "ad_set_name": "...",
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP",      // ← no adset porque é ABO
  "lifetime_budget": 9000,                          // ← budget aqui (em centavos)
  "promoted_object": {"pixel_id": "...", "custom_event_type": "PURCHASE"},
  "destination_type": "WEBSITE",
  "end_time": "2026-05-31T23:00:00-03:00",         // ← obrigatório com lifetime_budget
  "pacing_type": ["day_parting"],                   // ← day-parting funciona ✅
  "adset_schedule": [
    {"days": [5], "start_minute": 1020, "end_minute": 1380, "timezone_type": "USER"},
    {"days": [6], "start_minute": 1020, "end_minute": 1380, "timezone_type": "USER"},
    {"days": [0], "start_minute": 1020, "end_minute": 1380, "timezone_type": "USER"}
  ],
  "targeting": {"geo_locations": {...}, "device_platforms": ["mobile"]},
  "multi_advertiser_enabled": false
}

// PASSO 3: ads_create_ad — normal
```

### Trade-off ABO vs CBO

| Aspecto | CBO | ABO |
|---|---|---|
| Day-parting via API | ❌ Falso positivo | ✅ Funciona |
| Otimização de budget entre adsets | ✅ Meta distribui auto | ❌ Manual por adset |
| Ideal para | Múltiplos adsets sem horário | Campanhas curtas com horário |

Para campanhas de pico de delivery (horário concentrado), **ABO é a escolha certa** — Meta otimiza dentro da janela de horários igualzinho.

### Status histórico (apenas referência)

Tentativas via CBO + `is_using_l3_schedule`:
- ❌ V1: `120246479527330052` — apenas spec aceito, "Veicular o tempo todo"
- ❌ V2: `120246479809540052` — mesmo problema mesmo com start_time
- ✅ V3 (ABO): `120246481859170052` — funciona, confirmado visualmente

Validado em produção 2026-05-29 (Suprema Pizza FOOD PORN ABO).

**No adset:**
```json
"pacing_type": ["day_parting"],
"adset_schedule": [
  {"days": [5], "start_minute": 1020, "end_minute": 1320, "timezone_type": "USER"},
  {"days": [6], "start_minute": 1020, "end_minute": 1320, "timezone_type": "USER"},
  {"days": [0], "start_minute": 1020, "end_minute": 1320, "timezone_type": "USER"}
]
```

### 3.2 Cheatsheet dias da semana

| Valor | Dia |
|---|---|
| 0 | Domingo |
| 1 | Segunda |
| 2 | Terça |
| 3 | Quarta |
| 4 | Quinta |
| 5 | Sexta |
| 6 | Sábado |

### 3.3 Cheatsheet minutos do dia

| Hora | Min |
|---|---|
| 00h | 0 |
| 06h | 360 |
| 12h | 720 |
| 17h | 1020 |
| 18h | 1080 |
| 19h | 1140 |
| 20h | 1200 |
| 21h | 1260 |
| 22h | 1320 |
| 23h | 1380 |
| 24h | 1440 |

### 3.4 Timezone

- `"USER"` — fuso do quem vê o anúncio (recomendado pra delivery local)
- `"ADVERTISER"` — fuso do anunciante (BRT)

---

## 4. Workarounds do MCP Meta

### 4.1 Quando `ads_create_creative` está bloqueada
Use `ads_create_ad` com `creative` inline:
```json
"creative": {
  "object_story_spec": {
    "page_id": "<PAGE>",
    "link_data": { "link": "...", "image_hash": "...", "message": "..." }
  }
}
```

### 4.2 Quando `ads_get_ad_images` está bloqueada
Usuário precisa subir imagens na Biblioteca de Mídia manualmente e copiar o `image_hash` do Gerenciador. Não tem como puxar lista via API.

### 4.3 Quando `ads_get_creatives` está bloqueada e quer reusar criativo
Usar `source_ad_id` no `ads_create_ad` — copia o creative do ad original:
```json
{
  "creative": {"creative_id": "<ID>"},
  "source_ad_id": "<AD_ORIGINAL>"
}
```

### 4.4 `source_adset_id` NÃO copia targeting confiavelmente
Sempre que duplicar uma campanha, **revisar targeting no Gerenciador depois**. O response da API mostra apenas o placeholder que você enviou — o targeting do original PODE ou não ter sido aplicado.

### 4.5 Asset customization (Feed + Stories no mesmo ad) — Dynamic Creative

```json
"asset_feed_spec": {
  "images": [
    {"hash": "FEED_HASH", "adlabels": [{"name": "feed_image"}]},
    {"hash": "STORIES_HASH", "adlabels": [{"name": "story_image"}]}
  ],
  "bodies": [{"text": "..."}],
  "titles": [{"text": "..."}],
  "descriptions": [{"text": "..."}],
  "link_urls": [{"website_url": "..."}],
  "call_to_action_types": ["ORDER_NOW"],
  "ad_formats": ["SINGLE_IMAGE"],
  "asset_customization_rules": [
    {
      "customization_spec": {"publisher_platforms": ["facebook","instagram","audience_network","messenger"]},
      "image_label": {"name": "feed_image"}
    },
    {
      "customization_spec": {
        "publisher_platforms": ["facebook","instagram","messenger"],
        "facebook_positions": ["story","facebook_reels"],
        "instagram_positions": ["story","reels"],
        "messenger_positions": ["story"]
      },
      "image_label": {"name": "story_image"}
    }
  ]
}
```

> ⚠️ Em asset_feed_spec, `BUY_NOW` é rejeitado pra OUTCOME_SALES. Use `ORDER_NOW`.

### 4.6 Advantage+ Audience + age_max < 65 = erro

Se quiser hard cap de idade abaixo de 65, NÃO ative `targeting_automation.advantage_audience: 1`. Caso contrário, omita `age_max` e deixe só `age_min`.

### 4.7 Substituir título/descrição em ad que usa post existente

Atualizar via `ads_update_entity` com creative inline contendo `object_story_spec.video_data` ou `link_data` com `title` e `link_description`. Isso cria um novo dark post (perde engagement do post original) mas adiciona headline/description.

---

## 5. Geração de Título e Descrição (automática)

⚠️ **CRÍTICO — checklist obrigatório ao criar/duplicar QUALQUER ad:**
- [ ] Texto principal (body)
- [ ] **Título** (max 40 chars) — gerado da copy
- [ ] **Descrição** (max 30 chars) — gerada da copy
- [ ] CTA = ORDER_NOW
- [ ] Multi-advertiser desmarcado nos 2 níveis

Esquecer título/descrição = ad fica sem inventory em Reels/Stories e perde CTR.

Quando o Gerenciador (ou ad spec) pedir Título e Descrição:

### Não deixar vazio e não inventar tema novo.

**Ler a copy (body/message) do ad** e gerar:

- **Título** (max ~40 chars, ideal 25-30): condensar o hook principal da copy. Pode ser pergunta, promessa ou tensão.
- **Descrição** (max ~30 chars): reforço do benefício, urgência ou prova.

### Exemplo
**Copy:** "Nutella derretendo, morangos frescos e borda crocante… Essa combinação não deveria ser permitida. Mas a gente fez mesmo assim — e você vai agradecer depois. Pizza doce da Suprema: porque todo dia é um bom dia pra isso."

**Sugestões:**
- Título: `Nutella + Morango. Proibido perder 🍫🍓`
- Descrição: `Peça sua pizza doce agora!`

---

## 5.5 Renovação mensal de campanhas com lifetime budget

⚠️ **Regra crítica estabelecida em 2026-06-01 (Juan):**

Quando renovar `lifetime_budget` no início de cada mês:

```
NOVO lifetime_budget = GASTO_TOTAL_HISTORICO + BUDGET_DO_NOVO_MES
```

Sem somar o histórico, o novo lifetime seria menor que o já gasto e a campanha NÃO rodaria.

### Passo a passo

1. **Puxar 2 números** via `ads_get_ad_entities`:
   - `date_preset=maximum` → gasto total desde o início (`amount_spent`)
   - `date_preset=last_month` → gasto no mês anterior + ROAS de referência

2. **Decidir o budget do novo mês** baseado em performance:
   - Manter (ROAS estável)
   - Subir 20-30% (ROAS forte, escalar)
   - Reduzir (ROAS fraco)

3. **Calcular**: `gasto_historico + budget_novo_mes` → arredondar pra cima

4. **Aplicar no Gerenciador**:
   - CBO → editar campanha (lifetime_budget + stop_time)
   - ABO → editar cada adset (lifetime_budget + end_time no adset)

5. **Documentar** em `Operacao Mensal/AAAA-MM Renovacao/` com tabela ANTES x DEPOIS + justificativa

### Exemplo

Hamburgueria Feio · `[STARKEN][VENDAS][01]` (2026-06):
- Lifetime atual: R$ 8.000
- Gasto histórico: R$ 7.999,70 (99.9%)
- Gasto maio: R$ 1.548,98 · ROAS 5,74×
- Decisão: manter R$ 1.500 pro mês
- Novo lifetime: 7.999,70 + 1.500 = R$ 9.499,70 → arredondar **R$ 9.500**
- Novo stop_time: 30/06/2026 23h59 BRT

### Quando NÃO aplica

- Campanhas com `daily_budget` → basta estender stop_time
- Campanhas perpétuas (sem stop_time) → só monitorar pacing

Ver memória [[project-renovacao-mensal-lifetime]] e doc operacional em `Operacao Mensal/`.

## 6. Templates de Campanha (referência rápida)

### 6.1 Template "Vendas Cardápio Digital" (padrão)

```json
// Campaign
{
  "objective": "OUTCOME_SALES",
  "buying_type": "AUCTION",
  "campaign_lifetime_budget": <CENTAVOS>,
  "campaign_bid_strategy": "LOWEST_COST_WITHOUT_CAP",
  "campaign_stop_time": "<ISO_BRT>",
  "is_using_l3_schedule": <true se for usar day-parting>,
  "special_ad_categories": "[]"
}

// AdSet
{
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "promoted_object": {"pixel_id": "<PIXEL>", "custom_event_type": "PURCHASE"},
  "destination_type": "WEBSITE",
  "end_time": "<ISO_BRT>",
  "targeting": {
    "geo_locations": {...},
    "device_platforms": ["mobile"],
    "age_min": 18
    // não setar age_max se Advantage+ ativo
  },
  "multi_advertiser_enabled": false,
  // day-parting opcional:
  "pacing_type": ["day_parting"],
  "adset_schedule": [...]
}

// Ad
{
  "creative": {"creative_id": "<ID>"} || {"object_story_spec": {...}},
  "conversion_domain": "<dominio>"
}
```

### 6.2 Template "Duplicar campanha existente"

1. Puxar source: `ads_get_ad_entities` filtrando por campaign_id
2. `ads_create_campaign` com mesmos parâmetros (objetivo, bid_strategy, buying_type) + budget/datas novos
3. `ads_create_ad_set` com `source_adset_id` da original (mas SEMPRE revisar targeting no Gerenciador depois)
4. `ads_create_ad` com `source_ad_id` da original

### 6.3 Template "Asset customization Feed + Stories"

Ver seção 4.5.

---

## 7. Monitoramento e Dashboards

### 7.1 Dashboard local

Localização: `dashboard/` na raiz do vault.

Arquivos principais:
- `index.html` — dashboard cross-client
- `<cliente>.html` — dashboard por cliente (ex: `suprema.html`)
- `<cliente>-report.html` — relatório PDF (ex: `arena-report.html`, `feio-report.html`)
- `data/snapshot.json` — dados consolidados (atualizado a cada check)
- `data/<cliente>.json` — dados por cliente
- `server.mjs` — servidor Node (porta 3000) com aliases pra `Clientes/<nome>/`

### 7.2 Aliases do servidor

```
/clientes/feio/* → Clientes/Hamburgueria Feio/
/clientes/centro/* → Clientes/Madrugão/Centro/
/clientes/garcia/* → Clientes/Madrugão/Garcia/
/clientes/fortaleza/* → Clientes/Madrugão/Fortaleza/
/clientes/suprema/* → Clientes/Suprema Pizza/
/clientes/academia/* → Clientes/Academia São Pedro/
/clientes/cotafacil/* → Clientes/cotafácil/
/clientes/arena/* → Clientes/Arena Gourmet/
```

Adicionar novos clientes em `server.mjs` na constante `CLIENT_ALIASES`.

### 7.3 Como iniciar o servidor

```bash
cd dashboard
node server.mjs
```

Acesso: `http://localhost:3000`

### 7.4 Monitoramento via cron cloud

Para campanhas críticas, usar skill `/schedule` (cron cloud) com prompt de check periódico. Exemplo:

```
*/30 * * * * — verificar campanha X no MCP, comparar com hora anterior,
alertar se CTR < 0.5% ou gasto travado
```

### 7.5 Métricas importantes a puxar

Account level (total do dia):
```python
fields = ["impressions", "reach", "clicks", "actions:link_click",
          "actions:omni_purchase", "amount_spent", "purchase_roas"]
date_preset = "today" | "yesterday" | "last_7d" | etc
```

Campaign level (breakdown):
```python
fields = ["id", "name", "objective", "effective_status", "impressions",
          "reach", "frequency", "clicks", "ctr", "cpm", "cpc",
          "amount_spent", "actions:omni_purchase", "actions:link_click",
          "purchase_roas", "results"]
# results retorna all_conversion_types com TODAS as etapas do funil
filtering = [{"field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"]}]
```

Para funil completo (LPV, ATC, Checkout, Purchase), pegar `results.all_conversion_types` e parsear os campos `(X (Web In Store Purchase))`, `(X (Add To Cart))` etc.

---

## 8. Relatórios PDF/PNG (1 página vertical)

### 8.1 Quando gerar

Sempre que o cliente fechar um período de campanha relevante (Hamburger Day, fim de mês, evento sazonal).

### 8.2 Template base

Usar `dashboard/arena-report.html` ou `dashboard/feio-report.html` como template. Substituir:

- Logo do cliente (`<img src="/clientes/<alias>/Materiais/logo/<cliente>-logo.png">`)
- Cor primária no gradient (Feio = vermelho `#ef4444`, Arena = roxo `#a855f7`, etc)
- Header com nome do cliente
- Banner faturamento gigante
- KPIs (Investimento, Compras, Ticket, CPA)
- Funil de conversão
- Tabela ranking campanhas (5)
- Insights (3-4 pontos)
- Footer com agência (Starken ⚡ ou Fenice Lab 🔥)

### 8.3 Geração via Chrome headless

```powershell
$pdf = "Clientes/<cliente>/Relatorio-Performance-<data>.pdf";
$png = "Clientes/<cliente>/Relatorio-Performance-<data>.png";
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless --disable-gpu --no-sandbox `
  --no-pdf-header-footer --virtual-time-budget=8000 `
  "--print-to-pdf=$pdf" "http://localhost:3000/<cliente>-report.html";

& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless --disable-gpu --no-sandbox --hide-scrollbars `
  --window-size=794,1738 --virtual-time-budget=8000 `
  "--screenshot=$png" "http://localhost:3000/<cliente>-report.html";
```

### 8.4 Page size

- A4 estendido: `@page { size: 210mm 410mm; margin: 0; }` (genérico)
- Conteúdo extenso: `460mm` (Feio tem funil de 8 etapas + 5 campanhas)

Ajustar até PDF dar **1 página** e PNG não tiver espaço preto excessivo no final.

### 8.5 Aliases do servidor são essenciais

Antes de criar o relatório, garantir que o cliente tem alias em `server.mjs`. Se não tem, adicionar e reiniciar o servidor.

Logos do cliente devem estar em `Clientes/<nome>/Materiais/logo/<cliente>-logo.png` (nome padrão).

---

## 9. Comunicação Profissional com Cliente

Ver memória [[project-communication-standard]].

### 9.1 Padrão de mensagem WhatsApp

```
*RELATÓRIO DE PERFORMANCE — DD/MM/AAAA*
[Contexto: Dia X, Período Y, etc]

Bom dia. Segue o fechamento da operação de mídia do dia DD/MM, com os
resultados consolidados das campanhas ativas no período.

*Resumo dos resultados:*

• Faturamento rastreado: *R$ XXX,XX*
• Investimento total: R$ XXX,XX
• ROAS: *X,XX×*
• Vendas realizadas: *XX pedidos*
• Ticket médio: R$ XXX,XX
• CPA: R$ XX,XX

*Destaque do período:*

[Parágrafo formal com a campanha vencedora + recomendação]

*Funil de conversão:*

[Impressões → Alcance → Cliques → ATC → Checkout → PURCHASE]

Em anexo, o relatório completo contendo análise do funil, ranking
detalhado das campanhas e recomendações estratégicas para o próximo
ciclo.

À disposição para esclarecimentos.

Atenciosamente,
*Equipe [Starken Tecnologia | Fenice Lab]*
```

### 9.2 Princípios da linguagem

✅ **Use:** "Bom dia", "À disposição", "Atenciosamente", dados em negrito `*texto*`, tom técnico.

❌ **Evite:** "galera", "bora", "spoiler", "galinha dos ovos de ouro", "bombou", "explodiu", "insano", "kkk", abreviações.

### 9.3 Sequência de envio no grupo

1. Cola a mensagem (texto contextualiza)
2. Envia o **PNG** (preview visual)
3. Follow-up com o **PDF** (arquivo formal)

### 9.4 Salvar mensagens na pasta do cliente

`Clientes/<cliente>/Mensagem-WhatsApp-Relatorio.md` — 4 versões (completa, intermediária, resumida, estratégica).

---

## 10. Fluxo Operacional Padrão

### 10.1 Criação de campanha (do zero)

1. **Identificar cliente** e verificar se conta tem MCP ativo
2. **Coletar dados** do briefing: budget, período, público, criativos, link
3. 🇧🇷 **Consultar Pedro Sobral** (obrigatório se for cliente novo ou estrutura nova) — "Pedro, vou criar campanha X com budget Y. Histórico Z. Qual estrutura você recomenda?"
4. **Criar campanha** com configurações da seção 2 + day-parting (3) se aplicável
5. **Criar adset** com targeting + regras obrigatórias
6. **Criar ad** com creative + título/descrição gerados da copy
7. **PAUSAR** todas as entidades — nunca ativar direto
8. 🇺🇸 **Consultar Hormozi** (obrigatório se budget > R$500) — "Hormozi, olha essa estrutura. Math fecha? Algo na oferta que mudaria?"
9. **Avisar usuário** com link do Gerenciador pra revisar (especialmente targeting do adset, que pode não ter sido copiado pelo source_adset_id) — inclua as recomendações dos clones
10. **Aguardar confirmação** explícita antes de ativar
11. **Ativar** as 3 entidades em paralelo: `ads_activate_entity` na campanha, adset e ad

### 10.2 Duplicar campanha existente

1. Puxar campanha source: `ads_get_ad_entities` filtrando por ID
2. Puxar adset(s) e ad(s) source: filtrando por campaign_id
3. Criar nova campanha com mesmos parâmetros + budget/datas novos
4. Criar adset com `source_adset_id` da original
5. Criar ad com `source_ad_id` da original
6. Aplicar regras obrigatórias (mobile-only, multi-advertiser off)
7. PAUSAR + avisar usuário pra revisar (especialmente targeting)

### 10.3 Monitoramento de campanha ativa

1. Iniciar dashboard local (`server.mjs`)
2. Configurar cron via `/schedule` se for crítica
3. Puxar métricas a cada N horas via MCP
4. Atualizar `dashboard/data/snapshot.json` com novos números
5. Atualizar documento Obsidian de monitoramento conforme avança
6. Alertar usuário se semáforo virar 🔴 (CTR < 0.5%, CPM > R$60, ou status WITH_ISSUES)
7. 🇧🇷 **Se gatilho disparar** (ROAS < 2x, CTR < 0.8%, freq > 3.5, gasto travado) → consultar Pedro Sobral antes de recomendar ação ao usuário

### 10.4 Fechamento de período + Relatório

1. Puxar dados finais com `date_preset: "yesterday"` (dia inteiro fechado)
2. Calcular receita (`ROAS × Spent`), retorno líquido, ticket médio
3. 🇧🇷🇺🇸 **Invocar Pedro Sobral + Hormozi EM PARALELO** (mesma mensagem, 2 chamadas Agent):
   - **Pedro:** "Analisa os dados desta tabela. Winners, losers e 3 ações práticas pro próximo ciclo."
   - **Hormozi:** "Math da operação: CPA × LTV × payback. Vale escalar? Pausar? Refazer oferta?"
4. Atualizar `dashboard/data/snapshot.json` com status `CLOSED`
5. Criar/atualizar `<cliente>-report.html` com novos dados — **incorporar insights de Pedro e Hormozi** na seção de Insights
6. Gerar PDF + PNG via Chrome headless (1 página vertical)
7. Criar/atualizar `Clientes/<cliente>/Mensagem-WhatsApp-Relatorio.md` com 4 versões profissionais (recomendações do Pedro entram na versão "Estratégica")
8. Criar postmortem no Obsidian (`🏁 Postmortem — <evento>.md`) com **análise dupla Pedro + Hormozi** documentada
9. Avisar usuário com tudo pronto pra envio

### 10.5 Desabilitar routine cloud após postmortem

Sempre que houver routine de monitoramento configurada pra período fechado, **lembrar de desabilitar** após o postmortem rodar — evita execuções repetidas e gastos desnecessários:

```
RemoteTrigger action="update" trigger_id="<ID>" body={"enabled": false}
```

---

## 11. Cheatsheet técnico (referência rápida)

### Códigos de evento pixel
- `PURCHASE` — compra finalizada
- `INITIATE_CHECKOUT` — checkout iniciado
- `ADD_TO_CART` — adição ao carrinho
- `VIEW_CONTENT` — visualização do produto
- `LANDING_PAGE_VIEW` — pageview do site
- `LEAD` — lead capturado

### CTA validados em OUTCOME_SALES
- `ORDER_NOW` ✅ Pedir Agora (recomendado pra cardápio)
- `SHOP_NOW` ✅ Comprar
- `LEARN_MORE` ✅ Saiba Mais
- `GET_OFFER` ✅ Obter Oferta
- `BUY_NOW` ❌ Rejeitado em Dynamic Creative + OUTCOME_SALES

### Optimization goals válidos por objetivo

OUTCOME_SALES: `OFFSITE_CONVERSIONS` (padrão), `VALUE`, `LANDING_PAGE_VIEWS`, `IMPRESSIONS`, `POST_ENGAGEMENT`, `REACH`, `LINK_CLICKS`, `CONVERSATIONS`

OUTCOME_AWARENESS: `REACH` (padrão), `IMPRESSIONS`, `AD_RECALL_LIFT`, `THRUPLAY`

OUTCOME_TRAFFIC: `LINK_CLICKS` (padrão), `LANDING_PAGE_VIEWS`, `OFFSITE_CONVERSIONS`

### Bid strategies
- `LOWEST_COST_WITHOUT_CAP` — auto bid (recomendado)
- `LOWEST_COST_WITH_BID_CAP` — precisa `bid_amount`
- `COST_CAP` — precisa `bid_amount`
- `LOWEST_COST_WITH_MIN_ROAS` — precisa `bid_constraints.roas_average_floor`

### Targeting JSON básico

```json
{
  "geo_locations": {
    "custom_locations": [{
      "latitude": -26.95, "longitude": -49.07,
      "radius": 5, "distance_unit": "kilometer", "country": "BR"
    }],
    "location_types": ["home", "recent"]
  },
  "excluded_geo_locations": {
    "custom_locations": [...]
  },
  "age_min": 18,
  "targeting_automation": {"advantage_audience": 1}
}
```

### Location types — OBRIGATÓRIO em delivery

A Meta tem 4 valores possíveis pra `geo_locations.location_types`. Em 2026 começou a restringir algumas combinações por privacidade — quando aparece no Gerenciador o alerta vermelho "Algumas opções de direcionamento por localização foram removidas", o default cai pra `["home"]` sozinho e o público diminui.

| Valor | Significado | Quando usar |
|---|---|---|
| `home` | Mora ali (residência declarada) | Default seguro |
| `recent` | Esteve ali nos últimos dias | + volume, captura em trânsito |
| `["home", "recent"]` | Mora OU esteve recentemente | ✅ **Padrão pra delivery local** |
| `travel_in` | Mora 200km+ longe, está visitando | Turismo (Oktoberfest, eventos) |

**Regra:** sempre passar `location_types: ["home", "recent"]` em campanhas de delivery (Suprema, Madrugão, Feio, Arena). Abre volume sem perder relevância (raio já filtra geograficamente). Validado em produção 2026-05-29 (Suprema Pizza V3).

### Saved audience via API — investigado em produção (2026-05-29)

**O endpoint Meta existe:** `GET https://graph.facebook.com/v25.0/act_<AD_ACCOUNT_ID>/saved_audiences` retorna lista completa de saved audiences com `id`, `name`, `targeting`, `description`.

**O conector MCP NÃO expõe esse endpoint:** não há tool `ads_get_saved_audiences` ou similar. As tools de audience cobrem apenas custom audiences (lista de pessoas), não saved audiences (combinação de targeting salva).

**Diferença crítica:**
- Saved audience = combinação salva de targeting (geo + idade + interesses) — o que o Gerenciador chama de "Usar um público salvo"
- Custom audience = lista de pessoas (visitantes do site, clientes, engajamento) — `ads_get_ad_account_custom_audiences` cobre apenas isso

### Como obter o saved_audience_id (3 caminhos do usuário)

**Caminho A — Da URL ao abrir o público no Gerenciador:**
```
https://adsmanager.facebook.com/.../audiences?...&selected_audience_ids=120XXXXXXXX...
```
Copia o número após `selected_audience_ids=` ou `audience_id=`.

**Caminho B — Detalhes do público no painel lateral:**
O painel à direita às vezes mostra o ID logo abaixo do nome.

**Caminho C — DevTools (sempre funciona):**
1. Gerenciador → Públicos (F12 → Network)
2. Filtro `saved_audience`, F5 recarrega
3. Chamada `act_XXX/saved_audiences` no XHR → Preview → JSON com todos os IDs + nomes

### Como aplicar o saved_audience_id

Via `ads_create_ad_set` ou `ads_update_entity`:
```json
{"saved_audience_id": "120XXXXXXX..."}
```

### Fallback — reconstruir via targeting JSON

Se o usuário não conseguir achar o ID, ler os parâmetros do público (geo, idade, interesses) e aplicar direto no campo `targeting`:
```json
{
  "geo_locations": {"custom_locations": [{"latitude": ..., "longitude": ..., "radius": 8, "distance_unit": "kilometer", "country": "BR"}]},
  "age_min": 18,
  "device_platforms": ["mobile"]
}
```

Funciona igual mas perde o nome simbólico do público salvo no Gerenciador.

### Regra operacional

Quando o briefing mencionar "usar público salvo X", o agente DEVE:
1. Pedir o `saved_audience_id` (caminhos A/B/C)
2. Se o usuário não conseguir, pedir os parâmetros (lat/lon/raio/idade) e reconstruir via targeting JSON

---

## 12. Memórias relacionadas (consultar quando aplicável)

- [[reference-agencies-clients]] — mapa Cliente → Agência (Starken ou Fenice Lab)
- [[project-sales-campaign-rules]] — regras OBRIGATÓRIAS pra campanhas de vendas
- [[project-madrugao-campaign-rules]] — regras específicas Madrugão (posicionamento manual)
- [[project-communication-standard]] — padrão profissional de mensagens com cliente
- [[reference-meta-ads-mcp]] — capacidades do MCP Meta Ads + workarounds de rollout
- [[project-clone-agents]] — agentes especialistas (Pedro Sobral, Hormozi, Schwartz, etc) — usar quando precisar de pitaco estratégico
- [[project-fenice-lab-vault]] — estrutura do vault Obsidian

---

## 13. Conselho consultivo permanente — Pedro Sobral & Alex Hormozi

Pedro Sobral e Alex Hormozi são **membros ativos do processo** — não opcionais. Eles trabalham em conjunto comigo (agente) em momentos-chave do fluxo. Cada decisão estratégica importante passa por pelo menos um dos dois.

### 13.1 Divisão de papéis

**🇧🇷 Pedro Sobral — o cérebro tático brasileiro**
- Especialista em tráfego pago Meta/Google no mercado BR
- Conhece comportamento de público brasileiro, CPMs locais, ROAS por segmento
- Analisa funil, identifica gargalo, recomenda ajustes
- Decisão final em: pausar/manter/escalar campanhas, estrutura de conta

**🇺🇸 Alex Hormozi — o cérebro estratégico de oferta e math**
- Especialista em Value Equation, Grand Slam Offer, math de unit economics
- Avalia se a OFERTA está vendendo ou se é o tráfego que precisa mudar
- Brutal honestidade com matemática (CAC × LTV, payback, margem)
- Decisão final em: subir budget agressivamente, redesenhar oferta, matar campanha

### 13.2 Momentos OBRIGATÓRIOS de consulta

Toda vez que rolar um desses gatilhos, invocar o(s) clone(s) ANTES de seguir:

| Gatilho | Quem consultar | O que pedir |
|---|---|---|
| **Análise pré-criação** de campanha de venda nova | Pedro Sobral | Pitaco sobre estrutura, público, budget |
| **ROAS < 2x** em campanha de vendas | Hormozi | Diagnóstico: oferta ou tráfego? |
| **ROAS > 5x** sustentado | Pedro Sobral | Estratégia de escala (quanto + como) |
| **CTR < 0.8%** persistente | Pedro Sobral | É criativo, público ou oferta? |
| **Frequência > 3.5** | Pedro Sobral | Saturação · injetar novo criativo? |
| **Postmortem fim de período** | AMBOS em paralelo | Pedro: o que aconteceu. Hormozi: o que repetir/matar |
| **Cliente quer dobrar investimento** | Hormozi | Math da escala — faz sentido? |
| **Cliente novo (briefing inicial)** | Pedro Sobral | Análise da conta histórica + recomendação inicial |
| **Campanha travou (gasto não progride)** | Pedro Sobral | Diagnóstico técnico (pixel, otimização, leilão) |
| **Definir CPA-meta para cliente novo** | Hormozi | Calcular pela margem · CPA < LTV/3 |

### 13.3 Como invocar

**Via slash command:**
```
/pedro-sobral analisa a campanha X da conta Y nos últimos 7 dias
/alex-hormozi vale a pena subir budget do cliente X com ROAS 4x?
```

**Via Agent tool (paralelizado):**
Para postmortem ou análise dupla, invocar AMBOS em paralelo (mesma mensagem com 2 chamadas Agent simultâneas).

**Via /reuniao:**
Para tema estratégico muito grande (ex: "rumos da operação"), invocar `/reuniao` que chama os 13 clones — Pedro e Hormozi vão dar suas perspectivas junto com Kahneman (vieses), Schwartz (copy), Steve Jobs (produto), etc.

### 13.4 Workflow padrão integrado

#### Para análise de fechamento (postmortem)
1. Puxar dados consolidados via MCP
2. Antes de gerar o relatório, **invocar Pedro Sobral em paralelo** com prompt:
   - "Como Pedro Sobral, analisa os dados desta tabela. Identifica winners, losers, e recomenda 3 ações práticas pro próximo ciclo."
3. **Invocar Hormozi em paralelo** com prompt:
   - "Como Alex Hormozi, faz a math: CPA × LTV × payback. Vale escalar? Pausar? Refazer oferta?"
4. Sintetizar as duas perspectivas no relatório/postmortem
5. Apresentar pro cliente já com a estratégia validada por ambos

#### Para criação de campanha nova
1. Coletar briefing do cliente
2. **Invocar Pedro Sobral** com contexto:
   - "Pedro, vou criar campanha de vendas pro cliente X com budget R$Y e duração Z. Histórico da conta: [dados]. Qual estrutura você recomenda?"
3. Aplicar a recomendação na criação via MCP
4. Após criar (PAUSED), **invocar Hormozi** com:
   - "Hormozi, olha essa estrutura criada. Se você fosse o cliente, ativaria? O que mudaria na oferta?"
5. Aplicar ajustes finais antes de pedir aprovação ao usuário

#### Para decisão de escala
1. Identificar campanha vencedora (ROAS > 5x sustentado)
2. **Invocar Hormozi** com:
   - "Hormozi, math da escala: campanha X tem ROAS R, gasto G, vendas V. Cliente pede pra dobrar budget. Qual a math? Quanto, quando, em que velocidade?"
3. Aplicar a recomendação (com ressalvas se houver)

### 13.5 Outros clones que entram em momentos específicos

| Cenário | Clone |
|---|---|
| Análise de copy do ad | **Eugene Schwartz** — Awareness Levels + Sophistication Levels |
| Cliente vai testar oferta nova | **Claude Hopkins** — reason-why advertising, sampling |
| Sequência de email pós-compra | **Frank Kern** — Results in Advance, story stacking |
| Análise de viés em decisão difícil | **Daniel Kahneman** — System 1 vs 2, planning fallacy |
| Cliente quer "lançamento" de evento | **Frank Kern** ou **Priscila Zillo** — processo comercial brasileiro |
| Decisão de risco grande (escalar 10×) | **Nassim Taleb** — antifragilidade, skin in the game |

### 13.6 Princípio do "pitaco antes de mexer"

> Antes de tomar qualquer decisão estratégica que envolva investimento > R$500 ou mudança estrutural da operação do cliente, o agente CONSULTA pelo menos um dos clones especialistas. Isso é regra, não recomendação.

A justificativa é simples: o agente sabe **executar** (criar campanha, puxar dados, gerar relatório). Os clones trazem **modelos mentais** que protegem contra erro estratégico.

---

## 14. Como evoluir essa skill

Sempre que descobrir algo novo (workaround, regra, template), atualizar:

1. **Memória específica** (`memory/project_*.md` ou `memory/reference_*.md`)
2. **Esta skill** — adicionar na seção apropriada
3. **MEMORY.md** index — atualizar pointer se for memória nova

Manter datas de descoberta e contexto ("Juan, 2026-MM-DD") pra rastreabilidade.

---

*Skill criada em: 2026-05-29 · Fenice Lab + Starken Tecnologia*
*Conhecimento construído em conjunto entre Juan e o agente, validado em produção.*
