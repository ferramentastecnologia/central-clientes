# Briefing — Hamburger Day Madrugão Garcia (28/05/2026)

> Tags: #campanha #madrugão #garcia #hamburger-day #meta-ads #vendas

---

## Resumo executivo

Campanha tática de **1 dia** aproveitando o **Dia Mundial do Hambúrguer (28/05)** para gerar conversões diretas no cardápio digital da unidade Madrugão Garcia (Blumenau/SC). Orçamento curto (R$ 50) com foco em testar a tração da data + oferta combinada (lanches em dobro + 25% OFF + combos com desconto) no público hiperlocal já validado.

---

## Objetivos

| Tipo | Métrica | Meta sugerida |
|---|---|---|
| **Principal** | Conversões `PURCHASE` no cardápio digital (menudino) | Maximizar dentro do budget |
| **Secundário** | CTR ≥ 0.8% (sinal de relevância criativa) | ≥ 0.8% |
| **Secundário** | CPM dentro de R$ 15-40 (faixa food/delivery BR) | R$ 15-40 |
| **Anti-meta** | Não ter learning limited; gastar ≥ 90% do budget | Gasto ≥ R$ 45 |

---

## Público-alvo

Público salvo da unidade: **Madrugão Garcia #1**

- Bairro Garcia/Blumenau-SC, raio 5 km
- 3 exclusões hiperlocais (raios 2 km) — evita canibalização com outras unidades Madrugão
- Idade 18+ (Advantage+ ON, sugestão 18-55)
- Tamanho estimado: 72k – 84,7k pessoas

Detalhes em [[../../Públicos Salvos]].

---

## Oferta / Mecânica promocional

3 promoções empilhadas, válidas **somente em 28/05**:

1. 🔁 **LANCHES EM DOBRO** — compre 1, leve 2
2. 💥 **ATÉ 25% DE DESCONTO** em lanches selecionados
3. 🍔 **COMBOS COM DESCONTO**

Destino: cardápio digital `https://madrugaolanchesgarcia.menudino.com/`

---

## Estrutura na conta

```
Campanha [STARKEN][VENDAS][HAMBURGER_DAY][28/05]
  └── AdSet [CA][HAMBURGER_DAY][28/05]
        └── Ad [FEED+STORIES] HAMBURGER DAY 28/05
```

- **Objetivo:** OUTCOME_SALES
- **Otimização:** OFFSITE_CONVERSIONS para evento `PURCHASE` no pixel `2784591895216854`
- **Bid strategy:** LOWEST_COST_WITHOUT_CAP (CBO)
- **Budget:** Lifetime R$ 50 a nível campanha (CBO)
- **Schedule:** Start = ativação manual; Stop = 28/05/2026 23:30 BRT
- **Buying type:** AUCTION
- **Destination:** WEBSITE
- **Conversion domain:** `madrugaolanchesgarcia.menudino.com`

IDs concretos em [[01 - Setup da Operação]].

---

## Criativos

Asset customization (Dynamic Creative): mesmo ad serve 2 formatos por placement.

| Placement | Formato | Arquivo | Hash |
|---|---|---|---|
| Feed FB/IG + Reels stream + Marketplace + AN + Messenger Home | **4:5** (1254×1254) | `4.5 - feed 28-05.jpeg` | `508401ac22f65cd0007175e9a6d47a29` |
| Stories FB + Stories IG + Reels IG + Reels FB + Messenger Stories | **9:16** (900×1600) | `9.16 - Stories 28-05.jpeg` | `5042d00984a7094f667bb3f252d22da4` |

Imagens originais armazenadas em `Madrugão/` no vault root.

---

## Copy

### Title (headline)
**Lanches em Dobro Hoje! 🔥**

### Description (subtitle)
**Lanches em dobro e até 25% OFF**

### Body (primary text) — com espaçamento entre parágrafos

```
🍔🔥 ATENÇÃO: O DIA MUNDIAL DO HAMBÚRGUER NO MADRUGÃO VAI SER INSANO 🔥🍔

HOJE é o Dia Mundial do Hambúrguer e preparamos promoções absurdas pra você celebrar com muito sabor:

🔁 LANCHES EM DOBRO — comprou um, o segundo sai por conta da casa!
💥 ATÉ 25% DE DESCONTO nos lanches selecionados
🍔 COMBOS COM DESCONTO imperdíveis pra chamar a galera

Mais sabor, mais Madrugão e uma oportunidade que você não vai querer perder. Porque hambúrguer bom a gente divide… ou pede dois mesmo. 👊🔥

Então já faz o seguinte:
📅 BORA HOJE
🚨 CHAMA A GALERA
🍔 E SE PREPARA

⚠️ Promoções válidas somente hoje, 28/05. Não deixa pra depois!

📍 Nossas unidades:

Madrugão Centro
R. São Paulo, 565

Madrugão Garcia
R. Amazonas, 2617

Madrugão Fortaleza
R. Francisco Vahldieck, 1100
```

### CTA
**Pedir Agora** (`ORDER_NOW`) — `BUY_NOW` foi rejeitado pela Meta para OUTCOME_SALES + Dynamic Creative; `ORDER_NOW` é tecnicamente mais preciso para cardápio digital.

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Pixel sem volume de `PURCHASE` recente → learning limited | Média | Se aparecer no monitoramento, trocar otimização para `LANDING_PAGE_VIEWS` (evento mais frequente) |
| Budget pequeno (R$ 50) + janela curta (~10h) → entrega lenta | Média | Monitorar gasto a cada 2h. Se travar, considerar aumentar |
| Ad sem `instagram_user_id` → não entrega em superfícies IG | Confirmado | Reduz potencial ~40%. Adicionar conta IG na próxima rodada |
| Copy menciona 3 unidades + link só Garcia → confusão pra clientes Centro/Fortaleza | Baixa (geo exclui as outras) | Aceita — geo targeting filtra fisicamente |

---

## Links relacionados

- Operação executada: [[01 - Setup da Operação]]
- Monitoramento: [[02 - Monitoramento em Tempo Real]]
- Postmortem: [[03 - Postmortem]]
- Conta: [[../../Conta de Anúncios]]
- Público: [[../../Públicos Salvos]]
- Unidade: [[../../00 - Visão Geral]]

---

*Briefing escrito em: 2026-05-28 13:15 BRT*
