import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const cronsPath = path.join(rootDir, 'data', 'crons.json');

// Paths to week 4 creative directories for Feio
const week4Dir = path.join(rootDir, 'Hamburgueria Feio', 'Criativos Semanais', '4 Semana');
const destPhotosDir = path.join(rootDir, 'feio', 'assets', 'photos');
const destVideosDir = path.join(rootDir, 'feio', 'assets', 'videos');

// Configure the posts to schedule
const posts = [
  {
    folder: '23-06',
    srcFileName: 'Feio.png',
    destFileName: 'feio-jun23.png',
    id: 'feed-feio-terca-0623',
    description: 'Feed Terça-Feira - 23/06',
    kind: 'feed',
    next_fire_iso: '2026-06-23T12:00:00.000Z', // 09:00 BRT
    isImage: true
  },
  {
    folder: '25-06',
    srcFileName: 'feio (1).mp4',
    destFileName: 'feio-jun25.mp4',
    id: 'reel-feio-quinta-0625',
    description: 'Reels Quinta-Feira - 25/06',
    kind: 'reel',
    next_fire_iso: '2026-06-25T12:00:00.000Z', // 09:00 BRT
    isImage: false
  }
];

// Ensure destination directories exist
if (!fs.existsSync(destPhotosDir)) {
  fs.mkdirSync(destPhotosDir, { recursive: true });
}
if (!fs.existsSync(destVideosDir)) {
  fs.mkdirSync(destVideosDir, { recursive: true });
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
  const srcFilePath = path.join(srcFolder, post.srcFileName);
  const srcCopyPath = path.join(srcFolder, 'Copy.txt');
  const destFilePath = path.join(post.isImage ? destPhotosDir : destVideosDir, post.destFileName);

  // Check if source files exist
  if (!fs.existsSync(srcFilePath)) {
    console.error(`❌ Source file not found: ${srcFilePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(srcCopyPath)) {
    console.error(`❌ Source copy not found: ${srcCopyPath}`);
    process.exit(1);
  }

  // Copy the asset file
  fs.copyFileSync(srcFilePath, destFilePath);
  console.log(`➡️ Copied: ${post.srcFileName} -> ${post.destFileName}`);

  // Read caption
  const caption = fs.readFileSync(srcCopyPath, 'utf8').trim();

  // Remove existing cron with the same ID if any
  doc.crons = doc.crons.filter(cron => cron.id !== post.id);

  // Add the new cron entry
  const cronEntry = {
    id: post.id,
    type: 'ig_publish',
    client: 'Hamburgueria Feio',
    client_slug: 'feio',
    description: post.description,
    next_fire_iso: post.next_fire_iso,
    tz: 'BRT',
    ig_business_id: '17841440639973754',
    kind: post.kind,
    session_dependent: false,
    recurring: false,
    status: 'pending',
    channels: ['ig', 'fb']
  };

  if (post.isImage) {
    cronEntry.image_url = `https://central.starkentecnologia.com.br/feio/assets/photos/${post.destFileName}`;
  } else {
    cronEntry.video = post.destFileName;
    cronEntry.thumb_offset = 2000; // ms for thumbnail offset
  }

  cronEntry.caption = caption;

  doc.crons.push(cronEntry);
  console.log(`✅ Scheduled: ${post.id} (${post.kind}) at ${post.next_fire_iso}`);
}

// Save crons.json
fs.writeFileSync(cronsPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('\n🎉 All crons for Hamburgueria Feio scheduled successfully in data/crons.json!');
