// Servidor HTTP — Dashboard de Tráfego Pago (Meta Graph API)
//
// Configuração via variáveis de ambiente (ou .env):
//   PORT                  — porta HTTP (default 3000)
//   META_GRAPH_TOKEN      — Long-Lived Token Meta Graph API (prioridade alta)
//   TOKEN_FILE            — caminho do arquivo .md com token (fallback)
//   CLIENTS_DIR           — pasta raiz dos clientes (pra aliases de assets)
//
// Uso:
//   node server.mjs

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Caminhos configuráveis via env (com defaults sensatos)
const TOKEN_FILE = process.env.TOKEN_FILE
  ? path.resolve(process.env.TOKEN_FILE)
  : path.resolve(__dirname, 'Clientes', 'Tokens', 'Graph API Token.md');

const CLIENTS_DIR = process.env.CLIENTS_DIR
  ? path.resolve(process.env.CLIENTS_DIR)
  : path.resolve(__dirname, 'Clientes');

// Aliases de assets de clientes — lidos de data/client-aliases.json
// (use .example como template e copie pra .json local)
let CLIENT_ALIASES = {};
try {
  const aliasesRaw = await fs.readFile(path.join(__dirname, 'data', 'client-aliases.json'), 'utf-8');
  CLIENT_ALIASES = JSON.parse(aliasesRaw);
} catch {
  console.warn('⚠️  data/client-aliases.json não encontrado — aliases desabilitados');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

// Lê token — prioridade: env var > arquivo .md
async function readToken() {
  if (process.env.META_GRAPH_TOKEN) {
    return process.env.META_GRAPH_TOKEN.trim();
  }
  try {
    const content = await fs.readFile(TOKEN_FILE, 'utf-8');
    const match = content.match(/```token-start\s*\n([\s\S]+?)\n```token-end/);
    if (!match) return null;
    const token = match[1].trim();
    if (token.startsWith('COLE-AQUI') || token.length < 50) return null;
    return token;
  } catch {
    return null;
  }
}

const CACHE_TTL_MS = 60_000;
let cache = { data: null, ts: 0 };
let renovacaoCache = { data: null, ts: 0 };
let adminCache = { data: null, ts: 0 };
let clientsCache = { data: null, ts: 0 };
const monitorCache = new Map(); // periodKey -> { data, ts }
const MONITOR_TTL_MS = 1_800_000; // 30 min — alivia o rate limit do app
let galeriaCache = { data: null, ts: 0 };
const GALERIA_TTL_MS = 600_000; // 10 min — posts mudam pouco; protege contra rate limit

// Page tokens são estáveis — cachear evita refazer essa chamada a cada request
// (reduz muito a pressão no rate limit do app: galeria + agendamentos).
const pageTokenCache = new Map(); // pageId -> { token, ts }
const PAGE_TOKEN_TTL_MS = 3_600_000; // 1h
let lastAppUsage = null; // X-App-Usage mais recente (% de uso do limite do app)
async function getPageToken(pageId, userToken) {
  const cached = pageTokenCache.get(pageId);
  if (cached && (Date.now() - cached.ts) < PAGE_TOKEN_TTL_MS) return cached.token;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/${pageId}?fields=access_token&access_token=${userToken}`);
    const usage = r.headers.get('x-app-usage');
    if (usage) { try { lastAppUsage = { ...JSON.parse(usage), at: new Date().toISOString() }; } catch {} }
    const j = await r.json();
    if (j.access_token) {
      pageTokenCache.set(pageId, { token: j.access_token, ts: Date.now() });
      return j.access_token;
    }
    return { error: j.error || { message: 'sem access_token' } };
  } catch (e) { return { error: { message: e.message } }; }
}

// ──────────────────────────────────────────────────────────────────────────────
// BASIC AUTH (área admin)
// ──────────────────────────────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function requireAdminAuth(req, res) {
  if (!ADMIN_USER || !ADMIN_PASS) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Admin area desabilitada — defina ADMIN_USER e ADMIN_PASS no .env do servidor.');
    return false;
  }
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
      const idx = decoded.indexOf(':');
      if (idx > 0) {
        const u = decoded.slice(0, idx);
        const p = decoded.slice(idx + 1);
        if (u === ADMIN_USER && p === ADMIN_PASS) return true;
      }
    } catch {}
  }
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Starken Admin", charset="UTF-8"',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end('Autenticação necessária');
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN — agregação de status de tokens, páginas e ad accounts
// ──────────────────────────────────────────────────────────────────────────────
async function fetchAdminStatus() {
  const now = Date.now();
  if (adminCache.data && (now - adminCache.ts) < CACHE_TTL_MS) return adminCache.data;

  const token = await readToken();
  if (!token) {
    return {
      updated_at: new Date().toISOString(),
      error: 'token_not_found',
      message: 'Token não encontrado. Configure META_GRAPH_TOKEN ou TOKEN_FILE.',
    };
  }

  // 1. Validação do User Token + app usage (headers)
  let user = null;
  let appUsage = null;
  let userErr = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,name,email&access_token=${token}`);
    const usage = r.headers.get('x-app-usage');
    if (usage) { try { appUsage = JSON.parse(usage); } catch {} }
    const j = await r.json();
    if (j.error) userErr = j.error;
    else user = j;
  } catch (e) { userErr = { message: e.message }; }

  // 2. debug_token — escopo + expiração
  let debug = null;
  let debugErr = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/debug_token?input_token=${token}&access_token=${token}`);
    const j = await r.json();
    if (j.error) debugErr = j.error;
    else debug = j.data;
  } catch (e) { debugErr = { message: e.message }; }

  // 2b. Carrega mapping de clientes (pra enriquecer com agencia + buscar páginas não-listadas via page_id direto)
  let clientsMapping = { clients: [] };
  try {
    const mappingRaw = await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8');
    clientsMapping = JSON.parse(mappingRaw);
  } catch {}
  const pageIdToClient = {};
  const adAccountIdToClient = {};
  clientsMapping.clients.forEach(c => {
    if (c.page_id) pageIdToClient[c.page_id] = c;
    if (c.ad_account_id) adAccountIdToClient[c.ad_account_id] = c;
  });

  const mapPageData = (p, source) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    tasks: p.tasks || [],
    has_page_token: !!p.access_token,
    source,
    agencia: pageIdToClient[p.id]?.agencia || null,
    cliente_slug: pageIdToClient[p.id]?.slug || null,
    instagram: p.instagram_business_account ? {
      id: p.instagram_business_account.id,
      username: p.instagram_business_account.username,
      name: p.instagram_business_account.name,
      followers: p.instagram_business_account.followers_count,
      avatar: p.instagram_business_account.profile_picture_url,
    } : null,
  });

  // 3. Páginas via /me/accounts (rota natural)
  let pages = [];
  let pagesErr = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,category,tasks,instagram_business_account{id,username,name,followers_count,profile_picture_url}&limit=100&access_token=${token}`);
    const j = await r.json();
    if (j.error) pagesErr = j.error;
    else pages = (j.data || []).map(p => mapPageData(p, 'me/accounts'));
  } catch (e) { pagesErr = { message: e.message }; }

  // 3b. Páginas mapeadas mas NÃO retornadas por /me/accounts → buscar via page_id direto
  // (caso Suprema: acesso via BM, não via /me/accounts)
  const foundIds = new Set(pages.map(p => p.id));
  const missingMapped = clientsMapping.clients.filter(c => c.page_id && !foundIds.has(c.page_id));
  if (missingMapped.length) {
    const extras = await Promise.all(missingMapped.map(async (c) => {
      try {
        const r = await fetch(`https://graph.facebook.com/v23.0/${c.page_id}?fields=id,name,access_token,category,instagram_business_account{id,username,name,followers_count,profile_picture_url}&access_token=${token}`);
        const j = await r.json();
        if (j.error || !j.id) return null;
        return mapPageData(j, 'direct');
      } catch { return null; }
    }));
    extras.filter(Boolean).forEach(p => pages.push(p));
  }

  // Pendentes (clientes Starken sem page_id ainda)
  const pendingClients = clientsMapping.clients
    .filter(c => !c.page_id && c.agencia === 'Starken')
    .map(c => ({
      id: null,
      name: c.name,
      pending: true,
      status: c.status || 'Aguardando setup',
      agencia: c.agencia,
      cliente_slug: c.slug,
      ad_account_id: c.ad_account_id || null,
    }));

  // 4. Ad accounts
  let adAccounts = [];
  let adAccountsErr = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/me/adaccounts?fields=id,account_id,name,account_status,disable_reason,currency,timezone_name,balance,amount_spent,spend_cap,business{id,name}&limit=200&access_token=${token}`);
    const j = await r.json();
    if (j.error) adAccountsErr = j.error;
    else adAccounts = (j.data || []).map(a => ({
      id: a.id,
      account_id: a.account_id,
      name: a.name,
      status: a.account_status,
      disable_reason: a.disable_reason,
      currency: a.currency,
      timezone: a.timezone_name,
      balance_cents: a.balance ? parseInt(a.balance) : null,
      amount_spent_cents: a.amount_spent ? parseInt(a.amount_spent) : null,
      spend_cap_cents: a.spend_cap ? parseInt(a.spend_cap) : null,
      business: a.business ? { id: a.business.id, name: a.business.name } : null,
      agencia: adAccountIdToClient[a.account_id]?.agencia || null,
      cliente_slug: adAccountIdToClient[a.account_id]?.slug || null,
      cliente_nome: adAccountIdToClient[a.account_id]?.name || null,
    }));
  } catch (e) { adAccountsErr = { message: e.message }; }

  // 5. Business managers acessíveis
  let businesses = [];
  let businessesErr = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/me/businesses?fields=id,name,verification_status,created_time&limit=50&access_token=${token}`);
    const j = await r.json();
    if (j.error) businessesErr = j.error;
    else businesses = j.data || [];
  } catch (e) { businessesErr = { message: e.message }; }

  // 6. Calcula dias até expirar (debug.expires_at é unix ts em seg; 0 = não expira)
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = debug?.expires_at && debug.expires_at > 0 ? debug.expires_at : null;
  const dataAccessExp = debug?.data_access_expires_at && debug.data_access_expires_at > 0 ? debug.data_access_expires_at : null;
  const daysLeft = expiresAt ? Math.floor((expiresAt - nowSec) / 86400) : null;
  // Pra tokens que não expiram, usar data_access_expires_at (90 dias) como heads-up
  const daysLeftDataAccess = dataAccessExp ? Math.floor((dataAccessExp - nowSec) / 86400) : null;

  let tokenHealth = 'unknown';
  let nonExpiring = false;
  if (userErr) tokenHealth = 'invalid';
  else if (debug?.expires_at === 0) {
    // Token "permanente" (admin/dev/tester do app). Verificar só data access.
    nonExpiring = true;
    if (daysLeftDataAccess === null) tokenHealth = 'ok';
    else if (daysLeftDataAccess <= 0) tokenHealth = 'expired';
    else if (daysLeftDataAccess < 7) tokenHealth = 'critical';
    else if (daysLeftDataAccess < 14) tokenHealth = 'warn';
    else tokenHealth = 'ok';
  }
  else if (daysLeft === null) tokenHealth = 'unknown';
  else if (daysLeft <= 0) tokenHealth = 'expired';
  else if (daysLeft < 7) tokenHealth = 'critical';
  else if (daysLeft < 14) tokenHealth = 'warn';
  else tokenHealth = 'ok';

  const result = {
    updated_at: new Date().toISOString(),
    token: {
      health: tokenHealth,
      valid: !userErr,
      user,
      user_error: userErr,
      expires_at: expiresAt,
      days_left: daysLeft,
      data_access_expires_at: dataAccessExp,
      days_left_data_access: daysLeftDataAccess,
      non_expiring: nonExpiring,
      scopes: debug?.scopes || [],
      app_id: debug?.app_id || null,
      type: debug?.type || null,
      issued_at: debug?.issued_at || null,
      debug_error: debugErr,
    },
    app_usage: appUsage,
    pages,
    pages_error: pagesErr,
    pages_count: pages.length,
    pages_with_ig: pages.filter(p => p.instagram).length,
    pending_clients: pendingClients,
    ad_accounts: adAccounts,
    ad_accounts_error: adAccountsErr,
    ad_accounts_count: adAccounts.length,
    businesses,
    businesses_error: businessesErr,
  };

  adminCache = { data: result, ts: now };
  return result;
}

