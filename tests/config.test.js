import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { encrypt, decrypt, ownerId } from '../src/security.js';

const defaults = { ADMIN_TOKEN: 'temporary-test-token-not-a-secret-123456', NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://voice-test.invalid' };

test('Render Base64 and existing hex keys preserve encryption and owner identity', () => {
  const bytes = randomBytes(32);
  const hex = loadConfig({ ...defaults, DATA_KEY: bytes.toString('hex').toUpperCase() });
  const base64 = loadConfig({ ...defaults, DATA_KEY: bytes.toString('base64') });
  assert.equal(base64.dataKey, hex.dataKey);
  assert.deepEqual(decrypt(encrypt({ text: 'Histórico existente' }, hex.dataKey), base64.dataKey), { text: 'Histórico existente' });
  assert.equal(ownerId('account-test', base64.dataKey), ownerId('account-test', hex.dataKey));
});

test('Malformed, short and noncanonical keys are rejected', () => {
  const key = Buffer.alloc(32).toString('base64');
  for (const value of ['', 'a'.repeat(32), 'a'.repeat(63), Buffer.alloc(31).toString('base64'),
    Buffer.alloc(33).toString('base64'), key.slice(0, -1), ` ${key}`, key.slice(0, -2) + 'B=']) {
    assert.throws(() => loadConfig({ ...defaults, DATA_KEY: value }), /DATA_KEY requires/);
  }
});

test('First deployment starts with generated app keys and no paid provider credentials', () => {
  const config = loadConfig({ ...defaults, DATA_KEY: randomBytes(32).toString('base64') });
  assert.equal(config.production, true);
  assert.equal(config.baseUrl, 'https://voice-test.invalid');
  assert.equal(config.apiKey, '');
  assert.equal(config.skillId, '');
  assert.equal(config.allowedUsers.size, 0);
});
