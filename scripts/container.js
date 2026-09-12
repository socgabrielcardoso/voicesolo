import { mkdirSync, chownSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.env.DATA_DIR || '/app/data');
if (process.getuid?.() === 0) {
  if (dir !== '/app/data') throw new Error('Container DATA_DIR must be /app/data');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chownSync(dir, 1000, 1000); chmodSync(dir, 0o700);
  process.setgid(1000); process.setuid(1000);
}
await import('../src/server.js');
