import { spawnSync } from 'node:child_process';
import { loadConfig } from '../src/config.js';

let failures = 0;
function check(name, ok, detail) { console.log(`${ok ? 'OK' : 'PENDENTE'}: ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures++; }
check('Node.js 24', Number(process.versions.node.split('.')[0]) === 24);
try {
  const config = loadConfig();
  check('Configuração e segredos locais', true);
  check('Chave OpenAI', Boolean(config.apiKey), 'valor nunca exibido');
  check('Skill ID Amazon', config.skillId.startsWith('amzn1.ask.skill.'));
  check('Conta Alexa autorizada', config.allowedUsers.size > 0);
  check('HTTPS público', config.baseUrl.startsWith('https://'), 'localhost serve somente para desenvolvimento');
  check('FFmpeg para falas públicas', spawnSync(config.ffmpeg, ['-version'], { stdio: 'ignore', timeout: 5000 }).status === 0);
} catch (error) { check('Configuração', false, error.message); }
console.log('Este diagnóstico não simula acesso à Echo nem chamadas bem-sucedidas à OpenAI.');
process.exitCode = failures ? 1 : 0;
