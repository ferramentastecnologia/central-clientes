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

### Dados relacionados (VPS-owned, gitignored)

- `data/stories-publicados.json` — stories publicados (mutado em runtime por este script)
- `data/crons.json` — agendamentos exibidos na área de agendamento
- `data/posts-publicados.json` — posts de feed publicados (este é versionado no Git)

> Imagens dos criativos ficam em `academia/assets/` na VPS (servidas publicamente),
> necessárias porque a Graph API busca a imagem por URL no momento da publicação.
