import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { Store } from '../src/store.js';

export function fixture(t, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-test-'));
  const config = { ...loadConfig({ DATA_KEY: randomBytes(32).toString('hex'), ADMIN_TOKEN: randomBytes(32).toString('hex'), DATA_DIR: dir, ALEXA_SKILL_ID: 'amzn1.ask.skill.test', ALLOWED_ALEXA_USERS: 'test-owner', OPENAI_API_KEY: 'test-only-not-a-real-key', ALEXA_WAIT_MS: '100' }), ...extra };
  const store = new Store(config);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { config, store, dir };
}
export function envelope(intent, text = 'o que é mfa') {
  return { version: '1.0', context: { System: { application: { applicationId: 'amzn1.ask.skill.test' }, user: { userId: 'test-owner' } } }, request: {
    type: intent ? 'IntentRequest' : 'LaunchRequest', timestamp: new Date().toISOString(), requestId: randomUUID(), locale: 'pt-BR',
    ...(intent ? { intent: { name: intent, slots: { query: { name: 'query', value: text } } } } : {})
  } };
}
