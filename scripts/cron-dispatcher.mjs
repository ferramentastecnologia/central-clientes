// cron-dispatcher.mjs — publica os stories agendados (data/crons.json) que venceram.
//
// À PROVA DE REBOOT: rodado pelo CRONTAB do sistema a cada 10 min (não usa systemd-run
// transiente, que sumia no reboot). Genérico por cliente: publica `image_url` como STORIES
// no Instagram + Facebook usando `ig_business_id` (cron) e `page_id` (clients-mapping por slug).
//
//   */10 * * * * cd /var/www/central-clientes && /usr/bin/node --env-file=.env scripts/cron-dispatcher.mjs >> logs/cron-dispatcher.log 2>&1
//
// Regras: cron pending com next_fire_iso já vencido E dentro da janela de GRACE → publica e
// marca "completed". Vencido há mais que GRACE → marca "skipped" (não republica antigo).
// Futuro → deixa pending (publica quando vencer). Registra em data/stories-publicados.json.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CRONS = path.join(ROOT, 'data', 'crons.json');
const MAPPING = path.join(ROOT, 'data', 'clients-mapping.json');
const STORE = process.env.STORIES_STORE || path.join(ROOT, 'data', 'stories-publicados.json');
const LOCK = path.join(ROOT, 'data', '.dispatcher.lock');

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const GRACE_MS = 90 * 60 * 1000;   // publica o que venceu nos últimos 90 min
const LOCK_TTL = 15 * 60 * 1000;   // reels demoram minutos (transcode + processamento)

const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (n, p) => fetch(`https://graph.facebook.com/${GV}/${n}`, { method: 'POST', body: new URLSearchParams(p) }).then(r => r.json());
const get = (n, q) => fetch(`https://graph.facebook.com/${GV}/${n}?` + new URLSearchParams(q)).then(r => r.json());

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }

// lock simples (evita 2 dispatchers concorrentes)
try {
  const st = await fs.stat(LOCK).catch(() => null);
  if (st && (Date.now() - st.mtimeMs) < LOCK_TTL) { process.exit(0); }
  await fs.writeFile(LOCK, String(Date.now()));
} catch {}

const pageTokens = {};
async function pageToken(pageId) {
  if (pageTokens[pageId]) return pageTokens[pageId];
  const r = await get(pageId, { fields: 'access_token', access_token: token });
  if (r.error || !r.access_token) throw new Error('page token ' + pageId + ': ' + (r.error?.message || 'sem token'));
  return (pageTokens[pageId] = r.access_token);
}

