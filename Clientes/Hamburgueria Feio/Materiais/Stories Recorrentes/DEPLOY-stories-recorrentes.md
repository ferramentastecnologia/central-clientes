# Deploy — Stories recorrentes Feio (rollout 05–13/06/2026)

> 📘 **Doc-mestre da automação** (IG+FB, scripts, dashboard, runbook):
> `docs/Automacao-Stories-e-Agendamentos.md`. Este arquivo é o registro do rollout
> 05–13/06 e o passo-a-passo pra **recriar os timers** na próxima semana.

Sistema de stories recorrentes da Hamburgueria Feio: por dia aberto (seg–sáb),
publicado em **Instagram + Facebook** (best-effort por canal):
- **almoço 11h** → abertura + **promo do dia**
- **jantar 18h** → abertura + **story do dia** (ter=Duplo, qua=Americano, sex=Blumenau, sáb=Story Sábado; seg/qui sem extra)

Domingo fechado. 11h BRT = 14:00 UTC · 18h BRT = 21:00 UTC.

✅ Estado (05/06): script + imagens em produção; 15 timers da grade criados +
1 one-off (blumenau hoje 19h); cards no dashboard com filtro cliente/canal.
Os timers de jantar já resolvem o extra automaticamente (catálogo `DAYS` no script).

---

## 1. Push (no PC local, git-bash / terminal)

```bash
cd /c/Users/Juan/Documents/central-clientes
PAT=$(grep -oE 'gh[ps]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+' "/c/Users/Juan/Documents/central-clientes-tokens/GitHub PAT.md" | head -1)
git push "https://x-access-token:${PAT}@github.com/ferramentastecnologia/central-clientes.git" main
```

## 2. Deploy na VPS (puxa código + imagens novas)

```bash
ssh hostinger-vps "cd /var/www/central-clientes && git pull && pm2 restart central-clientes-starken"
```

Conferir imagens no ar (devem dar HTTP 200):

```bash
for f in feio-abre-almoco-a feio-abre-jantar-a feio-abre-almoco-b feio-abre-jantar-b promo-terca promo-quarta; do
  echo -n "$f: "; curl -s -o /dev/null -w "%{http_code}\n" "https://central.starkentecnologia.com.br/feio/assets/photos/$f.png"
done
```

## 3. Criar os timers (rodar NA VPS: `ssh hostinger-vps`)

```bash
cd /var/www/central-clientes
NODE=/usr/bin/node
ENVF=/var/www/central-clientes/.env
SCRIPT=/var/www/central-clientes/scripts/publish-story-feio.mjs
WD=/var/www/central-clientes

mktimer() {  # $1=datetime UTC  $2=unit  resto=args do script
  local when="$1"; local unit="$2"; shift 2
  systemd-run --on-calendar="$when" --unit="$unit" --working-directory="$WD" \
    "$NODE" --env-file="$ENVF" "$SCRIPT" "$@"
}

# HOJE sexta 05/06 — só jantar+promo (11h já passou)
mktimer "2026-06-05 21:00:00 UTC" story-feio-sexta-jantar-0605   --day=sexta   --slot=jantar --with-promo

# Sábado 06/06
mktimer "2026-06-06 14:00:00 UTC" story-feio-sabado-almoco-0606  --day=sabado  --slot=almoco
mktimer "2026-06-06 21:00:00 UTC" story-feio-sabado-jantar-0606  --day=sabado  --slot=jantar

# Semana que vem (seg–sáb, 08–13/06)
mktimer "2026-06-08 14:00:00 UTC" story-feio-segunda-almoco-0608 --day=segunda --slot=almoco
mktimer "2026-06-08 21:00:00 UTC" story-feio-segunda-jantar-0608 --day=segunda --slot=jantar
mktimer "2026-06-09 14:00:00 UTC" story-feio-terca-almoco-0609   --day=terca   --slot=almoco
mktimer "2026-06-09 21:00:00 UTC" story-feio-terca-jantar-0609   --day=terca   --slot=jantar
mktimer "2026-06-10 14:00:00 UTC" story-feio-quarta-almoco-0610  --day=quarta  --slot=almoco
mktimer "2026-06-10 21:00:00 UTC" story-feio-quarta-jantar-0610  --day=quarta  --slot=jantar
mktimer "2026-06-11 14:00:00 UTC" story-feio-quinta-almoco-0611  --day=quinta  --slot=almoco
mktimer "2026-06-11 21:00:00 UTC" story-feio-quinta-jantar-0611  --day=quinta  --slot=jantar
mktimer "2026-06-12 14:00:00 UTC" story-feio-sexta-almoco-0612   --day=sexta   --slot=almoco
mktimer "2026-06-12 21:00:00 UTC" story-feio-sexta-jantar-0612   --day=sexta   --slot=jantar
mktimer "2026-06-13 14:00:00 UTC" story-feio-sabado-almoco-0613  --day=sabado  --slot=almoco
mktimer "2026-06-13 21:00:00 UTC" story-feio-sabado-jantar-0613  --day=sabado  --slot=jantar
```

## 4. Conferir / gerenciar

```bash
systemctl list-timers 'story-feio-*' --all          # próximos disparos
journalctl -u story-feio-sexta-jantar-0605.service  # log de uma execução
systemctl stop story-feio-<unit>.timer              # cancelar um
```

## Disparo manual (testar sem esperar o timer)

```bash
ssh hostinger-vps "cd /var/www/central-clientes && /usr/bin/node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=jantar --with-promo"
```

> ⚠️ Cada execução publica de verdade no @hamburgueria.feio (13,6k seguidores).
> O `--with-promo` no jantar de hoje recupera a promo que perderia o slot das 11h.