async function fetchAgendamentos() {
  const now = Date.now();
  if (cache.data && (now - cache.ts) < CACHE_TTL_MS) return cache.data;

  const token = await readToken();
  if (!token) {
    return {
      updated_at: new Date().toISOString(),
      error: 'token_not_found',
      message: 'Token não encontrado. Configure META_GRAPH_TOKEN (env) ou preencha TOKEN_FILE.',
      clients: [],
      crons: [],
    };
  }

  let mapping;
  try {
    const mappingRaw = await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8');
    mapping = JSON.parse(mappingRaw);
  } catch {
    return { updated_at: new Date().toISOString(), error: 'clients_mapping_missing', message: 'data/clients-mapping.json não encontrado. Use o .example como template.', clients: [], crons: [] };
  }

  let cronsData = { crons: [] };
  try {
    const cronsRaw = await fs.readFile(path.join(__dirname, 'data', 'crons.json'), 'utf-8');
    cronsData = JSON.parse(cronsRaw);
  } catch {}

  let publishedData = { posts: [] };
  try {
    const pubRaw = await fs.readFile(path.join(__dirname, 'data', 'posts-publicados.json'), 'utf-8');
    publishedData = JSON.parse(pubRaw);
  } catch {}

  let storiesData = { stories: [] };
  try {
    const stRaw = await fs.readFile(path.join(__dirname, 'data', 'stories-publicados.json'), 'utf-8');
    storiesData = JSON.parse(stRaw);
  } catch {}

  // SUPABASE INTEGRATION: Mesclar dados do Supabase
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (supaUrl && supaKey) {
    try {
      const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` };
      
      const getMappedClient = (key) => {
        if (!key) return null;
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (mapping.clients || []).find(c => {
          const cleanSlug = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanKey.includes(cleanSlug) || cleanSlug.includes(cleanKey);
        });
      };

      const qRes = await fetch(`${supaUrl}/rest/v1/publish_queue?status=in.(QUEUED,PROCESSING)`, { headers });
      const qData = await qRes.json();
      if (Array.isArray(qData)) {
        qData.forEach(item => {
          const mapped = getMappedClient(item.client_key);
          if (!mapped) return;
          cronsData.crons.push({
            id: item.id,
            client_slug: mapped.slug,
            client: mapped.name,
            kind: item.post_type || 'feed',
            next_fire_iso: item.scheduled_for,
            image_url: (item.image_urls && item.image_urls.length > 0) ? item.image_urls[0] : null,
            images: item.image_urls || null,
            caption: item.caption || '',
            status: 'pending',
            description: item.caption ? item.caption.substring(0, 60) + '...' : 'Post do Supabase',
            channels: item.platform === 'both' ? ['ig', 'fb'] : [item.platform || 'ig']
          });
        });
      }

      const hRes = await fetch(`${supaUrl}/rest/v1/publish_history?status=eq.PUBLISHED`, { headers });
      const hData = await hRes.json();
      if (Array.isArray(hData)) {
        hData.forEach(item => {
          let imgs = null;
          if (item.image_url && item.image_url.startsWith('[')) {
            try { imgs = JSON.parse(item.image_url); } catch(e) {}
          } else if (item.image_url) {
            imgs = [item.image_url];
          }
          const mapped = getMappedClient(item.client_key);
          if (!mapped) return;
          const rec = {
            id: item.post_id || item.id,
            client_slug: mapped.slug,
            client: mapped.name,
            published_iso: item.created_at || item.scheduled_for || new Date().toISOString(),
            caption: item.caption,
            image_url: imgs ? imgs[0] : null,
            images: imgs,
            channels: item.platform === 'both' ? ['ig', 'fb'] : [item.platform || 'ig'],
            ig_permalink: item.post_url,
          };
          publishedData.posts.push(rec);
        });
      }
    } catch(err) {
      console.error('Erro ao buscar Supabase:', err.message);
    }
  }

  const clientPromises = mapping.clients.map(async (client) => {
    try {
      const pageToken = await getPageToken(client.page_id, token);
      if (typeof pageToken !== 'string') {
        return { ...client, fb_scheduled_posts: [], error: pageToken?.error?.message || 'Page access token não disponível' };
      }

      const url = `https://graph.facebook.com/v23.0/${client.page_id}/scheduled_posts?fields=id,scheduled_publish_time,is_published,attachments,created_time,full_picture,permalink_url&access_token=${pageToken}`;
      const res = await fetch(url);
      const data = await res.json();

      const fbScheduled = (data.data || []).map((p) => ({
        id: p.id,
        scheduled_publish_time: p.scheduled_publish_time,
        scheduled_publish_iso: new Date(p.scheduled_publish_time * 1000).toISOString(),
        time_remaining_seconds: p.scheduled_publish_time - Math.floor(Date.now() / 1000),
        message_preview: p.attachments?.data?.[0]?.description || '',
        image_url: p.full_picture || null,
        permalink: p.permalink_url || null,
      }));

      return {
        ...client,
        fb_scheduled_posts: fbScheduled,
        error: data.error?.message || null,
      };
    } catch (err) {
      return { ...client, fb_scheduled_posts: [], error: err.message };
    }
  });

  const clients = await Promise.all(clientPromises);

  let tokenValid = false;
  let tokenInfo = null;
  try {
    const meRes = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,name&access_token=${token}`);
    const me = await meRes.json();
    if (me.id) {
      tokenValid = true;
      tokenInfo = { user_id: me.id, name: me.name };
    }
  } catch {}

  const result = {
    updated_at: new Date().toISOString(),
    token_status: tokenValid ? 'valid' : 'invalid_or_expired',
    token_info: tokenInfo,
    clients,
    crons: cronsData.crons,
    posts_publicados: publishedData.posts || [],
    stories_publicados: storiesData.stories || [],
  };

  cache = { data: result, ts: now };
  return result;
}

async function fetchRenovacao() {
  const now = Date.now();
  if (renovacaoCache.data && (now - renovacaoCache.ts) < CACHE_TTL_MS) return renovacaoCache.data;

  const token = await readToken();
  if (!token) {
    return { error: 'token_not_found', mes: null, campanhas: [] };
  }

  let cfg;
  try {
    const cfgRaw = await fs.readFile(path.join(__dirname, 'data', 'renovacao-mes.json'), 'utf-8');
    cfg = JSON.parse(cfgRaw);
  } catch {
    return { error: 'config_missing', message: 'data/renovacao-mes.json não encontrado. Use o .example como template.', mes: null, campanhas: [] };
  }

  const enriched = await Promise.all(cfg.campanhas.map(async (c) => {
    if (!c.campaign_id || !c.ad_account_id || c.budget_type === 'manual') {
      return { ...c, metrics: null };
    }
    try {
      const [maxRes, lastRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v23.0/${c.campaign_id}/insights?fields=spend,impressions,actions,purchase_roas&date_preset=maximum&access_token=${token}`),
        fetch(`https://graph.facebook.com/v23.0/${c.campaign_id}/insights?fields=spend,impressions,actions,purchase_roas&date_preset=last_month&access_token=${token}`)
      ]);
      const maxData = await maxRes.json();
      const lastData = await lastRes.json();

      const parseInsight = (d) => {
        const row = d.data?.[0];
        if (!row) return null;
        const omni = (row.actions || []).find(a => a.action_type === 'omni_purchase');
        const roas = row.purchase_roas?.[0]?.value || row.purchase_roas?.find?.(r => r.action_type === 'omni_purchase')?.value;
        return {
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          purchases: parseInt(omni?.value || 0),
          roas: parseFloat(roas || 0),
        };
      };

      return {
        ...c,
        metrics: {
          historico: parseInsight(maxData),
          mes_anterior: parseInsight(lastData),
        }
      };
    } catch (err) {
      return { ...c, metrics: null, error: err.message };
    }
  }));

  const result = {
    mes: cfg.mes,
    mes_label: cfg.mes_label,
    atualizado_em: new Date().toISOString(),
    resumo: {
      total: cfg.campanhas.length,
      renovadas: cfg.campanhas.filter(c => c.status === 'renovada').length,
      pendentes: cfg.campanhas.filter(c => c.status === 'pendente').length,
      manuais: cfg.campanhas.filter(c => c.status === 'manual').length,
      investimento_total_mes_cents: cfg.campanhas.reduce((s, c) => s + (c.budget_novo_mes_cents || 0), 0),
    },
    campanhas: enriched,
  };

  renovacaoCache = { data: result, ts: now };
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// MONITOR — campanhas ativas em tempo real (admin only)
// ──────────────────────────────────────────────────────────────────────────────
const AD_ACCOUNT_STATUS = {
  1: 'ATIVA', 2: 'DESATIVADA', 3: 'NÃO LIQUIDADA', 7: 'EM REVISÃO DE RISCO',
  8: 'PENDENTE', 9: 'PERÍODO DE GRAÇA', 100: 'PENDENTE FECHAMENTO', 101: 'FECHADA',
  201: 'ATIVÁVEL', 202: 'FECHÁVEL',
};

