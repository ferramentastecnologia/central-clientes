import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronsPath = path.join(__dirname, '..', 'data', 'crons.json');

const caption = `🇧🇷🍔 Tem coisa que só o Brasil sabe fazer! 😋

Carne de verdade na chapa, verduras sempre fresquinhas, aquele hambúrguer caprichado e, pra fechar com chave de ouro, um brigadeiro que faz qualquer um sorrir! 🍅🥬🍔🍫

Aqui na Hamburgueria Feio, a gente acredita que comida boa é feita com ingredientes de qualidade, sabor de verdade e aquele toque especial que faz você querer voltar sempre. 🔥

Então já sabe: se bateu a fome, o destino é certo!

📍 Rua Alberto Stein, 132 – Velha
⏰ Almoço e jantar
📲 Delivery e consumo no local

Vem pro Feio e prova um pedacinho dessa paixão brasileira pelo sabor! 🇧🇷🍔❤️

#HamburgueriaFeio #ÉOBrasil #SaborDeVerdade #CarneDeVerdade #BurgerArtesanal #Blumenau #VemProFeio 🍔🇧🇷🔥`;

let doc;
try {
  doc = JSON.parse(fs.readFileSync(cronsPath, 'utf8'));
} catch (e) {
  console.error('Failed to read crons.json:', e.message);
  process.exit(1);
}

doc.crons.unshift({
  id: 'reel-feio-brasil-0617',
  type: 'ig_publish',
  client: 'Hamburgueria Feio',
  client_slug: 'feio',
  kind: 'reel',
  description: 'Reel É o Brasil Feio',
  next_fire_iso: new Date().toISOString(),
  tz: 'BRT',
  ig_business_id: '17841440639973754',
  video: 'brasil.mp4',
  thumb_offset: 2000,
  caption: caption,
  session_dependent: false,
  recurring: false,
  status: 'pending',
  channels: ['ig', 'fb']
});

fs.writeFileSync(cronsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('✅ Cron do Reel do Feio adicionado com sucesso no servidor!');
