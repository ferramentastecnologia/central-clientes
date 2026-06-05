// One-off: post Dia dos Namorados 2026 (sorteio) da Academia São Pedro.
// Publica FEED (com copy) + STORIES no Instagram E no Facebook — best-effort por alvo.
// Registra feed em posts-publicados.json e stories em stories-publicados.json.
//
//   node --env-file=.env scripts/publish-namorados-academia.mjs
//
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const IG = '17841414456130251';   // @academiasaopedro
const PAGE = '1374528172770344';  // Página FB Academia São Pedro
const FEED_IMG = 'https://central.starkentecnologia.com.br/academia/assets/namorados-feed.png';
const STORY_IMG = 'https://central.starkentecnologia.com.br/academia/assets/namorados-story.png';

const CAPTION = `Os melhores casais são aqueles que crescem juntos dentro e fora da academia. 💛

Na semana do Dia dos Namorados, a Academia São Pedro vai sortear pra um casal que treina (ou que quer começar a treinar) junto:

🏆 PRÊMIO ESCOLHA DO CASAL:

➡️ 1 mensalidade GRATUITA — uma pessoa ganha uma mensalidade!

ou

➡️ 50% de desconto na mensalidade pra cada um — descontão direto no plano!

O casal sorteado escolhe a opção que faz mais sentido pra vocês. 😍

Como participar:

1️⃣ Siga @academiasaopedro aqui no Instagram
2️⃣ Marque seu par de treino nos comentários deste post
3️⃣ Compartilhe nos Stories e nos marque, vale ponto extra na sorte 🎯

📍 Academia São Pedro
💌 Pega o seu par e bora deixar isso oficial 👇`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (n, p) => fetch(`https://graph.facebook.com/${GV}/${n}`, { method: 'POST', body: new URLSearchParams(p) }).then(r => r.json());
const get  = (n, q) => fetch(`https://graph.facebook.com/${GV}/${n}?` + new URLSearchParams(q)).then(r => r.json());
const log  = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }

let pageTokenCache = null;
async function pageToken() {
  if (pageTokenCache) return pageTokenCache;
  const r = await get(PAGE, { fields: 'access_token', access_token: token });
  if (r.error || !r.access_token) throw new Error('page token: ' + (r.error?.message || 'sem token'));
  pageTokenCache = r.access_token;
  return pageTokenCache;
}

// ---- Instagram ----
async function igContainerPublish(params) {
  let c = null;
  for (let i = 1; i <= 4; i++) {
    const r = await post(`${IG}/media`, { ...params, access_token: token });
    if (!r.error) { c = r; break; }
    log(`   IG container tentativa ${i}: ${r.error.message}`);
    await sleep(4000);
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
const publishIGFeed  = () => igContainerPublish({ image_url: FEED_IMG, caption: CAPTION });
const publishIGStory = () => igContainerPublish({ image_url: STORY_IMG, media_type: 'STORIES' });

// ---- Facebook ----
async function publishFBFeed() {
  const pt = await pageToken();
  const r = await post(`${PAGE}/photos`, { url: FEED_IMG, caption: CAPTION, access_token: pt });
  if (r.error) throw new Error('FB feed: ' + r.error.message);
  return r.post_id || r.id;
}
async function publishFBStory() {
  const pt = await pageToken();
  let photo = null;
  for (let i = 1; i <= 4; i++) {
    const p = await post(`${PAGE}/photos`, { url: STORY_IMG, published: 'false', access_token: pt });
    if (!p.error && p.id) { photo = p; break; }
    log(`   FB story upload tentativa ${i}: ${p.error?.message || 'sem id'}`);
    await sleep(4000);
  }
  if (!photo) throw new Error('FB story upload falhou');
  const s = await post(`${PAGE}/photo_stories`, { photo_id: photo.id, access_token: pt });
  if (s.error) throw new Error('FB photo_stories: ' + s.error.message);
  return s.post_id || s.id || photo.id;
}

async function igPermalink(mediaId) {
  try { const r = await get(mediaId, { fields: 'permalink', access_token: token }); return r.permalink || null; } catch { return null; }
}

async function writeStore(file, mutate) {
  const fp = path.join(DATA, file);
  let data = {};
  try { data = JSON.parse(await fs.readFile(fp, 'utf-8')); } catch {}
  mutate(data);
  data.updated_at = new Date().toISOString();
  await fs.writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

const now = new Date();
const iso = now.toISOString();

log('Academia · Dia dos Namorados · FEED + STORIES · IG + FB');

// FEED (IG + FB)
let igFeedId = null, fbFeedId = null;
try { igFeedId = await publishIGFeed(); log('   IG feed ✓ ' + igFeedId); } catch (e) { log('   IG feed ERRO: ' + e.message); }
try { fbFeedId = await publishFBFeed(); log('   FB feed ✓ ' + fbFeedId); } catch (e) { log('   FB feed ERRO: ' + e.message); }

if (igFeedId || fbFeedId) {
  const igLink = igFeedId ? await igPermalink(igFeedId) : null;
  const fbLink = fbFeedId ? `https://www.facebook.com/${fbFeedId}` : null;
  await writeStore('posts-publicados.json', (d) => {
    d.posts = d.posts || [];
    const id = `post-academia-namorados-0605`;
    if (d.posts.some(p => p.id === id)) return;
    d.posts.unshift({
      id, client: 'Academia São Pedro', client_slug: 'academia', agencia: 'Starken',
      ig_username: 'academiasaopedro', title: 'Sorteio Dia dos Namorados', published_iso: iso,
      image_url: FEED_IMG, caption: CAPTION,
      channels: { instagram: igLink || undefined, facebook: fbLink || undefined },
    });
  });
  log('   feed registrado em posts-publicados.json');
}

// STORIES (IG + FB)
let igStoryId = null, fbStoryId = null;
try { igStoryId = await publishIGStory(); log('   IG story ✓ ' + igStoryId); } catch (e) { log('   IG story ERRO: ' + e.message); }
try { fbStoryId = await publishFBStory(); log('   FB story ✓ ' + fbStoryId); } catch (e) { log('   FB story ERRO: ' + e.message); }

if (igStoryId || fbStoryId) {
  const channels = [];
  if (igStoryId) channels.push('ig');
  if (fbStoryId) channels.push('fb');
  await writeStore('stories-publicados.json', (d) => {
    d.stories = d.stories || [];
    const id = `story-academia-namorados-0605`;
    if (d.stories.some(s => s.id === id)) return;
    d.stories.unshift({
      id, client: 'Academia São Pedro', client_slug: 'academia', agencia: 'Starken',
      ig_username: 'academiasaopedro', title: 'Dia dos Namorados', channels,
      published_iso: iso, image_url: STORY_IMG,
      media_id: igStoryId || null, ig_media_id: igStoryId || null, fb_story_id: fbStoryId || null,
    });
  });
  log('   story registrado em stories-publicados.json');
}

const ok = [igFeedId, fbFeedId, igStoryId, fbStoryId].filter(Boolean).length;
log(`CONCLUÍDO · ${ok}/4 alvos publicados`);
if (ok < 4) process.exit(1);