function parseInsightRow(row) {
  if (!row) return null;
  const actions = row.actions || [];
  const omni = actions.find(a => a.action_type === 'omni_purchase')
            || actions.find(a => a.action_type === 'purchase');
  const roasArr = row.purchase_roas || [];
  const roasObj = roasArr.find(r => r.action_type === 'omni_purchase') || roasArr[0];
  const spend = parseFloat(row.spend || 0);
  const roas = parseFloat(roasObj?.value || 0);
  return {
    spend,
    impressions: parseInt(row.impressions || 0),
    clicks: parseInt(row.clicks || 0),
    ctr: parseFloat(row.ctr || 0),
    cpm: parseFloat(row.cpm || 0),
    purchases: parseInt(omni?.value || 0),
    roas,
    revenue: +(spend * roas).toFixed(2),
  };
}

const MONITOR_PERIODS = {
  today:      { preset: 'today',      label: 'Hoje' },
  last_7d:    { preset: 'last_7d',    label: 'Últimos 7 dias' },
  this_month: { preset: 'this_month', label: 'Mês atual' },
};

function buildPeriodClauses(period, since, until) {
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (period === 'custom' && isDate(since) && isDate(until)) {
    return {
      key: `custom:${since}:${until}`,
      label: `${since.split('-').reverse().join('/')} a ${until.split('-').reverse().join('/')}`,
      acct: `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`,
      camp: `time_range(%7B'since':'${since}','until':'${until}'%7D)`,
      since, until, selected: 'custom',
    };
  }
  const p = MONITOR_PERIODS[period] || MONITOR_PERIODS.today;
  return {
    key: p.preset, label: p.label,
    acct: `date_preset=${p.preset}`, camp: `date_preset(${p.preset})`,
    since: null, until: null, selected: MONITOR_PERIODS[period] ? period : 'today',
  };
}

