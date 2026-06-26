# Madrugão Centro — Conta de Anúncios

> Referência técnica de IDs e credenciais para uso em operações Meta Ads.

---

## IDs principais

| Recurso | ID | Notas |
|---|---|---|
| **Ad Account** | `317032009743632` | Nome interno Meta: "Madrugão Nova" |
| **Business Manager** | `2611947988865071` | "Madrugão Lanches I" (compartilhado) |
| **Página Facebook** | `861711940599446` | "Madrugão Lanches I Centro" |
| **Pixel / Dataset** | `880561603819009` | Evento principal: `PURCHASE` |
| **Conversion domain** | `madrugaolanches.menudino.com` | |
| **Instagram User ID** | _a configurar_ | Não configurado ainda |

---

## AdSets de referência (pra source_adset_id em novas campanhas)

| AdSet | Campanha | ID | ROAS | Uso recomendado |
|---|---|---|---|---|
| [VENDAS][CARDAPIO][X-FRANGO] | STARKEN X-FRANGO | `120238153851640227` | 5,42x | Melhor referência de targeting |
| [VENDAS][CARDAPIO][X-FRANGO-DOBRO] | STARKEN X-FRANGO | `120236519627940227` | 5,42x | Alternativa |

> ⚠️ Lembrete: `source_adset_id` não copia targeting confiavelmente via API. Sempre aplicar targeting explicitamente via `ads_update_entity` após criar o adset.

---

## Capacidades MCP nesta conta (status em 2026-05-28)

Mesmas restrições da conta Garcia — ver [[../Garcia/Conta de Anúncios]] para lista completa.

| Tool crítica | Status |
|---|---|
| `ads_create_ad` com `asset_feed_spec` | ✅ funciona |
| `ads_get_ad_account_pages` | ✅ funciona |
| `ads_get_creatives` / `ads_get_ad_images` | ❌ rollout |
| `ads_get_datasets` | ❌ rollout |
| `ads_get_ad_account_custom_audiences` | ❌ rollout |

---

## Performance histórica (90 dias)

CPM base: **R$ 6,80 – 7,32** (campanhas de vendas)
ROAS médio top performers: **5,42x – 5,84x**

> Centro tem ROAS ~2x maior que Garcia nas mesmas campanhas de "dobro". Contexto: Centro de Blumenau tem maior densidade populacional e potencialmente maior intenção de compra delivery.

---

*Última atualização: 2026-05-28*