async function publishIG(igId, url) {
  let c = null;
  for (let i = 1; i <= 4; i++) {
    const r = await post(`${igId}/media`, { media_type: 'STORIES', image_url: url, access_token: token });
    if (!r.error) { c = r; break; }
    log(`   IG container tentativa ${i}: ${r.error.message}`); await sleep(4000);
  }
  if (!c) throw new Error('IG container falhou');
  let st = 'IN_PROGRESS';
  for (let i = 0; i < 20; i++) {
    const s = await get(c.id, { fields: 'status_code', access_token: token });
    st = s.status_code;
    if (st === 'FINISHED') break;
    if (st === 'ERROR') throw new Error('IG status ERROR');
    await sleep(2000);
  }
  if (st !== 'FINISHED') throw new Error('IG status=' + st);
  const pub = await post(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
  if (pub.error) throw new Error('IG publish: ' + pub.error.message);
  return pub.id;
}

async function publishFB(pageId, url) {
  const pt = await pageToken(pageId);
  let photo = null;
  for (let i = 1; i <= 4; i++) {
    const p = await post(`${pageId}/photos`, { url, published: 'false', access_token: pt });
    if (!p.error && p.id) { photo = p; break; }
    log(`   FB upload tentativa ${i}: ${p.error?.message || 'sem id'}`); await sleep(4000);
  }
  if (!photo) throw new Error('FB upload falhou');
  const s = await post(`${pageId}/photo_stories`, { photo_id: photo.id, access_token: pt });
  if (s.error) throw new Error('FB photo_stories: ' + s.error.message);
  return s.post_id || s.id || photo.id;
}

// ── POSTS DE FEED (kind: 'feed') ──
async function publishIGFeed(igId, url, caption) {
  let c = null;
  for (let i = 1; i <= 4; i++) {
    const r = await post(`${igId}/media`, { image_url: url, caption: caption || '', access_token: token });
    if (!r.error) { c = r; break; }
    log(`   IG feed container ${i}: ${r.error.message}`); await sleep(4000);
  }
  if (!c) throw new Error('IG feed container falhou');
  let st = 'IN_PROGRESS';
  for (let i = 0; i < 20; i++) {
    const s = await get(c.id, { fields: 'status_code', access_token: token });
    st = s.status_code; if (st === 'FINISHED') break; if (st === 'ERROR') throw new Error('IG feed status ERROR'); await sleep(2000);
  }
  if (st !== 'FINISHED') throw new Error('IG feed status=' + st);
  const pub = await post(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
  if (pub.error) throw new Error('IG feed publish: ' + pub.error.message);
  return pub.id;
}
async function publishFBFeed(pageId, url, caption) {
  const pt = await pageToken(pageId);
  const r = await post(`${pageId}/photos`, { url, message: caption || '', published: 'true', access_token: pt });
  if (r.error) throw new Error('FB feed: ' + r.error.message);
  return r.post_id || r.id;
}

async function register(cron, ig, fb) {
  try {
    let data = { stories: [] };
    try { data = JSON.parse(await fs.readFile(STORE, 'utf-8')); } catch {}
    data.stories = data.stories || [];
    if (data.stories.some(s => s.id === cron.id)) return;
    data.stories.unshift({
      id: cron.id, client: cron.client || cron.client_slug, client_slug: cron.client_slug || null,
      title: cron.description || 'Story', channels: [ig && 'ig', fb && 'fb'].filter(Boolean),
      published_iso: new Date().toISOString(), image_url: cron.image_url,
      media_id: ig || null, ig_media_id: ig || null, fb_story_id: fb || null, via: 'dispatcher',
    });
    data.updated_at = new Date().toISOString();
    await fs.writeFile(STORE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (e) { log('   registro falhou (publicação OK): ' + e.message); }
}

async function main() {
  const doc = JSON.parse(await fs.readFile(CRONS, 'utf-8'));
  let mapping = { clients: [] };
  try { mapping = JSON.parse(await fs.readFile(MAPPING, 'utf-8')); } catch {}
  const pageBySlug = {};
  (mapping.clients || []).forEach(c => { if (c.slug) pageBySlug[c.slug] = c.page_id; });

  const now = Date.now();
  let changed = false, published = 0, skipped = 0, future = 0;
  for (const c of (doc.crons || [])) {
    if (c.status !== 'pending') continue;
    if (c.type && c.type !== 'ig_publish') continue;
    const fire = new Date(c.next_fire_iso).getTime();
    if (isNaN(fire)) continue;
    if (fire > now) { future++; continue; }                 // futuro → publica quando vencer
    if (now - fire > GRACE_MS) {                             // vencido há muito → não republica
      c.status = 'skipped'; c.skipped_iso = new Date().toISOString(); changed = true; skipped++; continue;
    }
    // DUE — venceu dentro da janela → publica
    // REEL/vídeo (kind:'reel') → reusa o publish-reel-feio.mjs (transcode H.264 + IG Reels + FB Reels)
    if (c.kind === 'reel') {
      if (c.client_slug !== 'feio') { c.status = 'error'; c.error = 'reel só suportado p/ feio por ora'; changed = true; continue; }
      if (!c.video) { c.status = 'error'; c.error = 'reel sem campo video'; changed = true; continue; }
      log(`publicando ${c.id} (${c.client_slug}) [REEL] → ${c.video}`);
      try {
        const { stdout } = await execFileAsync('/usr/bin/node',
          ['--env-file=.env', 'scripts/publish-reel-feio.mjs', `--video=${c.video}`, `--id=${c.id}`, `--title=${c.description || 'Reel'}`],
          { cwd: ROOT, maxBuffer: 1 << 27, env: { ...process.env, REEL_CAPTION: c.caption || '' } });
        if (/CONCLUÍDO/.test(stdout)) { c.status = 'completed'; c.published_iso = new Date().toISOString(); published++; log('   REEL ✓'); }
        else { c.error = 'reel não confirmou'; log('   reel stdout(fim): ' + stdout.slice(-280)); }
        changed = true;
      } catch (e) { c.error = 'reel falhou: ' + e.message; changed = true; log('   REEL ERRO: ' + (e.stderr || e.message).slice(-280)); }
      continue;
    }
    const igId = c.ig_business_id;
    const pageId = pageBySlug[c.client_slug] || null;
    const url = c.image_url;
    if (!igId || !url) { c.status = 'error'; c.error = 'sem ig_business_id/image_url'; changed = true; continue; }
    const isFeed = c.kind === 'feed';
    log(`publicando ${c.id} (${c.client_slug}) [${isFeed ? 'FEED' : 'story'}] → ${url}`);
    let ig = null, fb = null;
    if (isFeed) {
      try { ig = await publishIGFeed(igId, url, c.caption); log('   IG feed ✓ ' + ig); } catch (e) { log('   IG ERRO: ' + e.message); }
      if (pageId) { try { fb = await publishFBFeed(pageId, url, c.caption); log('   FB feed ✓ ' + fb); } catch (e) { log('   FB ERRO: ' + e.message); } }
    } else {
      try { ig = await publishIG(igId, url); log('   IG ✓ ' + ig); } catch (e) { log('   IG ERRO: ' + e.message); }
      if (pageId) { try { fb = await publishFB(pageId, url); log('   FB ✓ ' + fb); } catch (e) { log('   FB ERRO: ' + e.message); } }
    }
    if (ig || fb) {
      c.status = 'completed'; c.published_iso = new Date().toISOString();
      c.channels = [ig && 'ig', fb && 'fb'].filter(Boolean); changed = true; published++;
      await register(c, ig, fb);
    } else {
      c.error = 'nada publicado (tenta de novo na próxima rodada)';   // fica pending dentro do grace
    }
  }
  if (changed) { doc.updated_at = new Date().toISOString(); await fs.writeFile(CRONS, JSON.stringify(doc, null, 2) + '\n', 'utf-8'); }
  log(`dispatcher: ${published} publicado(s) · ${skipped} expirado(s) · ${future} futuro(s) pendente(s)`);
}

try { await main(); } catch (e) { log('ERRO geral: ' + e.message); } finally { await fs.unlink(LOCK).catch(() => {}); }