async function fetchMonitor(period = 'today', since = null, until = null) {
  const pc = buildPeriodClauses(period, since, until);
  const now = Date.now();
  const cached = monitorCache.get(pc.key);
  if (cached && (now - cached.ts) < MONITOR_TTL_MS) return cached.data;

  const periodMeta = { key: pc.key, label: pc.label, since: pc.since, until: pc.until, selected: pc.selected };
  const token = await readToken();
  if (!token) {
    return { updated_at: new Date().toISOString(), error: 'token_not_found', message: 'Token não encontrado. Configure META_GRAPH_TOKEN.', period: periodMeta, clients: [], pending: [] };
  }

  let mapping = { clients: [] };
  try {
    mapping = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8'));
  } catch {
    return { updated_at: new Date().toISOString(), error: 'mapping_missing', period: periodMeta, clients: [], pending: [] };
  }

  const withAcct = mapping.clients.filter(c => c.ad_account_id);
  const F = 'spend,impressions,clicks,ctr,cpm,actions,purchase_roas';

  const clients = await Promise.all(withAcct.map(async (c) => {
    const act = `act_${c.ad_account_id}`;
    try {
      const [insR, campR, acctR] = await Promise.all([
        fetch(`https://graph.facebook.com/v23.0/${act}/insights?fields=${F}&${pc.acct}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v23.0/${act}/campaigns?fields=name,status,effective_status,daily_budget,lifetime_budget,insights.${pc.camp}{spend,impressions,clicks,ctr,actions,purchase_roas}&limit=80&access_token=${token}`),
        fetch(`https://graph.facebook.com/v23.0/${act}?fields=name,account_status,balance,currency&access_token=${token}`),
      ]);
      const [ins, camp, acct] = await Promise.all([insR.json(), campR.json(), acctR.json()]);

      const campaigns = (camp.data || []).map(cp => ({
        id: cp.id,
        name: cp.name,
        status: cp.status,
        effective_status: cp.effective_status,
        daily_budget_cents: cp.daily_budget ? parseInt(cp.daily_budget) : null,
        lifetime_budget_cents: cp.lifetime_budget ? parseInt(cp.lifetime_budget) : null,
        period: parseInsightRow(cp.insights?.data?.[0]),
      }));
      campaigns.sort((a, b) => {
        const aa = a.effective_status === 'ACTIVE' ? 1 : 0;
        const bb = b.effective_status === 'ACTIVE' ? 1 : 0;
        if (aa !== bb) return bb - aa;
        return (b.period?.spend || 0) - (a.period?.spend || 0);
      });
      const activeCount = campaigns.filter(cp => cp.effective_status === 'ACTIVE').length;

      return {
        slug: c.slug,
        name: c.name,
        agencia: c.agencia || null,
        ad_account_id: c.ad_account_id,
        account: {
          status_code: acct.account_status ?? null,
          status_label: AD_ACCOUNT_STATUS[acct.account_status] || (acct.account_status != null ? `COD ${acct.account_status}` : '—'),
          is_active: acct.account_status === 1,
          currency: acct.currency || 'BRL',
          balance_cents: acct.balance != null ? parseInt(acct.balance) : null,
        },
        metrics: parseInsightRow(ins.data?.[0]),
        campaigns,
        campaigns_total: campaigns.length,
        active_count: activeCount,
        paused_count: campaigns.length - activeCount,
        error: ins.error?.message || camp.error?.message || acct.error?.message || null,
      };
    } catch (e) {
      return { slug: c.slug, name: c.name, ad_account_id: c.ad_account_id, error: e.message };
    }
  }));

  const pending = mapping.clients
    .filter(c => !c.ad_account_id)
    .map(c => ({ slug: c.slug, name: c.name, pending: true }));

  const totals = clients.reduce((a, c) => {
    if (c.metrics) { a.spend += c.metrics.spend; a.revenue += c.metrics.revenue; a.purchases += c.metrics.purchases; a.impressions += c.metrics.impressions; }
    a.active += c.active_count || 0;
    return a;
  }, { spend: 0, revenue: 0, purchases: 0, impressions: 0, active: 0 });
  totals.spend = +totals.spend.toFixed(2);
  totals.revenue = +totals.revenue.toFixed(2);
  totals.roas = totals.spend > 0 ? +(totals.revenue / totals.spend).toFixed(2) : 0;

  const result = {
    updated_at: new Date().toISOString(),
    period: periodMeta,
    totals,
    clients_count: clients.length,
    clients,
    pending,
  };
  monitorCache.set(pc.key, { data: result, ts: now });
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// GALERIA — posts publicados (IG + FB) por cliente (admin only)
// ──────────────────────────────────────────────────────────────────────────────
async function fetchPostsGaleria() {
  const now = Date.now();
  if (galeriaCache.data && (now - galeriaCache.ts) < GALERIA_TTL_MS) return galeriaCache.data;

  const token = await readToken();
  if (!token) return { updated_at: new Date().toISOString(), error: 'token_not_found', clients: [] };

  let mapping = { clients: [] };
  try {
    mapping = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8'));
  } catch {
    return { updated_at: new Date().toISOString(), error: 'mapping_missing', clients: [] };
  }

  const clients = await Promise.all(mapping.clients.map(async (c) => {
    const posts = [];
    let error = null;

    // Instagram — posts publicados (feed)
    if (c.ig_business_id) {
      try {
        const r = await fetch(`https://graph.facebook.com/v23.0/${c.ig_business_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${token}`);
        const j = await r.json();
        if (j.error) error = 'IG: ' + j.error.message;
        else (j.data || []).forEach(m => posts.push({
          source: 'instagram',
          id: m.id,
          type: m.media_type,
          thumb: m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url || null) : (m.media_url || null),
          permalink: m.permalink || null,
          timestamp: m.timestamp,
          caption: (m.caption || '').slice(0, 280),
          likes: m.like_count ?? null,
          comments: m.comments_count ?? null,
        }));
      } catch (e) { error = 'IG: ' + e.message; }
    }

    // Facebook — posts publicados (best-effort; usa page token cacheado)
    let fb_note = null;
    const rateLimited = (err) => err && (err.code === 4 || /request limit/i.test(err.message || ''));
    if (c.page_id) {
      const pToken = await getPageToken(c.page_id, token);
      if (typeof pToken === 'string') {
        try {
          const r = await fetch(`https://graph.facebook.com/v23.0/${c.page_id}/published_posts?fields=id,message,created_time,permalink_url,full_picture&limit=8&access_token=${pToken}`);
          const j = await r.json();
          if (j.error) fb_note = rateLimited(j.error) ? 'Facebook no limite de chamadas da Meta' : 'FB: ' + j.error.message;
          else (j.data || []).forEach(p => posts.push({
            source: 'facebook',
            id: p.id,
            type: p.full_picture ? 'IMAGE' : 'STATUS',
            thumb: p.full_picture || null,
            permalink: p.permalink_url || null,
            timestamp: p.created_time,
            caption: (p.message || '').slice(0, 280),
            likes: null,
            comments: null,
          }));
        } catch (e) { fb_note = 'FB: ' + e.message; }
      } else if (pToken && pToken.error) {
        fb_note = rateLimited(pToken.error) ? 'Facebook no limite de chamadas da Meta' : 'FB: ' + pToken.error.message;
      }
    }

    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      slug: c.slug,
      name: c.name,
      agencia: c.agencia || null,
      ig_username: c.ig_username || null,
      posts,
      total: posts.length,
      error,
      fb_note,
    };
  }));

  const result = {
    updated_at: new Date().toISOString(),
    app_usage: lastAppUsage,
    galeria_ttl_min: Math.round(GALERIA_TTL_MS / 60000),
    clients,
  };
  galeriaCache = { data: result, ts: now };
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// OPERAÇÕES — estruturas de campanha por cliente (admin only) · V1
// ──────────────────────────────────────────────────────────────────────────────
const estruturasCache = new Map(); // slug -> { data, ts }
const ESTRUTURAS_TTL_MS = 600_000; // 10 min

const OBJ_LABEL = {
  OUTCOME_SALES: 'Vendas', OUTCOME_AWARENESS: 'Reconhecimento', OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento', OUTCOME_LEADS: 'Leads', OUTCOME_APP_PROMOTION: 'App',
};

// Selos cruzando a estrutura com as regras da skill trafego-pago (§2/§3)
function computeAdsetFlags(objective, adset) {
  const flags = [];
  const t = adset.targeting || {};
  const dev = t.device_platforms || [];
  const isMobileOnly = dev.length === 1 && dev[0] === 'mobile';
  const hasManual = (t.facebook_positions || []).length > 0 || (t.instagram_positions || []).length > 0;
  const px = adset.promoted_object || {};
  const hasDayparting = (adset.pacing_type || []).includes('day_parting') && (adset.adset_schedule || []).length > 0;

  if (objective === 'OUTCOME_SALES') {
    flags.push(isMobileOnly ? { l: 'ok', t: 'Mobile-only' } : { l: 'warn', t: 'Não é mobile-only (' + (dev.length ? dev.join('+') : 'todos') + ')' });
    flags.push((px.pixel_id && px.custom_event_type === 'PURCHASE') ? { l: 'ok', t: 'Pixel + PURCHASE' } : { l: 'warn', t: 'Sem pixel/PURCHASE' });
    flags.push(adset.optimization_goal === 'OFFSITE_CONVERSIONS' ? { l: 'ok', t: 'Otim. Conversões' } : { l: 'warn', t: 'Otim: ' + adset.optimization_goal });
  } else if (objective === 'OUTCOME_AWARENESS') {
    flags.push(adset.optimization_goal === 'REACH' ? { l: 'ok', t: 'Otim. Alcance' } : { l: 'info', t: 'Otim: ' + adset.optimization_goal });
  }
  flags.push(hasManual ? { l: 'ok', t: 'Posic. manual' } : { l: 'info', t: 'Posic. automático' });
  if (hasDayparting) flags.push({ l: 'info', t: 'Day-parting · ' + adset.adset_schedule.length + ' janela(s)' });
  if (adset.frequency_control_specs) flags.push({ l: 'info', t: 'Freq. controlada' });
  return flags;
}

// Insights (gasto, resultados, ROAS, CPA, CTR, CPM, alcance) a partir de uma linha de insights
function parseInsightsFull(insRow) {
  if (!insRow) return null;
  const actions = insRow.actions || [];
  const vals = insRow.action_values || [];
  const omni = actions.find(a => a.action_type === 'omni_purchase') || actions.find(a => a.action_type === 'purchase');
  const omniVal = vals.find(a => a.action_type === 'omni_purchase') || vals.find(a => a.action_type === 'purchase');
  const lc = actions.find(a => a.action_type === 'link_click');
  const roasArr = insRow.purchase_roas || [];
  const roasObj = roasArr.find(r => r.action_type === 'omni_purchase') || roasArr[0];
  const spend = parseFloat(insRow.spend || 0);
  const purchases = parseInt(omni?.value || 0);
  const roas = parseFloat(roasObj?.value || 0);
  const revenue = omniVal ? parseFloat(omniVal.value || 0) : +(spend * roas).toFixed(2);
  return {
    spend, impressions: parseInt(insRow.impressions || 0), reach: parseInt(insRow.reach || 0),
    frequency: parseFloat(insRow.frequency || 0), clicks: parseInt(insRow.clicks || 0),
    link_clicks: parseInt(lc?.value || 0), ctr: parseFloat(insRow.ctr || 0),
    cpm: parseFloat(insRow.cpm || 0), cpc: parseFloat(insRow.cpc || 0),
    purchases, revenue: +revenue.toFixed(2), roas,
    cpa: purchases > 0 ? +(spend / purchases).toFixed(2) : null,
  };
}

