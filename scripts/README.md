# scripts/

Scripts operacionais de automação rodados na **VPS** (`/var/www/central-clientes/scripts/`).
Versionados aqui para backup/reprodutibilidade. Dependem do `.env` da VPS (token Meta).

## publish-story-immediate.mjs

Publica um **story no Instagram** imediatamente ao ser chamado e **auto-registra** o
story em `data/stories-publicados.json` (alimenta a seção "📱 Stories Publicados" do dashboard).

- IG/criativo/título estão hardcoded no topo do script (story de Corpus Christi · Academia São Pedro).
- Cria container `STORIES` (com retry em erro transiente), faz poll de status e publica.
- Após publicar, adiciona a entrada no JSON com dedupe por `id` (`story-academia-corpus-MMDD`).

### Como é disparado (timer systemd one-shot)

O agendamento foi criado na VPS com `systemd-run` (dispara uma vez no horário, VPS sempre online):

```bash
systemd-run --on-calendar="2026-06-04 14:11:10 UTC" \
  --unit=story-corpus-academia \
  --working-directory=/var/www/central-clientes \
  /usr/bin/node --env-file=/var/www/central-clientes/.env \
  /var/www/central-clientes/scripts/publish-story-immediate.mjs
```

Verificar / gerenciar:

```bash
systemctl list-timers story-corpus-academia.timer --all   # ver próximo disparo
journalctl -u story-corpus-academia.service                # ver log da execução
systemctl stop story-corpus-academia.timer                 # cancelar
```

## publish-story-feio.mjs

Publica a **sequência de stories recorrentes** da **Hamburgueria Feio**
(IG `17841440639973754` · @hamburgueria.feio). Mesma mecânica do script da Academia
(container `STORIES` com retry → poll de status → publish → auto-registro), mas
parametrizado por **dia** e **slot**:

```bash
node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=almoco
node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=jantar
node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=jantar --with-promo
node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=almoco --channels=ig
# dias:   segunda, terca, quarta, quinta, sexta, sabado   (domingo fechado)
# slots:  almoco (11h), jantar (18h)
# canais: --channels=ig,fb (padrão) | ig | fb   — best-effort por canal
```

**Dois canais:** publica em **Instagram Stories** (`media_type=STORIES`) E em
**Facebook Page Stories** (`POST {page}/photos?published=false` → `POST {page}/photo_stories`),
usando o page token derivado do user token. Falha em um canal não impede o outro.
Página FB do Feio: `101076538404413`. Registro guarda `channels`, `ig_media_id` e `fb_story_id`.

Cada dia aberto tem uma variante de criativo "estamos abertos" (A = Seg/Qua/Sex,
B = Ter/Qui/Sáb) + a promo do dia. O que cada slot publica:

| slot | 11h almoço | 18h jantar |
|---|---|---|
| stories | abertura-almoço **+ promo do dia** | abertura-jantar **+ story do dia** (ter=duplo, qua=americano, sex=blumenau, sáb=story-sábado) |

Modo adhoc: `--image=<arquivo> --title="..."` publica 1 story avulso (ignora dia/slot).

- `--with-promo` adiciona a promo ao slot do jantar (usado quando a promo perdeu o
  slot das 11h e precisa ser recuperada à noite).
- Criativos servidos em `https://central.starkentecnologia.com.br/feio/assets/photos/`
  (`promo-<dia>.png`, `feio-abre-{almoco,jantar}-{a,b}.png`).
- Registro com dedupe por `id` = `story-feio-<dia>-<imagem>-MMDD` em `data/stories-publicados.json`.
- `STORIES_STORE` (env, opcional) sobrescreve o caminho do JSON de registro.

> Fonte dos criativos (renomeada/limpa) fica em
> `Hamburgueria Feio/Materiais/Stories Recorrentes/<Dia>/{abre-almoco,abre-jantar,promo}.png`
> (working folder local, fora do Git). Ao trocar a arte, re-copie para `feio/assets/photos/`
> com o nome canônico, commite e faça deploy.

### Timers (one-shot via systemd-run)

Um timer por (dia, slot). 11h BRT = 14:00 UTC · 18h BRT = 21:00 UTC. Exemplo (sábado):

```bash
systemd-run --on-calendar="2026-06-06 14:00:00 UTC" \
  --unit=story-feio-sabado-almoco-0606 \
  --working-directory=/var/www/central-clientes \
  /usr/bin/node --env-file=/var/www/central-clientes/.env \
  /var/www/central-clientes/scripts/publish-story-feio.mjs --day=sabado --slot=almoco

systemd-run --on-calendar="2026-06-06 21:00:00 UTC" \
  --unit=story-feio-sabado-jantar-0606 \
  --working-directory=/var/www/central-clientes \
  /usr/bin/node --env-file=/var/www/central-clientes/.env \
  /var/www/central-clientes/scripts/publish-story-feio.mjs --day=sabado --slot=jantar
```

### Dados relacionados (VPS-owned, gitignored)

- `data/stories-publicados.json` — stories publicados (mutado em runtime por este script)
- `data/crons.json` — agendamentos exibidos na área de agendamento
- `data/posts-publicados.json` — posts de feed publicados (este é versionado no Git)

> Imagens dos criativos ficam em `academia/assets/` na VPS (servidas publicamente),
> necessárias porque a Graph API busca a imagem por URL no momento da publicação.

## publish-reel-feio.mjs (REELS · IG + FB)

Publica um **Reel** no Instagram (`media_type=REELS`) e no Facebook (Reels da página,
upload resumável via `file_url`), best-effort por canal. Registra em `posts-publicados.json`.

```bash
node --env-file=.env scripts/publish-reel-feio.mjs --video=<arquivo.mp4> [--channels=ig,fb] [--thumb-offset=2000]
```

- Vídeo hospedado em `feio/assets/videos/` (gitignored — `*.mp4`/`*.mov` fora do Git, só na VPS).
- `--thumb-offset` (ms) = capa do Reel no **Instagram** (frame não-preto). No FB a capa é automática.

### ⚠️ Qualidade / codec (importante)
**Sempre fornecer o vídeo em H.264.** O IG/FB preferem H.264; o script publica H.264
**sem transcodar** (qualidade nativa). Se o arquivo for outro formato *decodificável*, ele
transcoda p/ H.264 (libopenh264 14M) via `ffmpeg` na VPS.

> **HEVC/H.265 (padrão do iPhone) NÃO funciona bem:** o `ffmpeg-free` da VPS **não decodifica HEVC**
> (decoder patenteado, removido do build livre) → cai no original HEVC, que o Meta re-encoda pior.
> **Solução:** gravar/exportar em H.264 (iPhone: Ajustes → Câmera → Formatos → **"Mais Compatível"**).
