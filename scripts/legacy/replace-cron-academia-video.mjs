import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronsPath = path.join(__dirname, '..', 'data', 'crons.json');

const caption = `Tudo é na base do esforço. 💪

Ninguém cresce por acaso. Ninguém conquista resultados apenas desejando. O progresso acontece quando você decide fazer o que precisa ser feito, mesmo quando está cansado, mesmo quando não tem vontade e mesmo quando ninguém está vendo.

A verdade é simples: seu crescimento depende muito mais das suas atitudes do que das suas circunstâncias. Cada treino, cada escolha e cada dia de disciplina está construindo a pessoa que você será amanhã.

Pare de esperar a oportunidade perfeita. Pare de esperar alguém acreditar em você primeiro. O próximo nível da sua vida começa quando você assume a responsabilidade pela sua própria evolução.

Só depende de você. 🔥`;

let doc;
try {
  doc = JSON.parse(fs.readFileSync(cronsPath, 'utf8'));
} catch (e) {
  console.error('Failed to read crons.json:', e.message);
  process.exit(1);
}

// 1. Remove the old scheduled post if it exists
doc.crons = doc.crons.filter(cron => cron.id !== 'reel-academia-quinta-0618');

// Also filter out any existing -v2 to avoid duplicates if rerun
doc.crons = doc.crons.filter(cron => cron.id !== 'reel-academia-quinta-0618-v2');

// 2. Add the new video post
doc.crons.push({
  id: 'reel-academia-quinta-0618-v2',
  type: 'ig_publish',
  client: 'Academia São Pedro',
  client_slug: 'academia',
  description: 'Reels Quinta-Feira Novo',
  next_fire_iso: '2026-06-18T12:00:00.000Z', // 09:00 BRT
  tz: 'BRT',
  ig_business_id: '17841414456130251',
  kind: 'reel',
  video: '0615-jun18.mp4',
  thumb_offset: 2000, // Evita thumbnail preta
  caption: caption,
  status: 'pending',
  channels: ['ig', 'fb']
});

fs.writeFileSync(cronsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('✅ Cron do Reel da Academia São Pedro atualizado localmente!');