// Criativo: título, copy, descrição, CTA, link, imagem (resolvendo asset_feed_spec)
function parseCreative(cr) {
  if (!cr) return null;
  const afs = cr.asset_feed_spec || {};
  const oss = cr.object_story_spec || {};
  const ld = oss.link_data || oss.video_data || oss.photo_data || {};
  const hashes = [];
  (afs.images || []).forEach(im => { if (im.hash) hashes.push({ label: im.adlabels?.[0]?.name || null, hash: im.hash }); });
  if (!hashes.length && ld.image_hash) hashes.push({ label: null, hash: ld.image_hash });
  // vídeos: asset_feed_spec.videos (asset customization) ou object_story_spec.video_data (vídeo único)
  const videoRefs = [];
  (afs.videos || []).forEach(v => { if (v.video_id) videoRefs.push({ label: v.adlabels?.[0]?.name || null, video_id: v.video_id, thumb: v.thumbnail_url || null }); });
  if (!videoRefs.length && oss.video_data?.video_id) videoRefs.push({ label: null, video_id: oss.video_data.video_id, thumb: oss.video_data.image_url || null });
  // fallback: vídeo no nível do criativo (ex.: tráfego impulsionando reel do Instagram)
  if (!videoRefs.length && cr.video_id) videoRefs.push({ label: null, video_id: cr.video_id, thumb: cr.image_url || cr.thumbnail_url || null });
  return {
    id: cr.id,
    title: cr.title || afs.titles?.[0]?.text || ld.name || null,
    body: cr.body || afs.bodies?.[0]?.text || ld.message || null,
    description: ld.description || afs.descriptions?.[0]?.text || null,
    cta: cr.call_to_action_type || afs.call_to_action_types?.[0] || ld.call_to_action?.type || null,
    link: ld.link || afs.link_urls?.[0]?.website_url || null,
    thumbnail: cr.thumbnail_url || null,
    image_direct: cr.image_url || null,
    hashes, // resolvidos depois em fetchEstruturas (adimages → URL alta)
    videoRefs, // resolvidos depois (video_id → source mp4 + poster)
    ig_permalink: cr.instagram_permalink_url || null, // reel do IG (fallback de play p/ vídeos sem source)
    customized: (afs.asset_customization_rules || []).length > 0,
  };
}

// Direcionamento legível: geo, idade, gênero, dispositivo, posicionamento, interesses
function parseTargeting(t) {
  if (!t) return {};
  const geo = t.geo_locations || {};
  const parts = [];
  (geo.custom_locations || []).forEach(l => parts.push(`raio ${l.radius}${l.distance_unit === 'kilometer' ? 'km' : 'mi'}`));
  (geo.cities || []).forEach(c => parts.push(c.name + (c.region ? '/' + c.region : '')));
  (geo.regions || []).forEach(r => parts.push(r.name));
  (geo.countries || []).forEach(c => parts.push(c));
  const interests = [];
  (t.flexible_spec || []).forEach(spec => (spec.interests || []).forEach(i => interests.push(i.name)));
  const g = t.genders;
  const genders = !g || (g.includes(1) && g.includes(2)) ? 'todos' : (g.includes(1) ? 'homens' : 'mulheres');
  return {
    geo: parts.join(' · ') || '—',
    location_types: geo.location_types || null,
    age: (t.age_min || '—') + (t.age_max ? '-' + t.age_max : '+'),
    genders,
    device: t.device_platforms || null,
    fb_positions: t.facebook_positions || null,
    ig_positions: t.instagram_positions || null,
    interests: interests.length ? interests : null,
  };
}

// Período → cláusula de insights aninhada (date_preset ou time_range) + rótulo
const ESTRUTURAS_PERIODS = {
  maximum: 'Vida útil', today: 'Diário (hoje)', last_7d: 'Semanal (7 dias)', this_month: 'Mensal (mês atual)', last_30d: 'Últimos 30 dias',
};
function estruturasPeriod(period, since, until) {
  const fields = '{spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas}';
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (period === 'custom' && isDate(since) && isDate(until)) {
    return {
      ins: `insights.time_range(%7B'since':'${since}','until':'${until}'%7D)${fields}`,
      label: `${since.split('-').reverse().join('/')} a ${until.split('-').reverse().join('/')}`,
      key: `custom:${since}:${until}`, selected: 'custom', since, until,
    };
  }
  const preset = ESTRUTURAS_PERIODS[period] ? period : 'maximum';
  return { ins: `insights.date_preset(${preset})${fields}`, label: ESTRUTURAS_PERIODS[preset], key: preset, selected: preset, since: null, until: null };
}

