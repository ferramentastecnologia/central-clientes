---
cliente: Academia São Pedro
agencia: Starken Tecnologia
acao: Sorteio Dia dos Namorados 2026
data_criacao: 2026-06-01
tipo: agendamento-publicacao
status: aguardando-execucao-manual
---

# Agendamento — Post Sorteio Dia dos Namorados

## 📅 Programação

| Campo | Valor |
|---|---|
| **Tipo de publicação** | Post orgânico Instagram + Facebook |
| **Data de publicação** | Domingo, 01/06/2026 |
| **Horário** | 19h30 (BRT) |
| **Antecedência ao evento** | 11 dias antes do Dia dos Namorados (12/06) |
| **Canal principal** | @academiasaopedro (Instagram) |
| **Canal secundário** | Página Facebook da Academia São Pedro |
| **Page ID Facebook** | 1374528172770344 |
| **Ad Account (referência futura)** | 598925851864085 |

## 🎯 Estratégia de timing

Publicação com 11 dias de antecedência:
- ✅ Cria expectativa progressiva pela semana do evento
- ✅ Permite engajamento orgânico acumular (comments, shares) antes do pico
- ✅ Dá tempo pra Stories de reforço durante a semana
- ✅ Mood romântico domingo à noite ressoa com público do Dia dos Namorados

## 🖼️ Arte

- Formato Story: 1080×1920
- Identidade visual: amarelo + preto Academia São Pedro
- Imagem central: casal treinando juntos
- Headline: "TREINAR JUNTO TAMBÉM É UMA FORMA DE DEMONSTRAR AMOR!"
- Logo Academia São Pedro centralizado embaixo

## ✍️ Copy a publicar

Ver arquivo [[COPY]] — versão integral aprovada em 2026-06-01.

**Resumo da estrutura:**
1. Hook romântico (crescer juntos)
2. Anúncio da ação (sorteio)
3. Prêmios em destaque (com bullets)
4. Mecânica (3 passos numerados)
5. Fechamento emocional

⚠️ Atenção ao copiar pro Instagram: substituir `*asteriscos*` por LETRAS MAIÚSCULAS pra destaque (Instagram não renderiza markdown).

## 📋 Checklist de execução manual

- [ ] Salvar imagem da arte em `Clientes/Academia São Pedro/Criativos/Dia dos Namorados 2026/arte-casal-treinando.png`
- [ ] Abrir Meta Business Suite ([link](https://business.facebook.com/latest/composer))
- [ ] Trocar pra conta Academia São Pedro
- [ ] Criar nova publicação
- [ ] Marcar Instagram + Facebook como destinos
- [ ] Upload da arte
- [ ] Colar copy (ajustada sem asteriscos no Instagram)
- [ ] Verificar prévia em ambos canais
- [ ] Agendar pra 01/06 19h30 BRT
- [ ] Confirmar agendamento
- [ ] Após publicado, verificar engajamento nas primeiras 2h

## 📊 Métricas a monitorar pós-publicação

### Primeiros 30 minutos
- Curtidas/reações iniciais
- Primeiros comentários (sinaliza se mecânica está clara)

### Primeiras 24 horas
- Total de comentários (proxy de participantes do sorteio)
- Compartilhamentos em Stories
- Crescimento de seguidores @academiasaopedro
- Mensagens diretas perguntando sobre a ação

### Durante a semana (até 12/06)
- Engajamento por dia (pico esperado: dia 9-12/06)
- Reach orgânico vs base de seguidores
- Conversões em DM pra dúvidas sobre matrícula
- Taxa de novos seguidores

## 🎬 Próximos passos pós-publicação

1. **Stories de reforço** ao longo da semana (3-4 Stories entre 02/06 e 11/06):
   - 02/06: "Já viu o sorteio?" + sticker pergunta
   - 05/06: Depoimento de casal aluno (vídeo curto)
   - 09/06: Lembrete + countdown ao dia do sorteio
   - 11/06: Última chamada antes do Dia dos Namorados

2. **Decisão sobre campanha paga**:
   - Avaliar engajamento orgânico nos primeiros 3-5 dias
   - Se >100 comentários, vale impulsionar — alcance local Blumenau
   - Se <50 comentários, ajustar estratégia ou pausar paid

3. **Post do vencedor**:
   - Stories anunciando o sorteio + vencedor no dia 12/06 ou 14/06
   - Post de feed celebrando o casal vencedor
   - Tagging do casal + permissão de uso de imagem

## ⚠️ Limitações técnicas

Esta integração (Claude Code + MCP Meta Ads) **não publica posts orgânicos diretamente** no Instagram/Facebook. A publicação orgânica é feita manualmente via Meta Business Suite pela equipe.

**O que esta integração faz:**
- Cria/agenda campanhas pagas via Meta Marketing API ✅
- Cria/agenda ads com `start_time` futuro ✅
- Promove posts existentes como dark posts (anúncios) ✅

**O que NÃO faz:**
- Publicar post orgânico no feed do Instagram ❌
- Publicar Stories ❌
- Responder DMs ❌
- Postar como página normal ❌

---

## 🤖 EXECUÇÃO AUTOMÁTICA VIA GRAPH API (2026-06-01)

### Setup técnico realizado
- ✅ Token Long-Lived Meta gerado e validado (`Juan Fernando`, ID `10233169467804258`)
- ✅ Page Access Token obtido pra Academia São Pedro
- ✅ Instagram Business Account ID confirmado: `17841414456130251` (@academiasaopedro)
- ✅ Imagens hospedadas em URL pública (CloudFront)

### Imagens hospedadas
- **Storie 9:16**: `https://d2ol7oe51mr4n9.cloudfront.net/user_3EJRw1x0sjC1KNGTwn6bwxcrsQM/cee843f0-09d2-4cd1-a89e-b0b41b6b5c5f.png`
- **Feed 4:5**: `https://d2ol7oe51mr4n9.cloudfront.net/user_3EJRw1x0sjC1KNGTwn6bwxcrsQM/d82f8100-81e8-4b8f-afef-baefbb65e8b0.png`

### Facebook Page — AGENDADO via API
| Campo | Valor |
|---|---|
| Status | ✅ Agendado nativamente |
| Post ID | `1525594702911786` (refeito com UTF-8 correto) |
| Data/hora publicação | 01/06/2026 às 19h30 BRT |
| Independente da sessão Claude? | ✅ **SIM** — Meta cuida do agendamento |
| Imagem usada | Feed 4:5 |

### ⚠️ Lição aprendida — Encoding UTF-8 em chamadas Graph API
A primeira tentativa via `curl -F` no Git Bash (Windows) gravou os acentos como bytes inválidos no servidor da Meta — preview ficou com `?` no lugar de `ã`, `é`, etc. O problema é conversão automática Win-1252 ↔ UTF-8 que o Git Bash faz silenciosamente.

**Solução validada:** usar Node.js + FormData nativo, ler caption de arquivo UTF-8, fazer fetch direto. Preserva bytes corretamente.

```javascript
const caption = await fs.readFile('caption.txt', 'utf-8');
const form = new FormData();
form.append('caption', caption);
// ... fetch direto
```

### Instagram Feed — AGENDADO via Cron Claude
| Campo | Valor |
|---|---|
| Status | ⏳ Cron one-shot configurado |
| Cron ID | `2705a45e` |
| Cron expression | `30 19 1 6 *` (01/06 19:30 BRT) |
| Independente da sessão Claude? | ⚠️ **NÃO** — sessão precisa estar aberta às 19h30 |
| Imagem usada | Feed 4:5 |
| Fluxo no disparo | 1) Cria container `/{ig-id}/media` · 2) Poll status até FINISHED · 3) Publica via `/{ig-id}/media_publish` |

