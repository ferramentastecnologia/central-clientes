# GitHub Copilot — Central de Clientes Starken

📖 **Leia o `AGENTS.md` na raiz** — guia canônico completo (stack, deploy, automação, credenciais, regras). Vale também o `CLAUDE.md`.

Essenciais (detalhe no AGENTS.md):
- Stack: Node.js puro (`server.mjs`, zero deps externas) + HTML/CSS/JS vanilla, **sem build/bundler**.
- Rodar local: `node --env-file=.env server.mjs`.
- Deploy: GitHub `main` → VPS (`ssh hostinger-vps`, `/var/www/central-clientes`, PM2 `central-clientes-starken`). **Push/deploy exigem OK do usuário.**
- **Nunca committar segredos.** `META_GRAPH_TOKEN` no `.env` (local + VPS). `data/clients-mapping.json`, `data/crons.json`, `data/stories-publicados.json`, `academia/assets/*`, `feio/assets/photos/*` são **gitignored**.
- UI segue o **Starken Design System** (tokens, não hex); exceção = hubs client-facing.
- Agendamento de stories/posts: `data/crons.json` + `scripts/cron-dispatcher.mjs` (crontab). NÃO usar `systemd-run`.
