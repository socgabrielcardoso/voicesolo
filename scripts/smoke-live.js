import { loadConfig } from '../src/config.js';
import { OpenAIProvider } from '../src/openai.js';
import { ownerId } from '../src/security.js';

const config = loadConfig();
if (!config.apiKey) { console.error('PENDENTE: chave OpenAI. Nenhuma chamada foi executada.'); process.exit(1); }
const provider = new OpenAIProvider(config);
try {
  const text = await provider.answer('Responda somente: conexão confirmada.', [], ownerId('live-check', config.dataKey), AbortSignal.timeout(20000));
  if (!text) throw new Error('Empty response');
  const audio = await provider.speech('Conexão confirmada.', AbortSignal.timeout(20000));
  if (audio.length < 1000) throw new Error('Empty audio');
  console.log('OK: Responses e Speech retornaram conteúdo real. Este teste consome créditos da API. Realtime, Amazon e Echo exigem validação separada.');
} catch (error) { console.error(`FALHA: integração OpenAI (${error.status || error.name}).`); process.exitCode = 1; }