async function fetchEstruturas(slug, period = 'maximum', since = null, until = null) {
  const pc = estruturasPeriod(period, since, until);
  const now = Date.now();
  const cacheKey = `${slug}|${pc.key}`;
  const cached = estruturasCache.get(cacheKey);
  if (cached && (now - cached.ts) < ESTRUTURAS_TTL_MS) return cached.data;

  const token = await readToken();
  if (!token) return { updated_at: new Date().toISOString(), error: 'token_not_found', slug, campaigns: [] };

  let mapping = { clients: [] };
  try { mapping = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8')); } catch {}

  // Sem slug → lista de clientes com conta de anúncio (pro seletor da página)
  if (!slug) {
    return {
      updated_at: new Date().toISOString(),
      clients: mapping.clients
        .filter(c => c.ad_account_id)
        .map(c => ({ slug: c.slug, name: c.name, agencia: c.agencia || null, cor: c.cor || null, seg: c.seg || null })),
    };
  }

  const client = mapping.clients.find(c => c.slug === slug);
  if (!client || !client.ad_account_id) {
    return { updated_at: new Date().toISOString(), error: 'no_ad_account', slug, client_name: client?.name || slug, campaigns: [] };
  }

  const INS = pc.ins;
  const F = `name,objective,effective_status,daily_budget,lifetime_budget,stop_time,start_time,${INS},`
    + `adsets.limit(25){name,effective_status,optimization_goal,billing_event,lifetime_budget,daily_budget,start_time,end_time,${INS},`
    + 'pacing_type,adset_schedule,promoted_object,destination_type,frequency_control_specs,'
    + 'targeting{device_platforms,publisher_platforms,facebook_positions,instagram_positions,age_min,age_max,genders,flexible_spec,'
    + 'geo_locations{cities,regions,countries,custom_locations,location_types}},'
    + `ads.limit(15){name,effective_status,${INS},`
    + 'creative{id,title,body,call_to_action_type,image_url,thumbnail_url,video_id,instagram_permalink_url,object_story_spec,'
    + 'asset_feed_spec{bodies,titles,descriptions,call_to_action_types,link_urls,asset_customization_rules,images,videos}}}}';
  const filtering = encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]));

  // Mapeia uma campanha crua da Graph → estrutura usada pelo painel (reuso: ativas e inativas)
  const mapCampaign = (c) => {
    const budgetLevel = (c.lifetime_budget || c.daily_budget) ? 'CBO' : 'ABO';
    const adsets = (c.adsets?.data || []).map(s => ({
      id: s.id, name: s.name, effective_status: s.effective_status,
      optimization_goal: s.optimization_goal, billing_event: s.billing_event,
      lifetime_budget_cents: s.lifetime_budget ? parseInt(s.lifetime_budget) : null,
      daily_budget_cents: s.daily_budget ? parseInt(s.daily_budget) : null,
      destination_type: s.destination_type || null,
      start_time: s.start_time || null, end_time: s.end_time || null,
      pixel: s.promoted_object?.pixel_id ? { id: s.promoted_object.pixel_id, event: s.promoted_object.custom_event_type || null } : null,
      dayparting: (s.adset_schedule || []).map(w => ({ days: w.days, start_minute: w.start_minute, end_minute: w.end_minute, tz: w.timezone_type })),
      frequency: (s.frequency_control_specs || [])[0] || null,
      insights: parseInsightsFull(s.insights?.data?.[0]),
      targeting: parseTargeting(s.targeting),
      flags: computeAdsetFlags(c.objective, s),
      ads: (s.ads?.data || []).map(a => ({
        id: a.id, name: a.name, effective_status: a.effective_status,
        creative: parseCreative(a.creative),
        insights: parseInsightsFull(a.insights?.data?.[0]),
      })),
      ads_count: (s.ads?.data || []).length,
    }));
    return {
      id: c.id, name: c.name, objective: c.objective, objective_label: OBJ_LABEL[c.objective] || c.objective,
      effective_status: c.effective_status, is_active: c.effective_status === 'ACTIVE', budget_level: budgetLevel,
      lifetime_budget_cents: c.lifetime_budget ? parseInt(c.lifetime_budget) : null,
      daily_budget_cents: c.daily_budget ? parseInt(c.daily_budget) : null,
      stop_time: c.stop_time || null, start_time: c.start_time || null,
      insights: parseInsightsFull(c.insights?.data?.[0]),
      adsets, adsets_count: adsets.length,
    };
  };

  let campaigns = [], err = null;
  const activeIds = new Set();
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/campaigns?fields=${F}&filtering=${filtering}&limit=30&access_token=${token}`);
    const j = await r.json();
    if (j.error) err = j.error.message;
    else (j.data || []).forEach(c => { const m = mapCampaign(c); campaigns.push(m); activeIds.add(m.id); });
  } catch (e) { err = e.message; }

  // Campanhas concluídas/desativadas que TIVERAM GASTO no período selecionado (insights de conta → estrutura por IDs)
  // Só para períodos delimitados — em "Vida útil" puxaria todo o histórico da conta (pesado e pouco útil).
  let inactiveTotal = 0;
  if (pc.selected !== 'maximum') try {
    const insClause = pc.selected === 'custom'
      ? `time_range=${encodeURIComponent(JSON.stringify({ since: pc.since, until: pc.until }))}`
      : `date_preset=${pc.selected}`;
    const ri = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/insights?level=campaign&fields=campaign_id,spend&${insClause}&limit=400&access_token=${token}`);
    const ji = await ri.json();
    const spent = (ji.data || [])
      .filter(x => parseFloat(x.spend || 0) > 0 && !activeIds.has(x.campaign_id))
      .sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend));
    inactiveTotal = spent.length;
    const ids = spent.slice(0, 20).map(x => x.campaign_id);
    if (ids.length) {
      const r2 = await fetch(`https://graph.facebook.com/v23.0/?ids=${ids.join(',')}&fields=${F}&access_token=${token}`);
      const j2 = await r2.json();
      if (!j2.error) ids.forEach(id => { const c = j2[id]; if (c && c.id) campaigns.push(mapCampaign(c)); });
    }
  } catch {}

  const labelPt = l => (l === 'feed_image' || l === 'feed_video') ? 'Feed' : ((l === 'story_image' || l === 'story_video') ? 'Story/Reels' : (l || null));

  // Resolve image_hash → URL de alta resolução (1 chamada adimages; traz as 2 artes do asset customization)
  try {
    const allHashes = new Set();
    campaigns.forEach(c => c.adsets.forEach(s => s.ads.forEach(a => (a.creative?.hashes || []).forEach(hp => allHashes.add(hp.hash)))));
    const hashUrl = {};
    if (allHashes.size) {
      const q = encodeURIComponent(JSON.stringify([...allHashes].slice(0, 80)));
      const r = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/adimages?hashes=${q}&fields=hash,url,width,height&access_token=${token}`);
      const j = await r.json();
      (j.data || []).forEach(i => { hashUrl[i.hash] = { url: i.url, w: i.width, h: i.height }; });
    }
    campaigns.forEach(c => c.adsets.forEach(s => s.ads.forEach(a => {
      const cr = a.creative; if (!cr) return;
      const imgs = (cr.hashes || [])
        .map(hp => ({ label: labelPt(hp.label), url: hashUrl[hp.hash]?.url || null, w: hashUrl[hp.hash]?.w || null, h: hashUrl[hp.hash]?.h || null }))
        .filter(x => x.url);
      cr.images = imgs.length ? imgs : (cr.image_direct ? [{ label: null, url: cr.image_direct }] : (cr.thumbnail ? [{ label: null, url: cr.thumbnail }] : []));
      cr.image = cr.images[0]?.url || cr.thumbnail || null;
      delete cr.hashes; delete cr.image_direct;
    })));
  } catch {}

  // Resolve video_id → source (mp4 tocável) + poster (1 chamada batch ?ids=)
  try {
    const allVids = new Set();
    campaigns.forEach(c => c.adsets.forEach(s => s.ads.forEach(a => (a.creative?.videoRefs || []).forEach(v => allVids.add(v.video_id)))));
    const vinfo = {};
    if (allVids.size) {
      const ids = [...allVids].slice(0, 50).join(',');
      const r = await fetch(`https://graph.facebook.com/v23.0/?ids=${ids}&fields=source,picture,permalink_url,thumbnails{uri,is_preferred,width,height}&access_token=${token}`);
      const j = await r.json();
      Object.entries(j || {}).forEach(([id, v]) => {
        if (!v || v.error) return;
        const tb = (v.thumbnails?.data || []).find(x => x.is_preferred) || v.thumbnails?.data?.[0];
        vinfo[id] = {
          source: v.source || null,
          poster: tb?.uri || v.picture || null,
          permalink: v.permalink_url ? ('https://www.facebook.com' + v.permalink_url) : null,
          w: tb?.width || null, h: tb?.height || null,
        };
      });
    }
    campaigns.forEach(c => c.adsets.forEach(s => s.ads.forEach(a => {
      const cr = a.creative; if (!cr) return;
      cr.videos = (cr.videoRefs || []).map(v => {
        const info = vinfo[v.video_id] || {};
        return { label: labelPt(v.label), video_id: v.video_id, source: info.source || null, poster: info.poster || v.thumb || null, permalink: cr.ig_permalink || info.permalink || null, w: info.w || null, h: info.h || null };
      }).filter(x => x.poster || x.source);
      delete cr.videoRefs; delete cr.ig_permalink;
    })));
  } catch {}

  // Totais da carteira do cliente
  const totals = campaigns.reduce((a, c) => {
    if (c.insights) { a.spend += c.insights.spend; a.revenue += c.insights.revenue; a.purchases += c.insights.purchases; a.impressions += c.insights.impressions; }
    return a;
  }, { spend: 0, revenue: 0, purchases: 0, impressions: 0 });
  totals.spend = +totals.spend.toFixed(2); totals.revenue = +totals.revenue.toFixed(2);
  totals.roas = totals.spend > 0 ? +(totals.revenue / totals.spend).toFixed(2) : 0;
  totals.cpa = totals.purchases > 0 ? +(totals.spend / totals.purchases).toFixed(2) : null;

  const activeCamps = campaigns.filter(c => c.is_active);
  const inactiveCamps = campaigns.filter(c => !c.is_active);

  const result = {
    updated_at: new Date().toISOString(),
    slug, client_name: client.name, agencia: client.agencia || null,
    ad_account_id: client.ad_account_id, periodo: pc.label,
    period: { selected: pc.selected, label: pc.label, since: pc.since, until: pc.until },
    totals, campaigns_count: activeCamps.length, campaigns: activeCamps,
    inactive_campaigns: inactiveCamps, inactive_total: inactiveTotal, error: err,
  };
  estruturasCache.set(cacheKey, { data: result, ts: now });
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// PORTAL DO CLIENTE — performance account-level (resumo, saldo, série temporal)
// Inspirado na War Room do portal Fenice; sem camada de lucro/margem.
// ──────────────────────────────────────────────────────────────────────────────
const portalResumoCache = new Map();      // slug|periodKey -> { data, ts }
const portalTsCache = new Map();           // slug|periodKey -> { data, ts }
let portalSaldoCache = { data: null, ts: 0 };
const PORTAL_TTL_MS = 600_000;             // 10 min

// Cláusula de período no formato de QUERY STRING (chamada direta act_/insights), não aninhado
function acctPeriodClause(period, since, until) {
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (period === 'custom' && isDate(since) && isDate(until)) {
    return { clause: `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`, key: `custom:${since}:${until}`, label: `${since.split('-').reverse().join('/')} a ${until.split('-').reverse().join('/')}`, selected: 'custom', since, until };
  }
  const preset = ESTRUTURAS_PERIODS[period] ? period : 'maximum';
  return { clause: `date_preset=${preset}`, key: preset, label: ESTRUTURAS_PERIODS[preset], selected: preset, since: null, until: null };
}

