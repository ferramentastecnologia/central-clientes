// Publica a sequência de stories recorrentes da Hamburgueria Feio no Instagram
// e auto-registra cada um em data/stories-publicados.json (área "📱 Stories
// Publicados" do dashboard).
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
// Disparado pelos timers systemd na VPS (ver scripts/README.md) ou manualmente.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const IG = '17841440639973754'; // Hamburgueria Feio · @hamburgueria.feio
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

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }
if (!day) { log(`FALHOU: --day inválido (${dayKey}). Use: ${Object.keys(DAYS).join(', ')}`); process.exit(1); }
if (slot !== 'almoco' && slot !== 'jantar') { log(`FALHOU: --slot inválido (${slot}). Use: almoco, jantar`); process.exit(1); }

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

async function publishOne({ img, title }) {
  const url = `${BASE}/${img}`;
  log(`-> ${img} (${title})`);

  let container = null;
  for (let i = 1; i <= 4; i++) {
    const c = await post(`${IG}/media`, { media_type: 'STORIES', image_url: url, access_token: token });
    if (!c.error) { container = c; log(`   container ok (tentativa ${i}): ${c.id}`); break; }
    log(`   tentativa ${i} falhou: ${c.error.message}`);
    await sleep(4000);
  }
  if (!container) throw new Error(`container falhou: ${img}`);

  let st = 'IN_PROGRESS';
  for (let i = 0; i < 15; i++) {
    const s = await get(container.id, { fields: 'status_code', access_token: token });
    st = s.status_code;
    if (st === 'FINISHED') break;
    if (st === 'ERROR') throw new Error(`status ERROR: ${img}`);
    await sleep(2000);
  }
  if (st !== 'FINISHED') throw new Error(`status=${st}: ${img}`);

  const pub = await post(`${IG}/media_publish`, { creation_id: container.id, access_token: token });
  if (pub.error) throw new Error(`publish erro (${img}): ${pub.error.message}`);
  log(`   PUBLICADO ✓ media_id=${pub.id}`);
  return { media_id: pub.id, url, title, img };
}

async function register({ media_id, url, title, img }) {
  try {
    const now = new Date();
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const id = `story-feio-${dayKey}-${img.replace(/\.png$/, '')}-${mm}${dd}`;

    let data = { stories: [] };
    try { data = JSON.parse(await fs.readFile(STORE, 'utf-8')); } catch {}
    data.stories = data.stories || [];
    if (data.stories.some(s => s.id === id)) { log(`   já registrado (${id}) — não duplica`); return; }

    data.stories.unshift({
      id,
      client: 'Hamburgueria Feio',
      client_slug: 'feio',
      agencia: 'Starken',
      ig_username: 'hamburgueria.feio',
      title,
      slot,
      published_iso: now.toISOString(),
      image_url: url,
      media_id,
    });
    data.updated_at = now.toISOString();
    await fs.writeFile(STORE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    log(`   registrado em stories-publicados.json: ${id}`);
  } catch (e) {
    log(`   falha ao registrar (publicação OK): ${e.message}`);
  }
}

log(`Feio · ${dayKey} · slot=${slot}${withPromo ? ' (+promo)' : ''} · ${items.length} story(s)`);
let failures = 0;
for (const it of items) {
  try {
    const res = await publishOne(it);
    await register(res);
  } catch (e) {
    failures++;
    log(`ERRO: ${e.message}`);
  }
}
if (failures) { log(`CONCLUÍDO com ${failures} falha(s)`); process.exit(1); }
log('SEQUÊNCIA PUBLICADA ✓');
