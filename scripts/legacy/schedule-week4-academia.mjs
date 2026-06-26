import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const cronsPath = path.join(rootDir, 'data', 'crons.json');

// Paths to week 4 creative directories
const week4Dir = path.join(rootDir, 'Academia São Pedro', 'Criativos Semanais', '4 Semana');
const destPhotosDir = path.join(rootDir, 'academia', 'assets', 'photos');

// Configure the posts to schedule
const posts = [
  {
    folder: '23-06',
    srcImageName: '0204 (7) (1).png',
    destImageName: '0204-jun23.png',
    id: 'feed-academia-terca-0623',
    description: 'Feed Terça-Feira - 23/06',
    next_fire_iso: '2026-06-23T12:00:00.000Z' // 09:00 BRT
  },
  {
    folder: '25-06',
    srcImageName: 'Academia_Agosto-16 (1) (1).jpg',
    destImageName: 'academia-jun25.jpg',
    id: 'feed-academia-quinta-0625',
    description: 'Feed Quinta-Feira - 25/06',
    next_fire_iso: '2026-06-25T12:00:00.000Z' // 09:00 BRT
  },
  {
    folder: '27-06',
    srcImageName: '0204 (6) (1).png',
    destImageName: '0204-jun27.png',
    id: 'feed-academia-sabado-0627',
    description: 'Feed Sábado - 27/06',
    next_fire_iso: '2026-06-27T12:00:00.000Z' // 09:00 BRT
  }
];

// Ensure destination photos directory exists
if (!fs.existsSync(destPhotosDir)) {
  fs.mkdirSync(destPhotosDir, { recursive: true });
}

// Read current crons.json
let doc;
try {
  doc = JSON.parse(fs.readFileSync(cronsPath, 'utf8'));
} catch (e) {
  console.error('Failed to read crons.json:', e.message);
  process.exit(1);
}

// Process each post
for (const post of posts) {
  const srcFolder = path.join(week4Dir, post.folder);
  const srcImagePath = path.join(srcFolder, post.srcImageName);
  const srcCopyPath = path.join(srcFolder, 'Copy.txt');
  const destImagePath = path.join(destPhotosDir, post.destImageName);

  // Check if source files exist
  if (!fs.existsSync(srcImagePath)) {
    console.error(`❌ Source image not found: ${srcImagePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(srcCopyPath)) {
    console.error(`❌ Source copy not found: ${srcCopyPath}`);
    process.exit(1);
  }

  // Copy the image
  fs.copyFileSync(srcImagePath, destImagePath);
  console.log(`➡️ Copied: ${post.srcImageName} -> ${post.destImageName}`);

  // Read caption
  const caption = fs.readFileSync(srcCopyPath, 'utf8').trim();

  // Remove existing cron with the same ID if any
  doc.crons = doc.crons.filter(cron => cron.id !== post.id);

  // Add the new cron entry
  doc.crons.push({
    id: post.id,
    type: 'ig_publish',
    client: 'Academia São Pedro',
    client_slug: 'academia',
    description: post.description,
    next_fire_iso: post.next_fire_iso,
    tz: 'BRT',
    ig_business_id: '17841414456130251',
    kind: 'feed',
    image_url: `https://central.starkentecnologia.com.br/academia/assets/photos/${post.destImageName}`,
    caption: caption,
    session_dependent: false,
    recurring: false,
    status: 'pending',
    channels: ['ig', 'fb']
  });

  console.log(`✅ Scheduled: ${post.id} at ${post.next_fire_iso}`);
}

// Save crons.json
fs.writeFileSync(cronsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('\n🎉 All crons scheduled successfully in data/crons.json!');
