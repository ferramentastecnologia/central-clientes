// Publica um REEL da Hamburgueria Feio no Instagram E no Facebook (best-effort por canal)
// e registra em data/posts-publicados.json.
//
//   node --env-file=.env scripts/publish-reel-feio.mjs --video=<arquivo.mp4> [--channels=ig,fb]
//
// O vídeo deve estar hospedado em feio/assets/videos/ (servido publicamente).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

const token = (process.env.META_GRAPH_TOKEN || '').trim();
const GV = 'v23.0';
const arg = (k) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };
const IG = arg('ig') || '17841440639973754';     // default @hamburgueria.feio
const PAGE = arg('page') || '101076538404413';   // default Página FB Hamburgueria FEIO
const BASE = arg('base') || 'https://central.starkentecnologia.com.br/feio/assets/videos';
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

const video = arg('video');
const thumbOffset = arg('thumb-offset');   // ms p/ capa do Reel (frame não-preto)
const channelsArg = (arg('channels') || 'ig,fb').split(',').map(s => s.trim()).filter(Boolean);
const wantIG = channelsArg.includes('ig');
const wantFB = channelsArg.includes('fb');

const DEFAULT_CAPTION = `❤️🍔 DIA DOS NAMORADOS NO FEIO · 12 DE JUNHO

O nosso COMBO DAS ANTIGAS, até então EXCLUSIVO DO DELIVERY e campeão de vendas nas entregas, agora também vai estar AQUI NA CASA! 💛 No Dia dos Namorados é a chance do casal vir consumir junto e aproveitar esse dia especial.

No combo:
🍔 2 X Salada
🥤 2 refrigerantes (à sua escolha)
🍟 1 acompanhamento
👉 tudo por R$ 74,80

E ainda tem mais: vamos SORTEAR UM VOUCHER DE R$ 100! 🎁
Pra concorrer é simples: venha na casa, poste e marque a gente (@hamburgueria.feio) nos stories. Já tá valendo! O casal sorteado leva R$ 100 pra gastar no Feio. 😍

📅 12/06 · Dia dos Namorados
📍 Aqui no salão do Feio

Vem aproveitar esse dia especial com a gente! Marca nos comentários aquele alguém especial que vai te trazer no Feio 👇❤️

#DiaDosNamorados #FeioHamburgueria #Blumenau #Hamburgueria #ComboDasAntigas`;
// Caption parametrizável: env REEL_CAPTION (usado pelo dispatcher) > --caption > default
const CAPTION = process.env.REEL_CAPTION || arg('caption') || DEFAULT_CAPTION;

if (!token) { log('FALHOU: META_GRAPH_TOKEN ausente'); process.exit(1); }
if (!video) { log('FALHOU: --video obrigatório'); process.exit(1); }

let url = `${BASE}/${video}`;   // pode virar a versão H.264 após transcode
const VIDEO_DIR = path.join(__dirname, '..', 'feio', 'assets', 'videos');
const FFMPEG = process.env.FFMPEG_BIN || '/usr/bin/ffmpeg';
const FFPROBE = process.env.FFPROBE_BIN || '/usr/bin/ffprobe';

