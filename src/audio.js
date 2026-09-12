import { spawn } from 'node:child_process';
import { PUBLIC_PHRASES } from './persona.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function publicAudioPath(config, name) {
  if (!Object.hasOwn(PUBLIC_PHRASES, name)) return null;
  const path = join(config.dataDir, 'public-audio', `${name}.mp3`);
  return existsSync(path) ? path : null;
}

export function encodeAlexaMp3(pcm, binary = 'ffmpeg') {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-write_xing', '0', '-f', 'mp3', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const chunks = [];
    const timer = setTimeout(() => { child.kill(); reject(new Error('Audio conversion timeout')); }, 10000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('FFmpeg unavailable')); });
    child.stdin.on('error', () => {});
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.resume();
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error('Audio conversion failed')); });
    child.stdin.end(pcm);
  });
}
