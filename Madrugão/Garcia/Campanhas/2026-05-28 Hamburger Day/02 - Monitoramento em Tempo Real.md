# Monitoramento em Tempo Real — Hamburger Day Garcia

> Acompanhamento de performance da campanha `120245256118330611` ao longo do dia 28/05/2026.
> Fonte primária: routine cloud `Hamburger Day Madrugão Garcia Monitor` (executando a cada 2h via cloud Anthropic).

---

## Configuração do monitoramento automatizado

| Campo | Valor |
|---|---|
| **Routine ID** | `trig_01RATWG5He45BEaCCCGVwfzN` |
| **Routine URL** | https://claude.ai/code/routines/trig_01RATWG5He45BEaCCCGVwfzN |
| **Cron** | `0 */2 * * *` (every 2h UTC) |
| **Environment** | `env_012beZW2Wm9LHJpavPQZrtPP` (Anthropic Cloud Default) |
| **Modelo** | `claude-sonnet-4-6` |
| **MCP conectado** | Meta Ads (`e816f4d8-3f44-41b7-8432-ac5922996ce3`) |
| **Janela de operação** | 28/05/2026 13:00 BRT — 29/05/2026 00:30 BRT |

### Critérios de semáforo

- 🟢 **VERDE**: entrega rolando, CPM R$15-40, CTR ≥ 0.8%, gasto progredindo (>0% nas últimas 2h)
- 🟡 **AMARELO**: CPM R$40-60, CTR 0.5-0.8%, OU gasto travado (sem evolução nas últimas 2h)
- 🔴 **VERMELHO**: CPM > R$60, CTR < 0.5%, `effective_status` com WITH_ISSUES, ou orçamento esgotado prematuramente sem conversões

---

## Cronograma de checks esperados

| # | Fire UTC | Fire BRT | Janela monitorada | Status | Resultado |
|---|---|---|---|---|---|
| 1 | 28/05 18:05 | **28/05 15:05** | 13:30 → 15:05 (≈1h35) | ⏳ Pendente | _aguardando_ |
| 2 | 28/05 20:05 | **28/05 17:05** | 15:05 → 17:05 | ⏳ Pendente | _aguardando_ |
| 3 | 28/05 22:05 | **28/05 19:05** | 17:05 → 19:05 (início pico delivery) | ⏳ Pendente | _aguardando_ |
| 4 | 29/05 00:05 | **28/05 21:05** | 19:05 → 21:05 (pico) | ⏳ Pendente | _aguardando_ |
| 5 | 29/05 02:05 | **28/05 23:05** | 21:05 → 23:05 (último em janela; campanha fecha 23:30) | ⏳ Pendente | _aguardando_ |
| 6 | 29/05 04:05 | **29/05 01:05** | 📋 POSTMORTEM (campanha já fechada) | ⏳ Pendente | _aguardando_ |

---

## Logs dos checks

> **Instrução de uso:** quando cada check rodar (você vai ser notificado), copia o output markdown do dashboard cloud e cola na seção correspondente abaixo. Manter o formato facilita comparações entre checks.

---

### Check 1 — 28/05 ≈15:05 BRT

> Status: ⏳ aguardando primeiro fire às 15:05 BRT
>
> _Cole o output completo da execução aqui quando rodar._

```
[output markdown da routine]
```

**Decisão tomada:** _(nenhuma / pausar / aumentar budget / mudar otimização / etc)_

---

### Check 2 — 28/05 ≈17:05 BRT

> Status: ⏳ aguardando

```
[output]
```

**Decisão tomada:**

---

### Check 3 — 28/05 ≈19:05 BRT

> Status: ⏳ aguardando

```
[output]
```

**Decisão tomada:**

---

### Check 4 — 28/05 ≈21:05 BRT

> Status: ⏳ aguardando

```
[output]
```

**Decisão tomada:**

---

### Check 5 — 28/05 ≈23:05 BRT

> Status: ⏳ aguardando — **último check antes do fechamento (23:30)**

```
[output]
```

**Decisão tomada:**

---

### Check 6 / POSTMORTEM — 29/05 ≈01:05 BRT

> Status: ⏳ aguardando — primeira execução após o fechamento. Gera relatório final.
> 
> ⚠️ **Após esta execução, lembrar de desabilitar a routine** em https://claude.ai/code/routines/trig_01RATWG5He45BEaCCCGVwfzN (toggle enabled = false), senão vai continuar firing a cada 2h gerando postmortems repetidos.

```
[output do postmortem]
```

A análise final do postmortem deve ser copiada para [[03 - Postmortem]] e expandida lá com aprendizados e plano para a próxima edição.

---

## Glossário de métricas observadas

| Métrica | Significado | Faixa esperada (food/delivery BR) |
|---|---|---|
| **Impressões** | Visualizações totais do ad | Depende do budget; R$50 ≈ 1k-3k |
| **Alcance** | Pessoas únicas que viram | ~70% das impressões inicialmente |
| **Frequência** | Impressões ÷ Alcance | 1.0 inicial; >2.5 em janela curta = saturação |
| **CTR** | Cliques ÷ Impressões | ≥ 0.8% (food); ≥ 1.5% é excelente |
| **CPM** | Custo por 1000 impressões | R$ 15-40 (Blumenau hiperlocal) |
| **CPC** | Custo por clique | R$ 1-5 |
| **PURCHASE (actions:omni_purchase)** | Compras atribuídas ao pixel | Cada uma vale o ticket médio do cardápio |
| **ROAS (purchase_roas)** | Receita ÷ Gasto em ads | ≥ 2.0 (sustentável); ≥ 3.0 (excelente em food) |

---

## Ações executadas durante a operação (log manual)

Use esta seção para qualquer ajuste fora do ciclo de 2h (ex: pausa de criativo, mudança de budget, troca de otimização):

| Hora BRT | Ação | Motivo | Quem |
|---|---|---|---|
| 28/05 ≈13:30 | Ativação da campanha + adset + ad | Início da operação | Juan / Claude |
| | | | |

---

*Documento vivo — atualizado em tempo real conforme os checks rodam.*
