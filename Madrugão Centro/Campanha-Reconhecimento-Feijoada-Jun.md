# Campanha · Reconhecimento Feijoada — Madrugão Centro (Junho/2026)

> Documentação da campanha de divulgação (awareness) criada via API/MCP.
> Status: **PAUSED** — aguardando setar público + desmarcar multi-advertiser + ativar.

## IDs
| Objeto | Nome | ID |
|---|---|---|
| Campanha | `[STARKEN][RECO][FEIJOADA][JUN]` | `120243076074720227` |
| Conjunto | `[CA][RECO][BLUMENAU][QUI-SEX-SAB]` | `120243077112520227` |
| Anúncio | `[AD][FEIJOADA][FEED+STORY][JUN]` | `120243077151520227` |

🔗 Ads Manager: https://www.facebook.com/adsmanager/manage/campaigns/edit?act=317032009743632&selected_campaign_ids=120243076074720227

## Conta
- Madrugão Centro (Madrugão Nova) · `act_317032009743632` · BRL · fuso America/Bahia (UTC-3)
- Página: `861711940599446` · IG: `@madrugao_centro` (`17841407105086962`)
- Pixel: **MadruCentro-usado** `880561603819009`

## Estrutura (ABO — budget no conjunto)
- **Objetivo:** Reconhecimento (OUTCOME_AWARENESS) · otimização **Alcance (REACH)**
- **Orçamento:** R$ 500 vitalício (no conjunto / ABO) — CBO desativado de propósito
- **Período:** 05/06 12h → **27/06 14h** (BRT) · 11 dias de veiculação
- **Day-parting:** Qui+Sex **9-14h** e **18-21h** · Sáb **9-14h** (timezone USER)
- **Controle de frequência:** CAP **3 impressões a cada 3 dias** (≈ recall de evento: ~3 toques Qui→Sáb, fecha no sábado da feijoada)
- **Posicionamento manual:** FB feed/story/facebook_reels · IG stream(feed)/story/reels (só feed/stories/reels)
- **Dispositivos:** mobile
- **Geo:** Blumenau, raio 10km · `location_types: [home, recent]` · 18+ — *(placeholder, ajustar o público real)*

## Anúncio
- **Asset customization:** FEED-FEIJOADA (4:5) no feed · STORIES-FEIJOADA (9:16) em stories/reels
- **CTA:** Saiba mais → https://www.madrugaolanches.com.br
- **Pixel:** atrelado a nível de anúncio (tracking_specs offsite_conversion · `880561603819009`)
- Hashes: feed `ef6022519f559550c915f61b07bd3a31` · story `1c00c102b4b24864bea579638dbfd677`

## Pendente antes de ativar
1. Setar o **público** real (substituir o placeholder Blumenau 10km)
2. **Desmarcar "Anúncios com vários anunciantes"** no nível do anúncio (Gerenciador — API não controla)
3. Revisar e **ativar** as 3 entidades

## Consultoria (Pedro Sobral)
- Frequência: usar Alvo/ciclo de 3 dias (~3 toques Qui→Sáb p/ recall do evento). Via API só dá o CAP (Limite) — setado 3/3d, que num público pequeno satura e entrega ≈ o alvo.
- **Monitorar CPM nas primeiras 48h** (day-parting concentrado + público pequeno pode subir CPM). Se disparar, abrir uma janela de horário pra aliviar o leilão.

---
*Criado em 2026-06-05 · via skill trafego-pago (Starken)*