### Stories Instagram — pendente
Não foi agendado via API. Se quiser publicar Stories, é manual via Meta Business Suite, usando a imagem 9:16:
- Path: `Clientes/Academia São Pedro/Criativos/Dia dos Namorados 2026/POSTS-ACADEMIASTORIE-DIA-DOS-NAMORADOS.png`

### Plano B (se cron Instagram falhar)
Se o Claude Code for fechado antes das 19h30 ou o cron falhar por qualquer motivo, publicar manualmente via Meta Business Suite:
1. Abrir [business.facebook.com/latest/composer](https://business.facebook.com/latest/composer)
2. Trocar pra conta Academia São Pedro
3. Upload da imagem Feed
4. Colar copy do [[COPY]] (versão final aprovada)
5. Publicar imediatamente

---

*Programação criada em 2026-06-01 · Equipe Starken Tecnologia*
*Aprovado por Juan (Fenice Lab) em 2026-06-01*
*Execução automática via Graph API configurada em 2026-06-01 11h00 BRT*

---

## 🔁 Republicação — 05/06/2026 ~18h (feed + stories, IG + FB)

Reforço do sorteio publicado via `scripts/publish-namorados-academia.mjs` (Graph API),
**4/4 alvos OK**:

| Alvo | ID |
|---|---|
| Instagram feed (com copy) | `18114739129881665` ([post](https://www.instagram.com/p/DZN_KackucM/)) |
| Facebook feed (com copy) | `1374528172770344_1529987072472549` |
| Instagram story | `18097155344235111` |
| Facebook story | `1547934850381628` |

- Criativos: `POSTS-ACADEMIAFEED-...png` (feed) e `POSTS-ACADEMIASTORIE-...png` (story),
  hospedados na VPS em `academia/assets/namorados-{feed,story}.png`.
- Copy usada: bloco "Copy aprovada — Texto principal" do `COPY.md`.
- Registrado no dashboard (posts/stories-publicados.json) sob Academia, canais IG + FB.

> ⚠️ Correção ao item "Limitações técnicas" acima: a integração **publica sim** posts
> orgânicos e stories direto via Graph API (IG `media_publish` + FB `photo_stories`).
> Ver `docs/Automacao-Stories-e-Agendamentos.md`.
