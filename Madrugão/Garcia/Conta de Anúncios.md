# Madrugão Garcia — Conta de Anúncios

> Referência técnica de IDs e credenciais para uso em operações Meta Ads.

---

## IDs principais

| Recurso | ID | Notas |
|---|---|---|
| **Ad Account** | `910709251642787` | Nome interno: "Madrugão Garcia #1" |
| **Business Manager** | `2611947988865071` | "Madrugão Lanches I" (compartilhado entre unidades) |
| **Página Facebook** | `144478675721569` | Única page associada à conta |
| **Pixel / Dataset** | `2784591895216854` | Evento principal: `PURCHASE` |
| **Instagram User ID** | _a configurar_ | Não configurado no ad atual (Hamburger Day) — apenas FB delivery |

## Capacidades MCP nesta conta (status em 2026-05-28)

| Tool | Status |
|---|---|
| `ads_get_ad_accounts` | ✅ funciona |
| `ads_get_ad_entities` | ✅ funciona |
| `ads_create_campaign` / `ads_create_ad_set` / `ads_create_ad` | ✅ funciona |
| `ads_update_entity` / `ads_activate_entity` | ✅ funciona |
| `ads_get_ad_account_pages` | ✅ funciona |
| `ads_get_datasets` | ❌ rollout gradual — bloqueada |
| `ads_get_creatives` | ❌ rollout gradual — bloqueada |
| `ads_create_creative` | ❌ rollout gradual — bloqueada |
| `ads_get_ad_images` | ❌ rollout gradual — bloqueada |
| `ads_get_ad_account_custom_audiences` | ❌ rollout gradual — bloqueada |

### Workarounds em uso

- **Criativo via API**: usar `ads_create_ad` com `creative` inline (`object_story_spec` ou `asset_feed_spec`) — bypassa `ads_create_creative`.
- **Listar imagens**: impossível via MCP. Manual: Gerenciador → Biblioteca de Mídia → copiar hash de cada imagem.
- **Listar públicos salvos**: impossível via MCP. Manual: Gerenciador → Públicos → ler parâmetros do painel → reconstruir como `targeting` JSON.
- **Pixel ID**: passar manualmente. Encontrar em Gerenciador de Eventos.

---

## Moeda e mínimos

- **Currency:** BRL
- **Min daily budget:** `min_daily_budget_cents: 511` → R$ 5,11

---

## CTAs validados nesta conta

| CTA | Suporta OUTCOME_SALES + Dynamic Creative | Notas |
|---|---|---|
| `BUY_NOW` ("Comprar Agora") | ❌ Rejeitado pela Meta | Erro: "BUY_NOW is not supported in Dynamic Creative Ad Set" |
| `ORDER_NOW` ("Pedir Agora") | ✅ Validado | Usado em Hamburger Day. Semanticamente mais preciso para cardápio digital. |
| `SHOP_NOW` ("Comprar") | _não testado_ | Provável fallback para e-commerce |

---

*Última atualização: 2026-05-28*
