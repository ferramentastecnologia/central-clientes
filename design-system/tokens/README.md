# Starkën — Design Tokens

Tokens da identidade visual da Starken Tecnologia para usar em qualquer projeto.

## Arquivos

| Arquivo | Quando usar |
|---------|-------------|
| `starken-tokens.css` | Qualquer projeto **sem framework** — variáveis `:root`. |
| `starken-theme.css` | Projetos **Tailwind v4** (CSS-first). Cole/importe no `globals.css`. |
| `tailwind.config.ts` | Projetos **Tailwind v3**. Copie pra raiz e mescle com seu config. |
| `starken-tokens.json` | **Figma / Style Dictionary** (design tokens). |

> Drop-in completo (tokens **+ componentes** vanilla): `../starken-design-system.css`.

## Uso rápido

### CSS puro
```css
@import './starken-tokens.css';
.btn { background: var(--gradient-brand); color: #fff; border-radius: var(--radius-md); }
h1   { font-family: var(--font-display); color: var(--brand-primary); }
body { background: var(--bg-dark); color: var(--text-primary); }
```

### Tailwind (v3 ou v4)
```html
<h1 class="font-display text-emerald-400">Starkën</h1>
<button class="bg-brand text-white rounded-md px-4 py-2 shadow-brand">Começar</button>
<section class="bg-slate-900 text-slate-100">…</section>
```

## Marca
- **Esmeralda** `#10b981` — primária (escala `emerald`)
- **Teal** `#0d9488` — secundária/acento (escala `teal`)
- Neutros **Slate** (tema escuro): `slate-950` `#020617` (bg) → `slate-400` `#94a3b8` (texto secundário)

## Regra de ouro
Tema **dark/tech**: **um destaque (Esmeralda)** sobre neutros slate. Teal entra como
apoio/gradiente, não como segunda cor protagonista. Verde = crescimento/performance.

## Tipografia
- **Sora** — display/títulos
- **Inter** — corpo/UI
- **Fira Code** — mono/código/dados

(Google Fonts, já importadas nos arquivos CSS.)

## Estados semânticos
`--success #10b981` · `--warning #f59e0b` · `--danger #ef4444` · `--info #3b82f6`
