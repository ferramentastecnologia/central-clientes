# CLAUDE.md — Central de Clientes Starken

Projeto: dashboard/central de clientes da Starken Tecnologia (Node puro `server.mjs`,
HTML/CSS/JS vanilla, sem build). Deploy: GitHub `main` → VPS `hostinger-vps`
(`/var/www/central-clientes`, PM2 `central-clientes-starken`) → `central.starkentecnologia.com.br`.

## 🎨 REGRA PADRÃO — Design System Starken (obrigatório)

**Toda implementação de UI (páginas novas ou edições) DEVE usar o Starken Design System.**
Fonte de verdade: [`design-system/`](design-system/) · showcase: `/design-system/`.

Ao criar/editar qualquer página HTML:
1. Linkar os tokens no `<head>`:
   ```html
   <link rel="icon" href="/design-system/assets/favicon.svg" type="image/svg+xml">
   <link rel="stylesheet" href="/design-system/tokens/starken-tokens.css">
   ```
   (ou o drop-in completo `design-system/starken-design-system.css` p/ componentes `.starken-*`).
2. Usar os **tokens**, nunca hex solto: cores `var(--brand-primary)` / `--emerald-*` / `--slate-*`,
   fontes `var(--font-display)` (Sora) · `var(--font-body)` (Inter) · `var(--font-mono)` (Fira Code),
   mais `--space-*`, `--radius-*`, `--shadow-*`.
3. **Identidade:** tema dark/tech · **Esmeralda `#10b981`** como único destaque + neutros **slate** ·
   Teal `#0d9488` só em gradiente/apoio. Logo branco em fundo escuro + favicon Starken.
4. Estados: `--success/ok` esmeralda · `--warning` `#f59e0b` · `--danger` `#ef4444` · `--info` `#3b82f6`.

> Não introduzir paletas/fontes novas fora do DS. Se algo faltar no DS, **estender o DS**
> (em `design-system/`) e usar o token — não criar exceção solta na página.

**Exceção:** relatórios/hubs **client-facing** (`feio/`, `centro/`, `garcia/`, `eventos/`)
carregam a marca do **cliente**, não a da Starken. Não aplicar a identidade Starken neles.

Detalhes: [`design-system/Starken-Design-System.md`](design-system/Starken-Design-System.md).

## 📦 Outras automações
- Stories/agendamentos IG+FB: ver [`docs/Automacao-Stories-e-Agendamentos.md`](docs/Automacao-Stories-e-Agendamentos.md).
- Dados VPS-owned (gitignored): `data/*.json`, `academia/assets/*` — sincronizar via `ssh`/`scp`.
