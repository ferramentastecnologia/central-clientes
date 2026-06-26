---
name: skill-central-clientes
description: Diretrizes de operação, diagnóstico e automação de anúncios no Meta Ads API para a Central de Clientes Starken. Cobre contornos de segurança de aplicativos em modo de desenvolvimento (Dev Mode), parâmetros obrigatórios para campanhas ABO e validação de permissões de páginas e contas.
---

# 🛠️ Skill Central de Clientes Starken — Meta Ads API

Esta skill reúne o conhecimento prático e os contornos operacionais necessários para interagir com a Meta Graph API no contexto da Central de Clientes Starken. Use esta referência ao criar scripts, diagnosticar falhas de envio de campanhas ou implementar novas rotas de tráfego pago.

---

## 1. Contornos da API do Meta Ads (Erros Comuns)

### 1.1 Bloqueio de App em Modo de Desenvolvimento (Dev Mode)
* **O Problema**: O aplicativo Meta (`Sistema_Automacao_Portfolio` ID: `1247927810650503`) está em modo de desenvolvimento. Isso impede a criação de novos criativos do tipo *dark post* ou inline (`object_story_spec`) associados a links de páginas externas. A API retornará o erro `1885183` com a mensagem *"O post do criativo dos anúncios foi criado por um app que está em modo de desenvolvimento"*.
* **O Contorno**: 
  1. Liste os criativos já existentes na conta de anúncios buscando pelo endpoint: `GET /act_<AD_ACCOUNT_ID>/adcreatives?fields=id,name`.
  2. Crie o anúncio vinculando o parâmetro `creative` a um ID existente: `creative: { creative_id: "<ID_EXISTENTE>" }`.
  3. Isso ignora o bloqueio do modo de desenvolvimento, pois a API não precisa criar um post de página novo.

### 1.2 Parâmetro Obrigatório `is_adset_budget_sharing_enabled` (Campanhas ABO)
* **O Problema**: Em versões recentes da Graph API (v23.0+), ao criar uma campanha sem orçamento definido no nível de campanha (ABO - Ad Budget Optimization), o Meta rejeita a criação caso o parâmetro de compartilhamento de orçamento não esteja explícito.
* **O Contorno**: Sempre inclua `"is_adset_budget_sharing_enabled": "false"` (como string ou boolean) no payload de criação da campanha.

### 1.3 Permissões de Página vs. Permissões de Conta de Anúncios
* Para ler dados de anúncios e criar campanhas/conjuntos, basta o token ter permissão de gerenciamento na Conta de Anúncios (`user_tasks: ["MANAGE", "ADVERTISE"]`).
* Para criar anúncios novos usando a identidade da página, o usuário que gerou o token **também precisa ter permissão explícita na Página do Facebook** (Advertiser/Moderator ou tarefa de criação de anúncios no Business Manager). 
* Caso o token não possua acesso à página desejada:
  * O endpoint `/page_id?fields=access_token` retornará apenas nome/id e omitirá o token da página.
  * Tentar criar um criativo associado a essa página falhará. O contorno é usar uma página que o token controle (como `Starken Tecnologia` ID `834815589718543`) apenas para fins de testes.

---

## 2. Padrão de Implementação de Requisições
* **Use chamadas diretas**: Prefira fazer chamadas `fetch` brutas para os endpoints da API (ex: `https://graph.facebook.com/v23.0/...`) em vez de utilizar SDKs rígidos ou ferramentas MCP prontas. Isso permite ler e tratar o payload completo de erros detalhados (`error_subcode`, `error_user_title`, `error_user_msg`) enviados pelo Meta.
* **Envio de Parâmetros**: Envie os parâmetros de criação usando `URLSearchParams` para chamadas `POST` simples:
  ```javascript
  const params = new URLSearchParams({
    name: 'Nome da Entidade',
    status: 'PAUSED', // Sempre criar pausado!
    access_token: token,
    ...
  });
  ```
