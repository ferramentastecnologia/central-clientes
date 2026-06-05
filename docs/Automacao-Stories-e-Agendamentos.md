# Automação de Stories & Agendamentos (IG + Facebook)

Documento-mestre do sistema que publica **stories e posts orgânicos** dos clientes
no Instagram e no Facebook via Graph API, agenda por **timers systemd** na VPS, e
exibe tudo no dashboard `/agendamentos.html`.

> Última atualização: 2026-06-05 · Starken Tecnologia

---

## 1. Visão geral

| Peça | Onde | O quê |
|---|---|---|
| Scripts de publicação | `scripts/*.mjs` (versionados) | Falam com a Graph API (IG + FB) |
| Criativos (URLs públicas) | `feio/assets/photos/` (git) · `academia/assets/` (só VPS) | A Graph API busca a imagem por URL |
| Agendamento | Timers `systemd-run` one-shot na VPS | Disparam o script no horário |
| Registro de exibição | `data/crons.json` (VPS, gitignored) | Cards "Cron Jobs" do dashboard |
| Registro de publicados | `data/stories-publicados.json` · `data/posts-publicados.json` | Cards "Stories/Posts Publicados" (auto-preenchidos) |
| Dashboard | `agendamentos.html` | Filtro por cliente + canal, countdown, status |

**Por que timers systemd?** O Instagram/Facebook **não agenda story nativamente**.
A VPS está sempre online, então um timer one-shot (`systemd-run --on-calendar`) é o
agendador. Posts de feed do FB *podem* usar agendamento nativo (`scheduled_publish_time`),
mas aqui padronizamos tudo via timer + Graph API.

**Fuso:** 11h BRT = **14:00 UTC** · 18h BRT = **21:00 UTC** · 19h BRT = **22:00 UTC**.
Os timers usam UTC.

---

## 2. Clientes e IDs

| Cliente | slug | IG business | @ | Página FB |
|---|---|---|---|---|
| Hamburgueria Feio | feio | `17841440639973754` | hamburgueria.feio | `101076538404413` |
| Academia São Pedro | academia | `17841414456130251` | academiasaopedro | `1374528172770344` |

Token Meta: `META_GRAPH_TOKEN` no `.env` (user token long-lived do Juan, admin do app).
Escopos necessários já presentes: `instagram_content_publish`, `pages_manage_posts`,
`pages_read_engagement`. O token de página é derivado em runtime
(`GET /{page_id}?fields=access_token`).

---

## 3. Mecânica da Graph API

### Instagram Stories
1. `POST /{ig}/media` com `media_type=STORIES&image_url=...` → container
2. Poll `GET /{container}?fields=status_code` até `FINISHED`
3. `POST /{ig}/media_publish` com `creation_id`

### Instagram Feed
Igual ao story, mas sem `media_type` (default IMAGE) e **com** `caption`.

### Facebook Page Stories
1. `POST /{page}/photos` com `url=...&published=false` → `photo_id`
2. `POST /{page}/photo_stories` com `photo_id`

### Facebook Feed
`POST /{page}/photos` com `url` + `caption` (a caption é o texto do post).

> ⚠️ **Encoding:** sempre publicar via Node (fetch + URLSearchParams/FormData), nunca
> `curl -F` no Git Bash (corrompe acentos UTF-8 → vira `?`).

---

## 4. Feio — stories recorrentes

Script: **`scripts/publish-story-feio.mjs`** · canais padrão **IG + FB** (best-effort por canal).

```
node --env-file=.env scripts/publish-story-feio.mjs --day=<dia> --slot=<almoco|jantar> [--with-promo] [--channels=ig,fb]
node --env-file=.env scripts/publish-story-feio.mjs --image=<arquivo.png> --title="..."   # adhoc (1 story avulso)
```

### Grade semanal (domingo fechado)

| Dia | Variante abertura | 11h almoço | 18h jantar |
|---|---|---|---|
| Segunda | A | abertura + promo | abertura |
| Terça | B | abertura + promo | abertura + **Feio Duplo** |
| Quarta | A | abertura + promo | abertura + **Americano** |
| Quinta | B | abertura + promo | abertura |
| Sexta | A | abertura + promo | abertura + **Feio Blumenau** |
| Sábado | B | abertura + promo | abertura + **Story Sábado** |

- **Variante A** (Seg/Qua/Sex) e **B** (Ter/Qui/Sáb): dois conjuntos de arte "estamos abertos".
- Criativos em `feio/assets/photos/`: `feio-abre-{almoco,jantar}-{a,b}.png`,
  `promo-<dia>.png`, `feio-extra-{duplo,americano,blumenau,sabado}.png`.
- Fonte (working folder, fora do Git): `Hamburgueria Feio/Materiais/Stories Recorrentes/<Dia>/`
  com nomes limpos `abre-almoco.png`, `abre-jantar.png`, `promo.png`, `extra-*.png`.
  Toda arte é **9:16 (1080×1920)**.

### Timers (one-shot — **recriar a cada semana**)

Um timer por (dia, slot). 11h→14:00 UTC, 18h→21:00 UTC. Modelo:

