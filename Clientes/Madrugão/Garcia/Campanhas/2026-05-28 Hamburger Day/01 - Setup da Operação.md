# Setup da Operação — Hamburger Day Garcia (28/05/2026)

> Passo a passo executado para subir a campanha via Meta Ads MCP + Claude Code.
> Esta é a fonte da verdade técnica: IDs concretos, decisões tomadas, e workarounds aplicados.

---

## IDs criados nesta operação

| Entidade | Nome | ID | Status final |
|---|---|---|---|
| **Campanha** | `[STARKEN][VENDAS][HAMBURGER_DAY][28/05]` | `120245256118330611` | 🟢 ACTIVE |
| **AdSet** | `[CA][HAMBURGER_DAY][28/05]` | `120245256139920611` | 🟢 ACTIVE |
| **Ad** | `[FEED+STORIES] HAMBURGER DAY 28/05` | `120245257019810611` | 🟢 ACTIVE |
| Ad descartado (1ª iteração) | `[FEED] HAMBURGER DAY 28/05` | `120245256157810611` | 🗑️ DELETED |
| Ad descartado (1ª iteração) | `[STORIES] HAMBURGER DAY 28/05` | `120245256159210611` | 🗑️ DELETED |

🔗 **Link Gerenciador:** `/adsmanager/manage/campaigns/edit?act=910709251642787&selected_campaign_ids=120245256118330611`

---

## Cronologia da operação

### 1. Discovery (≈13:00 BRT)

**Inputs do cliente:**
- Conta: `910709251642787` (Madrugão Garcia)
- 2 hashes de imagens já uploadadas na biblioteca:
  - Feed 4:5 (1254×1254): `508401ac22f65cd0007175e9a6d47a29`
  - Stories 9:16 (900×1600): `5042d00984a7094f667bb3f252d22da4`
- Link destino: `https://madrugaolanchesgarcia.menudino.com/`
- CTA: "Comprar Agora"
- Pixel: manter ativo
- Budget: R$ 50 lifetime
- Stop: 28/05 23:30 BRT

**Descoberto via MCP:**
- Page ID: `144478675721569` (via `ads_get_ad_account_pages`)
- Estrutura padrão de adset de VENDAS no Garcia (via `ads_get_ad_entities` filtrando por campanha `120240374686670611`)

**Bloqueado por rollout Meta:**
- `ads_get_datasets` (não consegui pegar pixel ID) → cliente passou manualmente: `2784591895216854`
- `ads_get_ad_account_custom_audiences` (não consegui pegar saved_audience_id) → reconstruído via parâmetros do painel UI

### 2. Criação inicial (1ª iteração) — DESCARTADA

**Decisões iniciais:**
- Tentei criar creatives via `ads_create_creative` → ❌ rollout block
- Workaround: criar ads com `creative` inline via `object_story_spec`
- Criei 2 ads separados (Feed + Stories) com `object_story_spec` + `link_data` + image_hash de cada
- CTA: `BUY_NOW` (Comprar Agora)
- Conversion domain: `madrugaolanchesgarcia.menudino.com`

**Resultado:** ad criado com sucesso, mas com problemas no Gerenciador (cliente revisou):
- CTA aparecendo como "Desconhecido"
- Falta de headline + description
- Body sem espaçamento entre parágrafos
- Sem asset customization (cada ad só serve seu próprio placement)
- AdSet com targeting genérico (BR broad) — `source_adset_id` não copiou targeting da campanha de referência

### 3. Reconstrução (2ª iteração) — FINAL

**Mudanças decididas com cliente:**
- Consolidar em **1 ad com asset customization** (Dynamic Creative via `asset_feed_spec`) — mesmo ad serve Feed e Stories com imagens diferentes por placement
- Adicionar **headline + description**: "Lanches em Dobro Hoje! 🔥" e "Lanches em dobro e até 25% OFF"
- Espaçar parágrafos do body
- Trocar CTA `BUY_NOW` → `ORDER_NOW` (foi rejeitado pela Meta para Dynamic Creative + OUTCOME_SALES; ORDER_NOW = "Pedir Agora", semanticamente mais preciso pra cardápio)
- Reconstruir targeting do público "Madrugão Garcia #1" via JSON (lat/lon/raio/exclusões/idade) — workaround da tool bloqueada de saved audiences

