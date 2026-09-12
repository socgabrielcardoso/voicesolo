import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
}
for (const path of ['src', 'scripts', 'public', 'tests'].flatMap(walk).filter(path => path.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
const model = JSON.parse(readFileSync('skill/interactionModels/custom/pt-BR.json', 'utf8')).interactionModel.languageModel;
for (const intent of model.intents) {
  if ((intent.slots || []).filter(slot => slot.type === 'AMAZON.SearchQuery').length > 1) throw new Error('Only one phrase slot per intent');
  if ((intent.slots || []).some(slot => slot.type === 'AMAZON.SearchQuery') && intent.samples.some(sample => /^\{\w+\}$/.test(sample))) throw new Error('SearchQuery requires a carrier phrase');
}
console.log('Sintaxe JavaScript e estrutura do modelo pt-BR verificadas. Build da Amazon ainda requer o console.');