```bash
systemd-run --on-calendar="AAAA-MM-DD 14:00:00 UTC" \
  --unit=story-feio-<dia>-almoco-<MMDD> \
  --working-directory=/var/www/central-clientes \
  /usr/bin/node --env-file=/var/www/central-clientes/.env \
  /var/www/central-clientes/scripts/publish-story-feio.mjs --day=<dia> --slot=almoco

# jantar: --on-calendar 21:00 UTC, unit ...-jantar-..., --slot=jantar
```

> O extra do jantar (duplo/americano/blumenau/story-sábado) é resolvido **pelo script**
> via o catálogo `DAYS` — o timer de jantar não muda, só chama `--slot=jantar`.

Gerenciar:
```bash
systemctl list-timers 'story-feio-*' --all        # próximos disparos
journalctl -u story-feio-<unit>.service            # log de uma execução
systemctl stop story-feio-<unit>.timer             # cancelar
```

Roteiro completo de rollout: `Hamburgueria Feio/Materiais/Stories Recorrentes/DEPLOY-stories-recorrentes.md`.

---

## 5. Academia — publicações one-off

- **`scripts/publish-namorados-academia.mjs`** — post Dia dos Namorados (sorteio):
  feed (com copy) + stories, IG + FB. Publicado em 05/06/2026 ~18h (4/4 alvos).
- **`scripts/publish-story-immediate.mjs`** — story Corpus Christi (versão antiga, hardcoded).
- Criativos da Academia ficam em `academia/assets/` **só na VPS** (não vão pro Git);
  subir via `scp <arquivo> hostinger-vps:/var/www/central-clientes/academia/assets/`.

---

## 6. Dashboard `/agendamentos.html`

### Filtros (combináveis)
- **Cliente**: botões gerados dinamicamente a partir de `data.clients` (`data-client=<slug>`).
- **Canal**: Todos / 📸 Instagram / 📘 Facebook (`data-channel`).
- Aplicados a todas as seções. Cada item declara seus canais:
  - cron: campo `channels` (`["ig","fb"]`); fallback por `type`.
  - story publicado: `channels`.
  - post publicado: `channels` é **objeto** `{instagram, facebook}` (URLs) — o helper
    `postChannels` converte pra array.

### Seções
- **Cron Jobs Claude** = só os **agendados** (ainda não disparados). Um cron "concluído"
  (`status==='completed'` OU one-shot cujo `next_fire_iso` já passou) **sai** da lista e
  o criativo aparece em "Stories Publicados". "Mostrar antigos" revela os concluídos.
  Lógica: helper `cronDone()`.
- **Stories Publicados** / **Posts Publicados** = auto-preenchidos pelos scripts ao publicar.
- Convenção de card de cron: 1 card por (timer/slot); thumbnail = criativo "estrela" do slot
  (promo no almoço, extra no jantar quando há), descrição lista tudo que sai.

### Dados
`crons.json` é **registro de exibição** (não dispara nada — quem dispara é o systemd).
Manter em sincronia com os timers reais. Campos: `id, type, client, client_slug,
description, next_fire_iso, tz, ig_business_id, image_url, channels, status, recurring`.

---

## 7. Deploy e operação

```bash
# Código (scripts, html) — versionado:
git push origin main
ssh hostinger-vps "cd /var/www/central-clientes && git pull && pm2 restart central-clientes-starken"

# Dados VPS-owned (gitignored): crons.json, *-publicados.json, academia/assets/*
ssh hostinger-vps "cat > /var/www/central-clientes/data/crons.json" < data/crons.json   # sync
scp <arquivo> hostinger-vps:/var/www/central-clientes/academia/assets/                  # criativo academia
```

VPS: `hostinger-vps` (`srv1620706.hstgr.cloud` · `/var/www/central-clientes` · PM2
`central-clientes-starken` · porta 3032). Domínio `central.starkentecnologia.com.br`.

**Permissões (trava de segurança):** ações em produção exigem allow-rules no settings
do Claude Code — `Bash(git push:*)` e `Bash(ssh hostinger-vps:*)`. `scp` de config
compartilhada pode ser bloqueado (usar `ssh ... cat >` como alternativa).

---

## 8. Checklist — agendar uma nova publicação

1. Confirmar **data/hora (BRT→UTC)**, **canais** e **copy** (se feed).
2. Hospedar o criativo com URL pública (Feio: `feio/assets/photos/` + git; Academia: `academia/assets/` via scp). Conferir `curl -I` 200.
3. Publicação recorrente Feio? Ajustar catálogo `DAYS`/`ABERTURA` no script. Avulsa? usar `--image`.
4. Criar timer `systemd-run` no horário (UTC).
5. Registrar card em `data/crons.json` (com `channels` e `image_url`) e sincronizar com a VPS.
6. Validar: `systemctl list-timers`, URL no ar, `node --check` do script, token no `.env`.
7. Pós-disparo: `journalctl -u <unit>.service` e conferir "Stories/Posts Publicados".

---

## 9. Limitações / atenção

- Timers são **one-shot** → recriar semanalmente (ou migrar pra timers recorrentes
  `OnCalendar` persistentes no futuro).
- Cada canal é **best-effort**: falha no FB não impede o IG (e vice-versa). Conferir log.
- O dashboard `crons.json` é só exibição — se um timer existe mas não há card (ou vice-versa),
  os dois ficam fora de sincronia. Manter ambos ao agendar.
- FB `photo_stories` publica de verdade; só dá pra testar 100% publicando (o upload
  `published=false` valida token/permissão sem postar).
