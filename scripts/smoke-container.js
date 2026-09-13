import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Dedicated disposable resources; never reads .env or calls OpenAI.
const suffix = randomBytes(6).toString('hex');
const name = `voice-smoke-${suffix}`;
const volume = `${name}-data`;
const image = `gabriel-voice-os-smoke:${suffix}`;
const env = {
  ...process.env,
  NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '3000', DATA_DIR: '/app/data',
  RENDER_EXTERNAL_URL: 'https://container-test.invalid', PUBLIC_BASE_URL: '',
  OPENAI_API_KEY: '', ALEXA_SKILL_ID: '', ALLOWED_ALEXA_USERS: '',
  ADMIN_TOKEN: randomBytes(32).toString('base64'), DATA_KEY: randomBytes(32).toString('base64')
};

function docker(args, { visible = false, timeout = 30000, allowFailure = false } = {}) {
  const result = spawnSync('docker', args, {
    env, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024,
    stdio: visible ? 'inherit' : 'pipe'
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    // Arguments contain only environment variable names, never their values.
    throw new Error(`Docker ${args[0]} failed: ${result.error?.message || result.stderr || result.status}`);
  }
  return (result.stdout || '').trim();
}

let origin;
async function request(path, options = {}) {
  return fetch(`${origin}${path}`, { ...options, signal: AbortSignal.timeout(3000) });
}
async function ready() {
  const port = docker(['port', name, '3000/tcp']);
  assert.match(port, /^127\.0\.0\.1:\d+$/);
  origin = `http://${port}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await request('/healthz');
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok', service: 'gabriel-voice-os' });
      return;
    } catch { await delay(250); }
  }
  throw new Error('Container did not become healthy');
}

function inside(source) {
  return docker(['exec', '--user', '1000:1000', name, 'node', '--input-type=module', '-e', source]);
}

try {
  docker(['version', '--format', '{{.Server.Version}}']);
  docker(['build', '--tag', image, '.'], { visible: true, timeout: 600000 });
  docker(['volume', 'create', volume]);
  docker(['run', '--detach', '--name', name,
    '--mount', `type=volume,src=${volume},dst=/app/data,volume-nocopy`,
    '--publish', '127.0.0.1::3000',
    ...['NODE_ENV', 'HOST', 'PORT', 'DATA_DIR', 'RENDER_EXTERNAL_URL', 'PUBLIC_BASE_URL',
      'OPENAI_API_KEY', 'ALEXA_SKILL_ID', 'ALLOWED_ALEXA_USERS', 'ADMIN_TOKEN', 'DATA_KEY'].flatMap(key => ['--env', key]), image]);
  await ready();

  const page = await request('/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Donna/);
  assert.equal(page.headers.get('strict-transport-security'), 'max-age=31536000');
  assert.equal((await request('/api/status')).status, 401);
  assert.equal((await request('/.env')).status, 404);
  assert.equal((await request('/data/voice.sqlite')).status, 404);
  const headers = { Authorization: `Bearer ${env.ADMIN_TOKEN}`, Origin: env.RENDER_EXTERNAL_URL };
  const status = await request('/api/status', { headers });
  assert.equal(status.status, 200);
  const configuration = await status.json();
  assert.equal(configuration.openaiConfigured, false);
  assert.equal(configuration.alexaConfigured, false);
  assert.equal((await request('/api/status', { headers: { ...headers, Origin: 'https://other.invalid' } })).status, 403);

  inside(`
    import assert from 'node:assert/strict';
    import { readFileSync, statSync, existsSync } from 'node:fs';
    import { loadConfig } from './src/config.js';
    import { Store } from './src/store.js';
    assert.match(readFileSync('/proc/1/status', 'utf8'), /^Uid:\\s+1000\\s+1000\\s+1000\\s+1000$/m);
    assert.equal(statSync('/app/data').uid, 1000);
    assert.equal(statSync('/app/data').mode & 0o777, 0o700);
    assert.equal(statSync('/app/data/voice.sqlite').mode & 0o777, 0o600);
    assert.equal(existsSync('/app/.env'), false);
    assert.equal(existsSync('/app/.git'), false);
    const store = new Store(loadConfig());
    store.set('container-smoke', 'checkpoint', { text: 'Persistência criptografada' }, 300);
    store.consume('container-smoke', 2);
    store.close();
  `);
  docker(['exec', '--user', '1000:1000', name, 'ffmpeg', '-version']);
  docker(['exec', '--user', '1000:1000', name, 'ffprobe', '-version']);

  docker(['stop', '--time', '10', name]);
  assert.equal(docker(['inspect', '--format', '{{.State.ExitCode}}', name]), '0');
  docker(['start', name]);
  await ready();
  inside(`
    import assert from 'node:assert/strict';
    import { loadConfig } from './src/config.js';
    import { Store } from './src/store.js';
    const store = new Store(loadConfig());
    assert.deepEqual(store.get('container-smoke', 'checkpoint'), { text: 'Persistência criptografada' });
    assert.equal(store.usage().find(row => row.kind === 'container-smoke').count, 1);
    store.close();
  `);
  docker(['stop', '--time', '10', name]);
  assert.equal(docker(['inspect', '--format', '{{.State.ExitCode}}', name]), '0');
  console.log('Container smoke passed: image build, production startup, private HTTP, UID 1000, volume permissions, FFmpeg, graceful stop and encrypted restart persistence. No OpenAI calls or public deployment.');
} catch (error) {
  console.error(error.message);
  console.error(docker(['logs', '--tail', '40', name], { allowFailure: true }));
  process.exitCode = 1;
} finally {
  docker(['rm', '--force', name], { allowFailure: true });
  docker(['volume', 'rm', volume], { allowFailure: true });
  docker(['image', 'rm', image], { allowFailure: true });
}
