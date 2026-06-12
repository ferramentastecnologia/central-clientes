# 🤝 Handoff Starken — Bootstrap pro novo chat

> Cole o conteúdo abaixo no início do novo chat (após "## Prompt pro novo chat") pro assistant ter contexto completo do projeto Starken e continuar de onde paramos.

---

## Prompt pro novo chat

```
Vou trabalhar agora exclusivamente nos clientes Starken Tecnologia
neste chat. Contexto completo do projeto:

═══════════════════════════════════════════════════════════════
📁 PROJETO: Central de Clientes Starken
═══════════════════════════════════════════════════════════════

🔗 URLs em produção:
• https://central.starkentecnologia.com.br  ← APP (Central de Clientes)
• https://central.starkentecnologia.com.br/admin/  ← Admin (Basic Auth)

🔗 GitHub:
• https://github.com/ferramentastecnologia/central-clientes
• Conta git local: ferramentastecnologia
• PAT em: C:\Users\Juan\Documents\central-clientes-tokens\GitHub PAT.md

📂 Código local:
C:\Users\Juan\Documents\central-clientes\
  ├── server.mjs (Node 22 puro, sem deps)
  ├── index.html (Central de Clientes)
  ├── admin/, feio/, centro/, garcia/, eventos/, data/, assets/
  ├── .env (PORT=3032, META_GRAPH_TOKEN, ADMIN_USER, ADMIN_PASS)
  └── .git/ → origin: ferramentastecnologia/central-clientes

📂 Credenciais (FORA do Git):
C:\Users\Juan\Documents\central-clientes-tokens\
  └── GitHub PAT.md

═══════════════════════════════════════════════════════════════
🖥️ DEPLOY em produção — VPS Starken (Hostinger)
═══════════════════════════════════════════════════════════════

• Host: srv1620706.hstgr.cloud (187.77.46.199)
• SSH: ssh hostinger-vps (alias no ~/.ssh/config)
• Chave: ~/.ssh/hostinger_vps
• Path: /var/www/central-clientes/
• Porta interna: 3032
• PM2: central-clientes-starken (id 5)
• Nginx: /etc/nginx/conf.d/central.starkentecnologia.com.br.conf
• SSL: Let's Encrypt (expira 2026-08-31, auto-renew via certbot)
• DNS: Registro.br A central → 187.77.46.199

═══════════════════════════════════════════════════════════════
👥 CLIENTES MAPEADOS (5 — todos Starken)
═══════════════════════════════════════════════════════════════

| Cliente            | slug      | Page FB           | IG               | Ad Account         |
|--------------------|-----------|-------------------|------------------|--------------------|
| Academia São Pedro | academia  | 1374528172770344  | 17841414456130251 | (pendente)         |
| Hamburgueria Feio  | feio      | 101076538404413   | 17841440639973754 | 1002920447256042   |
| Madrugão Centro    | centro    | 861711940599446   | 17841407105086962 | 317032009743632    |
| Madrugão Garcia    | garcia    | 144478675721569   | 17841404613018720 | 910709251642787    |
| Madrugão Fortaleza | fortaleza | 1053081027880145  | 17841437228865257 | (pendente)         |

═══════════════════════════════════════════════════════════════
📊 ESTADO ATUAL (snapshot 02/06/2026)
═══════════════════════════════════════════════════════════════

✓ Repo criado e em produção
✓ Relatórios Maio/2026 publicados: Feio, Centro, Garcia
✓ Evento consolidado: Hamburger Day 28/05 Madrugão Centro+Garcia
✓ Hubs: só Feio tem hub (/feio/) — faltam academia/centro/garcia/fortaleza
✓ Mensagens WhatsApp Maio existem em:
   g:\Drives compartilhados\Fenice Lab\Fenice Lab\Fenice Lab\Clientes\
     ├── Hamburgueria Feio\Mensagem-WhatsApp-Relatorio-Maio.md
     └── (Madrugões e Academia ainda não)

❌ Pendentes:
• Mensagens WhatsApp Madrugão Centro/Garcia/Fortaleza (Maio)
• Mensagem WhatsApp Academia (Maio — nunca teve relatório)
• Hub de Academia, Centro, Garcia, Fortaleza
• Relatório Maio Academia + Fortaleza
• Atualizar mensagens existentes pra usar URL central.starkentecnologia.com.br
  (ainda usam relatorios.starkentecnologia.com.br)

═══════════════════════════════════════════════════════════════
🔑 CREDENCIAIS COMPARTILHADAS COM PROJETO FENICE
═══════════════════════════════════════════════════════════════

Mesma operação Meta, mesmos tokens — só o repo/branding é separado:

• Token Meta Long-Lived: o mesmo do Fenice (Long-Lived User Token
  de Juan, não expira porque ele é admin do app)
• Admin Basic Auth: user "fenice" / senha "4izpAb6WXi1PBiKIT"
• Token Meta App ID: 1247927810650503 (Sistema_Automacao_Portfolio)
• Pixels, páginas, ad accounts: mesmos IDs do mapping acima

═══════════════════════════════════════════════════════════════
🎯 WORKFLOW PADRÃO
═══════════════════════════════════════════════════════════════

# Rodar local
cd C:\Users\Juan\Documents\central-clientes
node --env-file=.env server.mjs
# → http://localhost:3032

# Push pra GitHub
PAT="ghp_..." (de central-clientes-tokens\GitHub PAT.md)
git remote set-url origin "https://x-access-token:${PAT}@github.com/ferramentastecnologia/central-clientes.git"
git push
git remote set-url origin "https://github.com/ferramentastecnologia/central-clientes.git"

# Deploy na VPS
ssh hostinger-vps "cd /var/www/central-clientes && git pull && pm2 restart central-clientes-starken"

# Atualizar mappings privados (não vão pelo Git)
scp data/clients-mapping.json hostinger-vps:/var/www/central-clientes/data/

═══════════════════════════════════════════════════════════════
🚫 NÃO FAZER NESTE CHAT
═══════════════════════════════════════════════════════════════

❌ Não trabalhar em clientes Fenice Lab (Suprema, Arena, Oca,
   Império, cotafácil) — esses ficam no chat antigo

❌ Não confundir os 2 projetos:
   • Fenice: github.com/feniceLab/dashboard-tr-fego-pago
     → /var/www/dashboard-trafego/ (porta 3031 na Hostinger)
     → relatorios.starkentecnologia.com.br (espelho)
     → relatorios.fenicelab.com.br (Fenice VPS)
   • Starken: github.com/ferramentastecnologia/central-clientes
     → /var/www/central-clientes/ (porta 3032 na Hostinger)
     → central.starkentecnologia.com.br

❌ Não criar arquivos no g:\Drives compartilhados\Fenice Lab\
   (esse vault é só Fenice). Documentar tudo Starken em:
     C:\Users\Juan\Documents\central-clientes\
     ou criar um vault Obsidian separado pra Starken

═══════════════════════════════════════════════════════════════
🛣️ PRIMEIROS PASSOS SUGERIDOS NESTE CHAT
═══════════════════════════════════════════════════════════════

1. Criar mensagens WhatsApp Maio pros 3 Madrugões + Academia
2. Atualizar mensagem WhatsApp Feio pra usar nova URL central.
3. Criar hubs faltantes (/academia/, /centro/, /garcia/, /fortaleza/)
4. Criar relatório Maio Academia
5. Configurar Cloudflare na frente do central.starkentecnologia.com.br
   (hoje está DNS only via Registro.br)

Por onde quer começar?
```

---

## Como usar

1. Abrir novo chat do Claude Code
2. Trocar pro diretório `C:\Users\Juan\Documents\central-clientes\` (o assistant vai detectar como cwd)
3. Colar o conteúdo dentro do bloco `Prompt pro novo chat` acima
4. Continuar a operação Starken por lá

---

## Estado deste chat (Fenice)

Aqui continuamos focados em:
- 🍕 Suprema Pizza
- 🥂 Arena Gourmet
- 🐔 Restaurante Oca
- 👑 Império do Sabor (pendente)
- 💼 cotafácil
- Manutenção dos 2 deploys da VPS Fenice + Starken-espelho (relatorios.starkentecnologia.com.br)

---

*Documento criado em 2026-06-02 · Handoff inicial da separação dos projetos*