function clientBySlug(mapping, slug) { return (mapping.clients || []).find(c => c.slug === slug); }
async function readMapping() {
  try { return JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8')); } catch { return { clients: [] }; }
}

// Account-level: spend, revenue, ROAS + funil (impr→alcance→cliques→ATC→checkout→compra)
function parseAccountRow(row) {
  if (!row) return null;
  const actions = row.actions || [], vals = row.action_values || [];
  const av = (arr, ...types) => { for (const t of types) { const f = (arr || []).find(x => x.action_type === t); if (f) return Number(f.value); } return 0; };
  const spend = parseFloat(row.spend || 0);
  const purchases = av(actions, 'omni_purchase', 'purchase');
  const roasObj = (row.purchase_roas || []).find(r => r.action_type === 'omni_purchase') || (row.purchase_roas || [])[0];
  const roas = parseFloat(roasObj?.value || 0);
  const revenue = av(vals, 'omni_purchase', 'purchase') || +(spend * roas).toFixed(2);
  return {
    spend, revenue: +revenue.toFixed(2), purchases, roas,
    impressions: parseInt(row.impressions || 0), reach: parseInt(row.reach || 0),
    frequency: parseFloat(row.frequency || 0), clicks: parseInt(row.clicks || 0),
    link_clicks: av(actions, 'link_click'), ctr: parseFloat(row.ctr || 0),
    cpm: parseFloat(row.cpm || 0), cpc: parseFloat(row.cpc || 0),
    landing_page_view: av(actions, 'landing_page_view', 'omni_landing_page_view'),
    add_to_cart: av(actions, 'omni_add_to_cart', 'add_to_cart'),
    initiate_checkout: av(actions, 'omni_initiated_checkout', 'initiate_checkout'),
    cpa: purchases > 0 ? +(spend / purchases).toFixed(2) : null,
    ticket: purchases > 0 ? +(revenue / purchases).toFixed(2) : null,
  };
}

async function fetchResumoCliente(slug, period = 'maximum', since = null, until = null) {
  const pc = acctPeriodClause(period, since, until);
  const cacheKey = `${slug}|${pc.key}`;
  const now = Date.now();
  const hit = portalResumoCache.get(cacheKey);
  if (hit && (now - hit.ts) < PORTAL_TTL_MS) return hit.data;

  const token = await readToken();
  const mapping = await readMapping();
  const client = clientBySlug(mapping, slug);
  if (!client || !client.ad_account_id) return { updated_at: new Date().toISOString(), error: 'no_ad_account', slug, client_name: client?.name || slug };
  if (!token) return { updated_at: new Date().toISOString(), error: 'token_not_found', slug, client_name: client.name };

  let row = null, err = null;
  try {
    const fields = 'spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas';
    const r = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/insights?level=account&fields=${fields}&${pc.clause}&access_token=${token}`);
    const j = await r.json();
    if (j.error) err = j.error.message; else row = parseAccountRow((j.data || [])[0]);
  } catch (e) { err = e.message; }

  const result = {
    updated_at: new Date().toISOString(), slug, client_name: client.name, agencia: client.agencia || null,
    ad_account_id: client.ad_account_id, period: { selected: pc.selected, label: pc.label, since: pc.since, until: pc.until },
    metrics: row, error: err,
  };
  portalResumoCache.set(cacheKey, { data: result, ts: now });
  return result;
}

// Saldo das contas (balance/funding) — porte do portal Fenice
async function fetchSaldos() {
  const now = Date.now();
  if (portalSaldoCache.data && (now - portalSaldoCache.ts) < PORTAL_TTL_MS) return portalSaldoCache.data;
  const mapping = await readMapping();
  const token = await readToken();
  let byAcct = {}, erro = null;
  if (token) {
    try {
      const r = await fetch(`https://graph.facebook.com/v23.0/me/adaccounts?fields=account_id,name,currency,account_status,balance,amount_spent,spend_cap,funding_source,funding_source_details&limit=500&access_token=${token}`);
      const j = await r.json();
      if (j.error) erro = j.error.message; else for (const a of (j.data || [])) byAcct[a.account_id] = a;
    } catch (e) { erro = e.message; }
  } else erro = 'sem_token';
  const cents = (v) => (v != null && v !== '' ? parseInt(v) : null);
  const clients = (mapping.clients || []).filter(c => c.ad_account_id).map(c => {
    const a = byAcct[c.ad_account_id];
    const fd = a?.funding_source_details || null;
    const tipo = fd ? (fd.type === 1 ? 'cartao' : fd.type === 20 ? 'prepago' : 'outro') : null;
    let disponivel_cents = null;
    if (tipo === 'prepago' && fd?.display_string) {
      const m = fd.display_string.match(/R\$\s*([\d.]*\d)(?:,(\d{2}))?/);
      if (m) disponivel_cents = parseInt(m[1].replace(/\./g, ''), 10) * 100 + parseInt(m[2] || '00', 10);
    }
    return {
      slug: c.slug, name: c.name, ad_account_id: c.ad_account_id, currency: a?.currency || 'BRL',
      account_status: a?.account_status ?? null,
      balance_cents: a ? cents(a.balance) : null, amount_spent_cents: a ? cents(a.amount_spent) : null,
      funding_tipo: tipo, disponivel_cents: tipo === 'prepago' ? disponivel_cents : null,
      a_faturar_cents: tipo === 'cartao' ? (a ? cents(a.balance) : null) : null, found: !!a,
    };
  });
  const result = { updated_at: new Date().toISOString(), error: erro, clients };
  portalSaldoCache = { data: result, ts: now };
  return result;
}

// Série temporal dia-a-dia (account-level, time_increment=1)
async function fetchTimeseriesCliente(slug, period = 'this_month', since = null, until = null) {
  // 'maximum' não combina com série diária (e não traz compras no account-level) — cai pra 30 dias
  if (period === 'maximum') period = 'last_30d';
  const pc = acctPeriodClause(period, since, until);
  const cacheKey = `${slug}|${pc.key}`;
  const now = Date.now();
  const hit = portalTsCache.get(cacheKey);
  if (hit && (now - hit.ts) < PORTAL_TTL_MS) return hit.data;
  const token = await readToken();
  const mapping = await readMapping();
  const client = clientBySlug(mapping, slug);
  if (!client || !client.ad_account_id || !token) return { updated_at: new Date().toISOString(), slug, days: [], error: client?.ad_account_id ? 'token_not_found' : 'no_ad_account' };
  let days = [], err = null;
  try {
    const fields = 'spend,impressions,reach,clicks,ctr,cpm,actions,action_values,purchase_roas';
    const r = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/insights?level=account&time_increment=1&fields=${fields}&${pc.clause}&limit=120&access_token=${token}`);
    const j = await r.json();
    if (j.error) err = j.error.message;
    else days = (j.data || []).map(d => { const m = parseAccountRow(d); return { date: d.date_start, spend: m.spend, revenue: m.revenue, purchases: m.purchases, roas: m.roas, impressions: m.impressions, clicks: m.clicks }; });
  } catch (e) { err = e.message; }
  const result = { updated_at: new Date().toISOString(), slug, label: pc.label, days, error: err };
  portalTsCache.set(cacheKey, { data: result, ts: now });
  return result;
}

// Demografia / breakdowns (idade, gênero, dispositivo, plataforma) — account-level
const portalBreakdownCache = new Map();
async function fetchBreakdownCliente(slug, period = 'this_month', since = null, until = null) {
  if (period === 'maximum') period = 'last_30d';
  const pc = acctPeriodClause(period, since, until);
  const cacheKey = `${slug}|${pc.key}`;
  const now = Date.now();
  const hit = portalBreakdownCache.get(cacheKey);
  if (hit && (now - hit.ts) < PORTAL_TTL_MS) return hit.data;
  const token = await readToken();
  const mapping = await readMapping();
  const client = clientBySlug(mapping, slug);
  if (!client || !client.ad_account_id || !token) return { updated_at: new Date().toISOString(), slug, breakdowns: {}, error: client?.ad_account_id ? 'token_not_found' : 'no_ad_account' };
  const dims = [['age', 'idade'], ['gender', 'genero'], ['device_platform', 'dispositivo'], ['publisher_platform', 'plataforma']];
  const fields = 'spend,impressions,clicks,ctr,actions,action_values,purchase_roas';
  const breakdowns = {};
  let err = null;
  await Promise.all(dims.map(async ([bd, key]) => {
    try {
      const r = await fetch(`https://graph.facebook.com/v23.0/act_${client.ad_account_id}/insights?level=account&breakdowns=${bd}&fields=${fields}&${pc.clause}&limit=60&access_token=${token}`);
      const j = await r.json();
      if (j.error) { err = err || j.error.message; breakdowns[key] = []; return; }
      breakdowns[key] = (j.data || []).map(row => { const m = parseAccountRow(row); return { label: row[bd] || '—', spend: m.spend, revenue: m.revenue, purchases: m.purchases, roas: m.roas, link_clicks: m.link_clicks, ctr: m.ctr }; }).filter(x => x.spend > 0).sort((a, b) => b.spend - a.spend);
    } catch (e) { breakdowns[key] = []; }
  }));
  const result = { updated_at: new Date().toISOString(), slug, period: { selected: pc.selected, label: pc.label }, breakdowns, error: err };
  portalBreakdownCache.set(cacheKey, { data: result, ts: now });
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// PÚBLICO — lista de clientes ativos sem dados financeiros (pra central pública)
// ──────────────────────────────────────────────────────────────────────────────
async function fetchPublicClients() {
  const now = Date.now();
  if (clientsCache.data && (now - clientsCache.ts) < CACHE_TTL_MS) return clientsCache.data;

  let mapping = { clients: [] };
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data', 'clients-mapping.json'), 'utf-8');
    mapping = JSON.parse(raw);
  } catch {
    return { error: 'mapping_missing', clients: [], updated_at: new Date().toISOString() };
  }

  const token = await readToken();
  const clients = await Promise.all(mapping.clients.map(async (c) => {
    let igData = null;
    if (token && c.ig_business_id) {
      try {
        const r = await fetch(`https://graph.facebook.com/v23.0/${c.ig_business_id}?fields=username,name,followers_count,media_count,profile_picture_url&access_token=${token}`);
        const j = await r.json();
        if (!j.error) {
          igData = {
            username: j.username || c.ig_username,
            name: j.name,
            followers: j.followers_count,
            media_count: j.media_count,
            avatar: j.profile_picture_url,
          };
        }
      } catch {}
    } else if (c.ig_username) {
      igData = { username: c.ig_username };
    }
    return {
      name: c.name,
      slug: c.slug,
      agencia: c.agencia,
      validated: c.validated,
      pending_status: c.validated === false ? (c.status || 'Em setup') : null,
      instagram: igData,
      // SEM gasto, sem ROAS, sem balance — apenas info pública
    };
  }));

  const result = {
    updated_at: new Date().toISOString(),
    by_agencia: {
      'Starken': clients.filter(c => c.agencia === 'Starken'),
      'Outros': clients.filter(c => c.agencia !== 'Starken'),
    },
    clients,
  };
  clientsCache = { data: result, ts: now };
  return result;
}

