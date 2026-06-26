import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CRONS = path.join(ROOT, 'data', 'crons.json');

async function main() {
  console.log('Forçando stories de feijoada...');
  const doc = JSON.parse(await fs.readFile(CRONS, 'utf-8'));
  let updated = 0;
  for (const c of (doc.crons || [])) {
    if (c.id === 'story-centro-feijoada-casa-0626' || c.id === 'story-centro-feijoada-delivery-0626') {
      c.status = 'pending';
      c.next_fire_iso = new Date().toISOString();
      delete c.error;
      updated++;
    }
  }
  if (updated > 0) {
    doc.updated_at = new Date().toISOString();
    await fs.writeFile(CRONS, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
    console.log(`Sucesso: ${updated} agendamentos atualizados para pending e hora atual.`);
    
    // Executa o dispatcher imediatamente
    console.log('Executando o dispatcher...');
    try {
      const { stdout, stderr } = await execFileAsync('node', ['--env-file=.env', 'scripts/cron-dispatcher.mjs'], { cwd: ROOT });
      console.log('--- Dispatcher stdout ---');
      console.log(stdout);
      if (stderr) {
        console.error('--- Dispatcher stderr ---');
        console.error(stderr);
      }
    } catch (e) {
      console.error('Erro ao rodar dispatcher:', e.message);
      if (e.stdout) console.log(e.stdout);
      if (e.stderr) console.error(e.stderr);
    }
  } else {
    console.log('Erro: Agendamentos de feijoada não encontrados no crons.json.');
  }
}

main().catch(console.error);
