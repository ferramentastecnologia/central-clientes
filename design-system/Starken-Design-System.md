---
titulo: Starkën — Design System
tipo: brand-book
versao: 1.0
data: 2026-06-05
status: em-construcao
paleta: esmeralda (dark/tech)
tags: [branding, design-system, starken, tokens]
---

# ⚡ Starkën — Design System (v1.0 · Esmeralda / Dark)

> **Conceito:** *performance, solidez e tecnologia.* Starken = "fortalecer/forte".
> Estética **dark/tech**, sóbria e precisa. **Esmeralda** como cor de crescimento e
> performance sobre uma base de neutros **slate** escuros.
> **Regra de ouro: um destaque (Esmeralda) por vez + neutros.** Teal é apoio (gradiente), não 2ª protagonista.

> 🧱 Estrutura espelhada no design system da Fenice Lab (referência de organização):
> brand book + `tokens/` em 4 formatos + drop-in CSS.

---

## 1. Paleta de cores

### Marca
| Papel | Nome | Hex | Token |
|-------|------|-----|-------|
| Primária | **Esmeralda** | `#10b981` | `emerald-500` |
| Secundária / acento | **Teal** | `#0d9488` | `teal-600` |
| Realce claro | Esmeralda clara | `#6ee7b7` | `emerald-300` |
| Hover/escuro | Esmeralda escura | `#059669` | `emerald-600` |

### Neutros (slate — base do tema escuro)
| Papel | Hex | Token |
|------|-----|-------|
| Fundo app | `#020617` | `slate-950` (`--bg-dark`) |
| Superfície (cards) | `#0f172a` | `slate-900` (`--bg-surface`) |
| Elevado | `#1e293b` | `slate-800` (`--bg-elevated`) |
| Hover | `#334155` | `slate-700` (`--bg-hover`) |
| Texto principal | `#ffffff` | `--text-primary` |
| Texto secundário | `#94a3b8` | `slate-400` |
| Texto muted | `#64748b` | `slate-500` |

### Escala Esmeralda
`50 #ecfdf5` · `100 #d1fae5` · `200 #a7f3d0` · `300 #6ee7b7` · `400 #34d399` · **`500 #10b981`** · `600 #059669` · `700 #047857` · `800 #065f46` · `900 #064e3b` · `950 #022c22`

### Estados semânticos
`success #10b981` · `warning #f59e0b` · `danger #ef4444` · `info #3b82f6`

### Gradiente assinatura
```css
linear-gradient(135deg, #10b981 0%, #0d9488 100%)
```

### Regra de uso & acessibilidade
- Base **slate escuro** (60%) · **Esmeralda** como destaque (~30%) · teal/gradiente como apoio (~10%).
- Texto sobre fundo escuro: branco (`--text-primary`) ou `slate-400` (secundário).
- Esmeralda como texto: usar tons claros (`emerald-300/400`) sobre fundo escuro para contraste.

---

## 2. Tipografia
| Uso | Fonte | Pesos |
|-----|-------|-------|
| Display / Títulos | **Sora** | 600 / 700 / 800 |
| Corpo / UI | **Inter** | 400–700 |
| Mono / dados / código | **Fira Code** | 400–600 |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
```

Helpers: `.starken-heading-1/2/3`, `.starken-body`, `.starken-caption`, `.starken-mono`.

---

## 3. Tokens & Componentes

Pasta `tokens/`: `starken-tokens.css` (CSS puro), `starken-theme.css` (Tailwind v4),
`tailwind.config.ts` (Tailwind v3), `starken-tokens.json` (Figma/Style Dictionary).

Drop-in vanilla (tokens + componentes) — `starken-design-system.css`, prefixo `.starken-`:
- **Botões**: `starken-btn` + `-primary` / `-secondary` / `-ghost` / `-danger` · tamanhos `-sm` / `-lg`
- **Cards**: `starken-card` / `-elevated`
- **Badges**: `starken-badge` + `-success` / `-warning` / `-danger` / `-info` / `-neutral`
- **Inputs**: `starken-input` (+ `-error`)
- **Gradientes**: `starken-gradient-brand`, `starken-gradient-text`

```html
<link rel="stylesheet" href="/design-system/starken-design-system.css">
<button class="starken-btn starken-btn-primary">Começar</button>
<span class="starken-badge starken-badge-success">No ar</span>
```

---

## 4. Regras

**✅ Pode:** Esmeralda como único destaque · teal só em gradiente/apoio · base slate escura ·
Fira Code pra dados/métricas · sombra `--shadow-brand` em CTAs.
**🚫 Não pode:** duas cores protagonistas na mesma tela · saturar além da paleta ·
trocar as fontes (Sora/Inter/Fira) · usar esmeralda escura como texto sobre fundo escuro.

---

## 5. Espaçamento, raio e sombra
- **Espaçamento:** grid de 4px (`--space-1` 4px … `--space-16` 64px).
- **Raio:** `sm 6px` · `md 10px` · `lg 16px` · `xl 24px` · `full 9999px`.
- **Sombra:** `sm` / `md` / `lg` + `--shadow-brand` (glow esmeralda em destaques).

---

*v1.0 · 2026-06-05 · Starken Tecnologia · estrutura baseada no DS da Fenice Lab.*
*Origem dos tokens: `starken-design-system.css` (starken-os) + `DESIGN_SPEC_V2.md`.*
