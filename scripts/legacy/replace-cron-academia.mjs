import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronsPath = path.join(__dirname, '..', 'data', 'crons.json');

const caption = `Enquanto milhões acompanham a busca por um grande sonho, vale uma reflexão:

Qual é o seu objetivo hoje?

Mais saúde? Mais disposição? Mais qualidade de vida? Mais confiança?

Assim como uma seleção se prepara por anos para uma Copa do Mundo, suas conquistas também exigem preparação, disciplina e constância. Comece hoje. 🏆💪`;

let doc;
try {
  doc = JSON.parse(fs.readFileSync(cronsPath, 'utf8'));
} catch (e) {
  console.error('Failed to read crons.json:', e.message);
  process.exit(1);
}

// 1. Remove the old scheduled post if it exists
doc.crons = doc.crons.filter(cron => cron.id !== 'feed-academia-sexta-0619');

// 2. Add the new post
doc.crons.push({
  id: 'feed-academia-sexta-0619-v2',
  type: 'ig_publish',
  client: 'Academia São Pedro',
  client_slug: 'academia',
  description: 'Feed Sexta-Feira Novo',
  next_fire_iso: '2026-06-19T12:00:00.000Z', // 09:00 BRT
  tz: 'BRT',
  ig_business_id: '17841414456130251',
  kind: 'feed',
  image_url: 'https://central.starkentecnologia.com.br/academia/assets/photos/0204-jun19.png',
  caption: caption,
  session_dependent: false,
  recurring: false,
  status: 'pending',
  channels: ['ig', 'fb']
});

fs.writeFileSync(cronsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('✅ Cron da Academia São Pedro atualizado localmente!');