**Ações executadas:**
1. `ads_update_entity` — Stories ad → `DELETED`
2. `ads_update_entity` — Feed ad → `DELETED`
3. `ads_create_ad` com `asset_feed_spec` completo (2 imagens com labels, customization_rules mapeando placements) → criado novo ad multi-placement
4. `ads_update_entity` no adset → targeting com `geo_locations.custom_locations` + `excluded_geo_locations.custom_locations` + `age_min: 18` + `advantage_audience: 1`

### 4. Ativação

Após revisão final do cliente no Gerenciador:

1. `ads_activate_entity` campanha → ACTIVE
2. `ads_activate_entity` adset → ACTIVE
3. `ads_activate_entity` ad → ACTIVE

**Horário de ativação:** 28/05/2026 ≈13:30 BRT (16:30 UTC)

---

## Decisões técnicas explicadas

### Por que CBO (não ABO)?
Meta recomenda CBO como default. Budget pequeno e janela curta — deixa o algoritmo distribuir entre placements automaticamente.

### Por que OFFSITE_CONVERSIONS + PURCHASE?
Espelha o que outras campanhas de VENDAS do Garcia já usam (campanha `120240374686670611`). Pixel `2784591895216854` está configurado pra rastrear PURCHASE no menudino.

**Risco:** se o pixel não tem volume suficiente de PURCHASE nos últimos 7 dias, a otimização vai estar em "learning limited". Plano B: trocar para `LANDING_PAGE_VIEWS` se aparecer no monitoramento.

### Por que `ORDER_NOW` no lugar de `BUY_NOW`?
A Meta retornou erro `1885396` em 2026-05-28:
> "Dynamic Creative Not Supported CallToAction Type: BUY_NOW is not supported for the objective OUTCOME_SALES in Dynamic Creative Ad Set."

`ORDER_NOW` ("Pedir Agora") foi aceito. É tecnicamente mais preciso pra cardápio digital de delivery.

### Por que `age_min: 18` sem `age_max`?
A Meta rejeitou `age_max: 55` com erro `1870189`:
> "Maximum age is too low for Advantage+ Audience: With ad sets that use Advantage+ audience, the maximum age audience control can't be lower than 65."

O public salvo "Madrugão Garcia #1" tem "18-55" como **sugestão** (não cap hard). Replicado fielmente: `age_min: 18` (hard) + Advantage+ ON (deixa o algoritmo cuidar do upper bound).

### Por que `asset_feed_spec` (Dynamic Creative) em vez de 2 ads?
Cliente pediu 1 ad com placements customizados (Feed 4:5 + Stories/Reels 9:16). `asset_feed_spec` com `asset_customization_rules` mapeia cada imagem aos placements certos.

**Trade-off:** Dynamic Creative restringe alguns CTAs (BUY_NOW rejeitado) e gera relatórios mais limitados, mas resolve o requisito de UX.

---

## Workarounds aplicados (catálogo)

| Limitação Meta MCP | Workaround |
|---|---|
| `ads_create_creative` bloqueado | `ads_create_ad` com `creative` inline (`object_story_spec` ou `asset_feed_spec`) |
| `ads_get_ad_account_custom_audiences` bloqueado | Reconstruir targeting via JSON a partir do painel UI |
| `ads_get_datasets` bloqueado | Pixel ID passado manualmente pelo cliente |
| `ads_get_creatives` / `ads_get_ad_images` bloqueado | Hashes vieram do cliente (copiados da biblioteca de mídia manualmente) |
| `source_adset_id` não copia targeting | Aplicar targeting explicitamente via `ads_update_entity` |
| Advantage+ rejeita `age_max < 65` | Omitir `age_max`, deixar só `age_min: 18` |
| Dynamic Creative rejeita `BUY_NOW` | Usar `ORDER_NOW` (semanticamente mais preciso) |

---

## Links

- Briefing: [[00 - Briefing]]
- Monitoramento ao vivo: [[02 - Monitoramento em Tempo Real]]
- Postmortem (a preencher): [[03 - Postmortem]]

---

*Setup documentado em: 2026-05-28 13:30 BRT*
