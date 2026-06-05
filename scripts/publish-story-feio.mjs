// Publica a sequência de stories recorrentes da Hamburgueria Feio nos stories
// do Instagram E da página do Facebook, e auto-registra cada um em
// data/stories-publicados.json (área "📱 Stories Publicados" do dashboard).
//
// Uso:
//   node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=almoco
//   node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=jantar
//   node --env-file=.env scripts/publish-story-feio.mjs --day=sexta --slot=jantar --with-promo
//
// Slots:
//   almoco (11h) -> abertura do almoço + promo do dia
//   jantar (18h) -> abertura do jantar  (+ promo do dia se --with-promo)
//
// Canais: por padrão publica em Instagram + Facebook. Restrinja com:
//   --channels=ig    (só Instagram)
//   --channels=fb    (só Facebook)
//   --channels=ig,fb (ambos — padrão)
//
// Cada canal é best-effort: falha em um não impede o outro.
// Disparado pelos timers systemd na VPS (ver scripts/README.md) ou manualmente.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const IG = '17841440639973754';   // Instagram · @hamburgueria.feio
const PAGE = '101076538404413';   // Página Facebook · Hamburgueria FEIO
const BASE = 'https://central.starkentecnologia.com.br/feio/assets/photos';
const STORE = process.env.STORIES_STORE || path.join(__dirname, '..', 'data', 'stories-publicados.json');

// Cada dia aberto usa uma variante de criativo "estamos abertos" + sua promo.
// Variante A: Seg/Qua/Sex · Variante B: Ter/Qui/Sáb (domingo fechado).
const DAYS = {
  segunda: { variant: 'a', promo: 'promo-segunda.png' },
  terca:   { variant: 'b', promo: 'promo-terca.png' },
  quarta:  { variant: 'a', promo: 'promo-quarta.png' },
  quinta:  { variant: 'b', promo: 'promo-quinta.png' },
  sexta:   { variant: 'a', promo: 'promo-sexta.png' },
  sabado:  { variant: 'b', promo: 'promo-sabado.png' },
};
const ABERTURA = {
  a: { almoco: 'feio-abre-almoco-a.png', jantar: 'feio-abre-jantar-a.png' },
  b: { almoco: 'feio-abre-almoco-b.png', jantar: 'feio-abre-jantar-b.png' },
};

const arg = (k) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };
const has = (k) => process.argv.includes(`--${k}`);
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

const dayKey = arg('day');
const slot = arg('slot');
const withPromo = has('with-promo');
const day = DAYS[dayKey];
const channelsArg = (arg('channels') || 'ig,fb').split(',').map(s => s.trim()).filter(Boolean);
const wantIG = channelsArg.includes('ig');
const wantFB = channelsArg.includes('fb');

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }
if (!day) { log(`FALHOU: --day inválido (${dayKey}). Use: ${Object.keys(DAYS).join(', ')}`); process.exit(1); }
if (slot !== 'almoco' && slot !== 'jantar') { log(`FALHOU: --slot inválido (${slot}). Use: almoco, jantar`); process.exit(1); }
if (!wantIG && !wantFB) { log(`FALHOU: --channels inválido (${channelsArg.join(',')}). Use: ig, fb ou ig,fb`); process.exit(1); }