function resolveFilePath(reqUrl) {
  let urlPath = decodeURIComponent(reqUrl.split('?')[0]);
  // Diretório raiz vira index.html
  if (urlPath === '/') urlPath = '/index.html';
  // Alias: /dashboard e /dashboard/ → mesma central da raiz
  if (urlPath === '/dashboard' || urlPath === '/dashboard/') urlPath = '/index.html';
  // Qualquer URL terminando em / também aponta pro index.html da pasta
  if (urlPath.endsWith('/')) urlPath = urlPath + 'index.html';

  const clientMatch = urlPath.match(/^\/clientes\/([^\/]+)\/(.+)$/);
  if (clientMatch) {
    const slug = clientMatch[1].toLowerCase();
    const fileName = clientMatch[2];
    const clientFolder = CLIENT_ALIASES[slug];
    if (clientFolder) {
      const target = path.join(CLIENTS_DIR, clientFolder, fileName);
      if (target.startsWith(CLIENTS_DIR)) return { filePath: target, scope: 'client' };
    }
    return null;
  }

  const filePath = path.join(__dirname, urlPath);
  if (filePath.startsWith(__dirname)) return { filePath, scope: 'dashboard' };
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    // Área admin (Basic Auth) — protege HTML e JSON. Portal do cliente: gated por ora (dado sensível).
    if (req.url.startsWith('/admin') || req.url.startsWith('/api/admin') || req.url.startsWith('/portaldocliente') || req.url.startsWith('/api/cliente')) {
      if (!requireAdminAuth(req, res)) return;
    }

    if (req.url === '/api/admin/status' || req.url.startsWith('/api/admin/status?')) {
      const force = req.url.includes('force=1');
      if (force) adminCache = { data: null, ts: 0 };
      const data = await fetchAdminStatus();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/clients' || req.url.startsWith('/api/clients?')) {
      const force = req.url.includes('force=1');
      if (force) clientsCache = { data: null, ts: 0 };
      const data = await fetchPublicClients();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/agendamentos' || req.url.startsWith('/api/agendamentos?')) {
      const force = req.url.includes('force=1');
      if (force) cache = { data: null, ts: 0 };
      const data = await fetchAgendamentos();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/renovacao' || req.url.startsWith('/api/renovacao?')) {
      const data = await fetchRenovacao();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/admin/monitor' || req.url.startsWith('/api/admin/monitor?')) {
      const qs = new URLSearchParams((req.url.split('?')[1] || ''));
      const period = qs.get('period') || 'today';
      const since = qs.get('since');
      const until = qs.get('until');
      if (qs.get('force') === '1') monitorCache.clear();
      const data = await fetchMonitor(period, since, until);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/admin/posts' || req.url.startsWith('/api/admin/posts?')) {
      const force = req.url.includes('force=1');
      if (force) galeriaCache = { data: null, ts: 0 };
      const data = await fetchPostsGaleria();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url === '/api/admin/financeiro' || req.url.startsWith('/api/admin/financeiro?')) {
      const FIN = path.join(__dirname, 'data', 'financeiro.json');
      const readFin = async () => { try { return JSON.parse(await fs.readFile(FIN, 'utf-8')); } catch { return { mes_ref: null, clientes: [] }; } };
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch {}
        const data = await readFin();
        const mes = payload.mes || data.mes_ref;
        const cli = (data.clientes || []).find(c => c.slug === payload.slug);
        if (cli && mes) {
          cli.ajustes = cli.ajustes || {};
          const a = cli.ajustes[mes] || {};
          if (payload.valor !== undefined) a.valor = (payload.valor === null || payload.valor === '') ? null : Number(payload.valor);
          if (payload.pago !== undefined) a.pago = !!payload.pago;
          if (a.valor === null || a.valor === undefined) delete a.valor;  // limpa override
          if (Object.keys(a).length) cli.ajustes[mes] = a; else delete cli.ajustes[mes];
          data.updated_at = new Date().toISOString();
          await fs.writeFile(FIN, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(data, null, 2));
        return;
      }
      const data = await readFin();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (req.url.startsWith('/api/admin/estruturas')) {
      const qs = new URLSearchParams(req.url.split('?')[1] || '');
      const slug = qs.get('slug') || '';
      const period = qs.get('period') || 'maximum';
      const since = qs.get('since') || null, until = qs.get('until') || null;
      if (qs.get('force') === '1') {
        const pc = estruturasPeriod(period, since, until);
        estruturasCache.delete(`${slug}|${pc.key}`);
      }
      const data = await fetchEstruturas(slug, period, since, until);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    // Portal do cliente — endpoints account-level (resumo, saldo, série temporal)
    if (req.url.startsWith('/api/cliente/')) {
      const qs = new URLSearchParams(req.url.split('?')[1] || '');
      const slug = qs.get('c') || qs.get('slug') || '';
      const period = qs.get('period') || 'maximum';
      const since = qs.get('since') || null, until = qs.get('until') || null;
      const force = qs.get('force') === '1';
      let data;
      if (req.url.startsWith('/api/cliente/resumo')) {
        if (force) portalResumoCache.delete(`${slug}|${acctPeriodClause(period, since, until).key}`);
        data = await fetchResumoCliente(slug, period, since, until);
      } else if (req.url.startsWith('/api/cliente/saldo')) {
        if (force) portalSaldoCache = { data: null, ts: 0 };
        data = await fetchSaldos();
      } else if (req.url.startsWith('/api/cliente/timeseries')) {
        data = await fetchTimeseriesCliente(slug, period, since, until);
      } else if (req.url.startsWith('/api/cliente/breakdown')) {
        data = await fetchBreakdownCliente(slug, period, since, until);
      } else {
        res.writeHead(404).end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    // Página do portal do cliente (URL bonita /portaldocliente → portaldocliente.html)
    if (req.url === '/portaldocliente' || req.url.startsWith('/portaldocliente?')) {
      const html = await fs.readFile(path.join(__dirname, 'portaldocliente.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
      return;
    }

    const resolved = resolveFilePath(req.url);
    if (!resolved) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const data = await fs.readFile(resolved.filePath);
    const ext = path.extname(resolved.filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404).end('404 - Not Found: ' + req.url);
    } else {
      console.error(err);
      res.writeHead(500).end('500 - Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log('━'.repeat(60));
  console.log('📊  Dashboard de Tráfego Pago — Ativo');
  console.log('━'.repeat(60));
  console.log(`   🏠  http://localhost:${PORT}/  (central de dashboards · pública)`);
  console.log(`   📅  http://localhost:${PORT}/agendamentos.html`);
  console.log(`   🔄  http://localhost:${PORT}/renovacao.html`);
  console.log(`   🛡️   http://localhost:${PORT}/admin/  ${ADMIN_USER ? '(Basic Auth ativo)' : '⚠ DESATIVADO — defina ADMIN_USER/ADMIN_PASS'}`);
  console.log(`   📡  http://localhost:${PORT}/admin/monitor.html  (monitor de campanhas ao vivo)`);
  console.log(`   🔌  http://localhost:${PORT}/api/clients (público)`);
  console.log(`   🔌  http://localhost:${PORT}/api/agendamentos`);
  console.log(`   🔌  http://localhost:${PORT}/api/renovacao`);
  console.log(`   🔌  http://localhost:${PORT}/api/admin/status`);
  console.log('');
  console.log(`   🔑  Token: ${process.env.META_GRAPH_TOKEN ? 'env var ✓' : `arquivo ${TOKEN_FILE}`}`);
  console.log(`   🗂️  Clients dir: ${CLIENTS_DIR}`);
  if (Object.keys(CLIENT_ALIASES).length) {
    console.log(`   📌  Aliases: ${Object.keys(CLIENT_ALIASES).length} clientes mapeados`);
  }
  console.log('━'.repeat(60));
  console.log('   Ctrl+C para encerrar\n');
});