// Garante H.264 (codec preferido do IG/FB). Se a origem não for h264, transcoda
// em alta qualidade (libopenh264, bitrate alto, faststart) e devolve o novo arquivo.
async function ensureH264(filename) {
  if (/-h264\.mp4$/i.test(filename)) { log('   arquivo já marcado -h264 — pulando transcode'); return filename; }
  const input = path.join(VIDEO_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  let codec = '';
  try {
    const { stdout } = await exec(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', input]);
    codec = stdout.trim();
  } catch (e) { log('   ffprobe indisponível (' + e.message + ') — usando arquivo original'); return filename; }
  log('   codec de origem: ' + codec + ' · contêiner: ' + ext);

  const outName = filename.replace(/\.[^.]+$/, '') + '-h264.mp4';
  const outPath = path.join(VIDEO_DIR, outName);

  if (codec === 'h264') {
    if (ext === '.mp4') return filename;                 // já no formato ideal
    log('   remux ' + ext + ' (h264) → .mp4 (sem perda)…');
    await exec(FFMPEG, ['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', outPath]);
    return outName;
  }
  if (codec === 'hevc' || codec === 'h265') {
    // ffmpeg-free não decodifica HEVC → não dá pra transcodar no servidor
    throw new Error('HEVC/H.265 não decodifica no servidor — exporte o vídeo em H.264 (iPhone: "Mais Compatível")');
  }
  // demais codecs decodificáveis (prores, mpeg4, vp9…) → transcoda p/ H.264
  log('   transcodando ' + codec + ' → H.264 (libopenh264, 14M)…');
  await exec(FFMPEG, ['-y', '-i', input, '-c:v', 'libopenh264', '-b:v', '14M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outPath], { maxBuffer: 1 << 27 });
  log('   transcode OK → ' + outName);
  return outName;
}

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

// ---- Instagram Reels ----
async function publishIG() {
  const c = await post(`${IG}/media`, { media_type: 'REELS', video_url: url, caption: CAPTION, share_to_feed: 'true', ...(thumbOffset ? { thumb_offset: thumbOffset } : {}), access_token: token });
  if (c.error) throw new Error('IG container: ' + c.error.message);
  log('   IG container: ' + c.id + ' (processando vídeo…)');
  let st = 'IN_PROGRESS';
  for (let i = 0; i < 60; i++) {            // até ~5 min
    await sleep(5000);
    const s = await get(c.id, { fields: 'status_code,status', access_token: token });
    st = s.status_code;
    if (st === 'FINISHED') break;
    if (st === 'ERROR') throw new Error('IG processing ERROR: ' + JSON.stringify(s.status || ''));
  }
  if (st !== 'FINISHED') throw new Error('IG status=' + st + ' (timeout)');
  const pub = await post(`${IG}/media_publish`, { creation_id: c.id, access_token: token });
  if (pub.error) throw new Error('IG publish: ' + pub.error.message);
  return pub.id;
}

// ---- Facebook Page Reels (upload resumável via file_url) ----
async function publishFB() {
  const pt = await pageToken();
  // 1) start
  const start = await post(`${PAGE}/video_reels`, { upload_phase: 'start', access_token: pt });
  if (start.error || !start.video_id) throw new Error('FB start: ' + (start.error?.message || 'sem video_id'));
  const videoId = start.video_id;
  const uploadUrl = start.upload_url || `https://rupload.facebook.com/video-upload/${GV}/${videoId}`;
  // 2) ingest hosted file
  const up = await fetch(uploadUrl, { method: 'POST', headers: { 'Authorization': 'OAuth ' + pt, 'file_url': url } }).then(r => r.json());
  if (up.error || up.success === false) throw new Error('FB upload: ' + (up.error?.message || JSON.stringify(up)));
  // 3) finish + publish
  let fin = null;
  for (let i = 0; i < 30; i++) {
    fin = await post(`${PAGE}/video_reels`, { upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', description: CAPTION, access_token: pt });
    if (!fin.error) break;
    // "not ready" → espera processar
    log('   FB finish tentativa ' + (i + 1) + ': ' + fin.error.message);
    await sleep(6000);
  }
  if (fin.error) throw new Error('FB finish: ' + fin.error.message);
  return videoId;
}

log(`Feio · REEL · ${video} · canais=${channelsArg.join('+')}`);
// Normaliza p/ H.264 (máxima compatibilidade/qualidade no Meta)
try { const f = await ensureH264(video); url = `${BASE}/${f}`; log('   publicando: ' + url); }
catch (e) { log('   transcode falhou (' + e.message + ') — seguindo com o original'); }
const channels = []; let ig_id = null, fb_id = null;
if (wantIG) { try { ig_id = await publishIG(); channels.push('ig'); log('   IG REEL ✓ ' + ig_id); } catch (e) { log('   IG ERRO: ' + e.message); } }
if (wantFB) { try { fb_id = await publishFB(); channels.push('fb'); log('   FB REEL ✓ ' + fb_id); } catch (e) { log('   FB ERRO: ' + e.message); } }

if (channels.length) {
  try {
    const now = new Date();
    const dd = String(now.getUTCDate()).padStart(2, '0'); const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const id = arg('id') || `reel-feio-namorados-${mm}${dd}`;
    let data = { posts: [] };
    try { data = JSON.parse(await fs.readFile(path.join(DATA, 'posts-publicados.json'), 'utf-8')); } catch {}
    data.posts = (data.posts || []).filter(p => p.id !== id);   // upsert (repost atualiza)
    {
      const igLink = ig_id ? (await get(ig_id, { fields: 'permalink', access_token: token }).then(r => r.permalink).catch(() => null)) : null;
      data.posts.unshift({
        id, client: arg('client') || 'Hamburgueria Feio', client_slug: arg('slug') || 'feio', agencia: 'Starken',
        ig_username: arg('ig-username') || 'hamburgueria.feio', title: arg('title') || 'Reel · Dia dos Namorados', published_iso: now.toISOString(),
        image_url: 'https://central.starkentecnologia.com.br/feio/assets/photos/promo-sexta.png',
        caption: CAPTION,
        channels: { instagram: igLink || undefined, facebook: fb_id ? `https://www.facebook.com/${fb_id}` : undefined },
      });
      data.updated_at = now.toISOString();
      await fs.writeFile(path.join(DATA, 'posts-publicados.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8');
      log('   registrado em posts-publicados.json: ' + id);
    }
  } catch (e) { log('   falha ao registrar (publicação OK): ' + e.message); }
  log(`CONCLUÍDO · ${channels.join('+')}`);
} else { log('FALHOU: nenhum canal publicou'); process.exit(1); }
