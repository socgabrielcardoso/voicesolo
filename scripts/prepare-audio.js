import { mkdirSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '../src/config.js';
import { OpenAIProvider } from '../src/openai.js';
import { PUBLIC_PHRASES } from '../src/persona.js';
import { encodeAlexaMp3 } from '../src/audio.js';

export async function prepareAudio(config) {
  if (!config.apiKey) throw new Error('OPENAI_API_KEY não configurada.');
  const provider = new OpenAIProvider(config);
  const dir = join(config.dataDir, 'public-audio'); mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const [name, text] of Object.entries(PUBLIC_PHRASES)) {
    const file = join(dir, name + '.mp3');
    if (existsSync(file)) continue;
    const pcm = await provider.speech(text, AbortSignal.timeout(20000));
    const mp3 = await encodeAlexaMp3(pcm, config.ffmpeg);
    writeFileSync(file + '.tmp', mp3, { mode: 0o600 }); renameSync(file + '.tmp', file);
    console.log(JSON.stringify({ event: 'public_audio_prepared', name, bytes: mp3.length }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await prepareAudio(loadConfig()); }
  catch { console.error('Não foi possível preparar as falas públicas. Verifique chave, crédito e FFmpeg.'); process.exitCode = 1; }
}
