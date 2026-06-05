// Publica 1 story avulso da Academia São Pedro no Instagram E no Facebook
// (best-effort por canal) e registra em data/stories-publicados.json.
//
//   node --env-file=.env scripts/publish-story-academia.mjs --image=<arquivo> --title="..." [--channels=ig,fb]
//
// Imagem deve estar hospedada em academia/assets/ (servida publicamente).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const IG = '17841414456130251';   // @academiasaopedro
const PAGE = '1374528172770344';  // Página FB Academia São Pedro
const BASE = 'https://central.starkentecnologia.com.br/academia/assets';
const STORE = process.env.STORIES_STORE || path.join(__dirname, '..', 'data', 'stories-publicados.json');

const arg = (k) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

const image = arg('image');
const title = arg('title') || 'Story';
const channelsArg = (arg('channels') || 'ig,fb').split(',').map(s => s.trim()).filter(Boolean);
const wantIG = channelsArg.includes('ig');
const wantFB = channelsArg.includes('fb');

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }
if (!image) { log('FALHOU: --image obrigatório'); process.exit(1); }
if (!wantIG && !wantFB) { log('FALHOU: --channels inválido'); process.exit(1); }

const url = `${BASE}/${image}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (n, p) => fetch(`https://graph.facebook.com/${GV}/${n}`, { method: 'POST', body: new URLSearchParams(p) }).then(r => r.json());
const get  = (n, q) => fetch(`https://graph.facebook.com/${GV}/${n}?` + new URLSearchParams(q)).then(r => r.json());

let pageTokenCache = null;
async function pageToken() {
  if (pageTokenCache) return pageTokenCache;
  const r = await get(PAGE, { fields: 'access_token', access_token: token });
  if (r.error || !r.access_token) throw new Error('page token: ' + (r.error?.message || 'sem token'));
  pageTokenCache = r.access_token;
  return pageTokenCache;
}

async function publishIG() {
  let c = null;
  for (let i = 1; i <= 4; i++) {
    const r = await post(`${IG}/media`, { media_type: 'STORIES', image_url: url, access_token: token });
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
  const pub = await post(`${IG}/media_publish`, { creation_id: c.id, access_token: token });
  if (pub.error) throw new Error('IG publish: ' + pub.error.message);
  return pub.id;
}

async function publishFB() {
  const pt = await pageToken();
  let photo = null;
  for (let i = 1; i <= 4; i++) {
    const p = await post(`${PAGE}/photos`, { url, published: 'false', access_token: pt });
    if (!p.error && p.id) { photo = p; break; }
    log(`   FB upload tentativa ${i}: ${p.error?.message || 'sem id'}`); await sleep(4000);
  }
  if (!photo) throw new Error('FB upload falhou');
  const s = await post(`${PAGE}/photo_stories`, { photo_id: photo.id, access_token: pt });
  if (s.error) throw new Error('FB photo_stories: ' + s.error.message);
  return s.post_id || s.id || photo.id;
}

log(`Academia · story adhoc · ${image} · canais=${channelsArg.join('+')}`);
const channels = []; let ig_media_id = null, fb_story_id = null;
if (wantIG) { try { ig_media_id = await publishIG(); channels.push('ig'); log('   IG ✓ ' + ig_media_id); } catch (e) { log('   IG ERRO: ' + e.message); } }
if (wantFB) { try { fb_story_id = await publishFB(); channels.push('fb'); log('   FB ✓ ' + fb_story_id); } catch (e) { log('   FB ERRO: ' + e.message); } }

if (channels.length) {
  try {
    const now = new Date();
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const id = `story-academia-${image.replace(/\.[a-z]+$/i, '')}-${mm}${dd}`;
    let data = { stories: [] };
    try { data = JSON.parse(await fs.readFile(STORE, 'utf-8')); } catch {}
    data.stories = data.stories || [];
    if (!data.stories.some(s => s.id === id)) {
      data.stories.unshift({
        id, client: 'Academia São Pedro', client_slug: 'academia', agencia: 'Starken',
        ig_username: 'academiasaopedro', title, channels,
        published_iso: now.toISOString(), image_url: url,
        media_id: ig_media_id || null, ig_media_id: ig_media_id || null, fb_story_id: fb_story_id || null,
      });
      data.updated_at = now.toISOString();
      await fs.writeFile(STORE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      log('   registrado: ' + id + ' [' + channels.join('+') + ']');
    } else { log('   já registrado: ' + id); }
  } catch (e) { log('   falha ao registrar (publicação OK): ' + e.message); }
  log('OK');
} else { log('FALHOU: nada publicado'); process.exit(1); }