// Monta a lista de stories do slot (ordem = ordem de publicação).
const ab = ABERTURA[day.variant];
const items = [];
if (slot === 'almoco') {
  items.push({ img: ab.almoco, title: 'Estamos abertos · almoço (11h)' });
  items.push({ img: day.promo, title: `Promo de ${dayKey}` });
} else {
  items.push({ img: ab.jantar, title: 'Estamos abertos · jantar (18h)' });
  if (withPromo) items.push({ img: day.promo, title: `Promo de ${dayKey}` });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (n, p) => fetch(`https://graph.facebook.com/${GV}/${n}`, { method: 'POST', body: new URLSearchParams(p) }).then(r => r.json());
const get = (n, q) => fetch(`https://graph.facebook.com/${GV}/${n}?` + new URLSearchParams(q)).then(r => r.json());

// Token da página FB (derivado do user token), resolvido uma vez.
let pageTokenCache = null;
async function pageToken() {
  if (pageTokenCache) return pageTokenCache;
  const r = await get(PAGE, { fields: 'access_token', access_token: token });
  if (r.error || !r.access_token) throw new Error('page token indisponível: ' + (r.error?.message || 'sem access_token'));
  pageTokenCache = r.access_token;
  return pageTokenCache;
}

// Instagram Stories: cria container STORIES -> aguarda FINISHED -> publica.
async function publishIG(url) {
  let container = null;
  for (let i = 1; i <= 4; i++) {
    const c = await post(`${IG}/media`, { media_type: 'STORIES', image_url: url, access_token: token });
    if (!c.error) { container = c; break; }
    log(`     IG container tentativa ${i} falhou: ${c.error.message}`);
    await sleep(4000);
  }
  if (!container) throw new Error('IG container falhou');

  let st = 'IN_PROGRESS';
  for (let i = 0; i < 15; i++) {
    const s = await get(container.id, { fields: 'status_code', access_token: token });
    st = s.status_code;
    if (st === 'FINISHED') break;
    if (st === 'ERROR') throw new Error('IG status ERROR');
    await sleep(2000);
  }
  if (st !== 'FINISHED') throw new Error('IG status=' + st);

  const pub = await post(`${IG}/media_publish`, { creation_id: container.id, access_token: token });
  if (pub.error) throw new Error('IG publish: ' + pub.error.message);
  return pub.id;
}

// Facebook Page Stories: sobe a foto como NÃO publicada -> publica como story.
async function publishFB(url) {
  const pt = await pageToken();
  let photo = null;
  for (let i = 1; i <= 4; i++) {
    const p = await post(`${PAGE}/photos`, { url, published: 'false', access_token: pt });
    if (!p.error && p.id) { photo = p; break; }
    log(`     FB upload tentativa ${i} falhou: ${p.error?.message || 'sem id'}`);
    await sleep(4000);
  }
  if (!photo) throw new Error('FB upload falhou');

  const story = await post(`${PAGE}/photo_stories`, { photo_id: photo.id, access_token: pt });
  if (story.error) throw new Error('FB photo_stories: ' + story.error.message);
  return story.post_id || story.id || photo.id;
}

async function register({ img, url, title, channels, ig_media_id, fb_story_id }) {
  try {
    const now = new Date();
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const id = `story-feio-${dayKey}-${img.replace(/\.png$/, '')}-${mm}${dd}`;

    let data = { stories: [] };
    try { data = JSON.parse(await fs.readFile(STORE, 'utf-8')); } catch {}
    data.stories = data.stories || [];
    if (data.stories.some(s => s.id === id)) { log(`     já registrado (${id}) — não duplica`); return; }

    data.stories.unshift({
      id,
      client: 'Hamburgueria Feio',
      client_slug: 'feio',
      agencia: 'Starken',
      ig_username: 'hamburgueria.feio',
      title,
      slot,
      channels,                 // ['ig'], ['fb'] ou ['ig','fb']
      published_iso: now.toISOString(),
      image_url: url,
      media_id: ig_media_id || null,   // compat (IG)
      ig_media_id: ig_media_id || null,
      fb_story_id: fb_story_id || null,
    });
    data.updated_at = now.toISOString();
    await fs.writeFile(STORE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    log(`     registrado: ${id} [${channels.join('+')}]`);
  } catch (e) {
    log(`     falha ao registrar (publicação OK): ${e.message}`);
  }
}

log(`Feio · ${dayKey} · slot=${slot}${withPromo ? ' (+promo)' : ''} · canais=${channelsArg.join('+')} · ${items.length} story(s)`);
let failures = 0;
for (const it of items) {
  const url = `${BASE}/${it.img}`;
  log(`-> ${it.img} (${it.title})`);
  const channels = [];
  let ig_media_id = null, fb_story_id = null;

  if (wantIG) {
    try { ig_media_id = await publishIG(url); channels.push('ig'); log(`   IG ✓ media_id=${ig_media_id}`); }
    catch (e) { failures++; log(`   IG ERRO: ${e.message}`); }
  }
  if (wantFB) {
    try { fb_story_id = await publishFB(url); channels.push('fb'); log(`   FB ✓ story=${fb_story_id}`); }
    catch (e) { failures++; log(`   FB ERRO: ${e.message}`); }
  }

  if (channels.length) await register({ img: it.img, url, title: it.title, channels, ig_media_id, fb_story_id });
  else log(`   nada publicado p/ ${it.img}`);
}
if (failures) { log(`CONCLUÍDO com ${failures} falha(s) de canal`); process.exit(1); }
log('SEQUÊNCIA PUBLICADA ✓ (IG + FB)');
