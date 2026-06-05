// Publica um story recorrente da Hamburgueria Feio no Instagram e auto-registra
// em data/stories-publicados.json (área "📱 Stories Publicados" do dashboard).
//
// Uso:
//   node --env-file=.env scripts/publish-story-feio.mjs --day=sexta
//   node --env-file=.env scripts/publish-story-feio.mjs --day=sabado
//
// Disparado pelo timer systemd na VPS (ver scripts/README.md) ou manualmente.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const IG = '17841440639973754'; // Hamburgueria Feio
const BASE = 'https://central.starkentecnologia.com.br/feio/assets/photos';
const STORE = process.env.STORIES_STORE || path.join(__dirname, '..', 'data', 'stories-publicados.json');

// Catálogo de stories recorrentes por dia da semana.
const PROMOS = {
  segunda: { img: 'promo-segunda.png', title: 'Promo de segunda' },
  quinta:  { img: 'promo-quinta.png',  title: 'Promo de quinta' },
  sexta:   { img: 'promo-sexta.png',   title: 'Promo de sexta' },
  sabado:  { img: 'promo-sabado.png',  title: 'Promo de sábado' },
};

const dayArg = (process.argv.find(a => a.startsWith('--day=')) || '').split('=')[1];
const promo = PROMOS[dayArg];

const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }
if (!promo) { log(`FALHOU: --day inválido (${dayArg}). Use: ${Object.keys(PROMOS).join(', ')}`); process.exit(1); }

const IMG = `${BASE}/${promo.img}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (n, p) => fetch(`https://graph.facebook.com/${GV}/${n}`, { method: 'POST', body: new URLSearchParams(p) }).then(r => r.json());
const get = (n, q) => fetch(`https://graph.facebook.com/${GV}/${n}?` + new URLSearchParams(q)).then(r => r.json());

log(`publicando story Feio · ${dayArg} · ${IMG}`);

let container = null;
for (let i = 1; i <= 4; i++) {
  const c = await post(`${IG}/media`, { media_type: 'STORIES', image_url: IMG, access_token: token });
  if (!c.error) { container = c; log(`container ok tentativa ${i}: ${c.id}`); break; }
  log(`tentativa ${i} falhou: ${c.error.message}`);
  await sleep(4000);
}
if (!container) { log('FALHOU: container'); process.exit(1); }

let st = 'IN_PROGRESS';
for (let i = 0; i < 15; i++) {
  const s = await get(container.id, { fields: 'status_code', access_token: token });
  st = s.status_code;
  if (st === 'FINISHED') break;
  if (st === 'ERROR') { log('status ERROR'); process.exit(1); }
  await sleep(2000);
}
if (st !== 'FINISHED') { log('status=' + st); process.exit(1); }

const pub = await post(`${IG}/media_publish`, { creation_id: container.id, access_token: token });
if (pub.error) { log('publish erro: ' + pub.error.message); process.exit(1); }
log('STORY PUBLICADO ✓ media_id=' + pub.id);

// Auto-registro no dashboard (Stories Publicados)
try {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = `story-feio-${dayArg}-${mm}${dd}`;

  let data = { stories: [] };
  try { data = JSON.parse(await fs.readFile(STORE, 'utf-8')); } catch {}
  data.stories = data.stories || [];

  if (!data.stories.some(s => s.id === id)) {
    data.stories.unshift({
      id,
      client: 'Hamburgueria Feio',
      client_slug: 'feio',
      agencia: 'Starken',
      ig_username: 'hamburgueria.feio',
      title: promo.title,
      published_iso: now.toISOString(),
      image_url: IMG,
      media_id: pub.id,
    });
    data.updated_at = now.toISOString();
    await fs.writeFile(STORE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    log('registrado em stories-publicados.json: ' + id);
  } else {
    log('já existe entrada ' + id + ' — não duplica');
  }
} catch (e) {
  log('falha ao registrar no json (publicação OK): ' + e.message);
}
