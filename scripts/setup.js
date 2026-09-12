import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const path = '.env';
let contents = readFileSync(existsSync(path) ? path : '.env.example', 'utf8');
for (const [name, value] of [['DATA_KEY', randomBytes(32).toString('hex')], ['ADMIN_TOKEN', randomBytes(32).toString('base64url')]]) {
  const pattern = new RegExp('^' + name + '=(.*)$', 'm');
  const match = contents.match(pattern);
  if (!match) contents += `\n${name}=${value}\n`;
  else if (!match[1].trim()) contents = contents.replace(pattern, name + '=' + value);
}
writeFileSync(path, contents, { mode: 0o600 });
console.log('Configuração local preparada em .env. Chaves existentes foram preservadas. Nenhum segredo foi exibido.');
