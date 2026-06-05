# Starkën Design System

Identidade visual e tokens da Starken Tecnologia — tema **dark/tech**, destaque **Esmeralda**.
Organização baseada no design system da Fenice Lab.

## Estrutura

```
design-system/
├── Starken-Design-System.md      # brand book (paleta, tipografia, regras, componentes)
├── starken-design-system.css     # drop-in vanilla: tokens + componentes (.starken-*)
└── tokens/
    ├── README.md                 # guia de uso dos tokens
    ├── starken-tokens.css        # CSS puro (:root)
    ├── starken-theme.css         # Tailwind v4 (@theme)
    ├── tailwind.config.ts        # Tailwind v3
    └── starken-tokens.json       # Figma / Style Dictionary
```

## Uso rápido

Sem framework (drop-in completo, já com componentes):
```html
<link rel="stylesheet" href="/design-system/starken-design-system.css">
<button class="starken-btn starken-btn-primary">Começar</button>
```

Só tokens (pra integrar no seu CSS/Tailwind): ver `tokens/README.md`.

Servido em produção: `https://central.starkentecnologia.com.br/design-system/…`

## Marca em 1 linha
Esmeralda `#10b981` (primária) + Teal `#0d9488` (apoio) sobre neutros Slate escuros ·
Sora (display) / Inter (corpo) / Fira Code (mono) · 1 destaque por vez.

## Próximos passos sugeridos
- Aplicar os tokens ao `agendamentos.html` / `index.html` (padronizar o dashboard).
- Adicionar logo/emblema Starken (SVG) + favicons ao `design-system/assets/`.
- (Opcional) componentes React (Button/Card/Badge) como na Fenice.
