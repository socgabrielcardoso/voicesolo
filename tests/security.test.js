import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encrypt, decrypt, validateAlexaEnvelope, secureEqual, escapeXml } from '../src/security.js';
import { AmazonVerifier } from '../src/amazon-verifier.js';
import { fixture, envelope } from './helpers.js';

test('stored conversations are encrypted and tampering is rejected', t => {
  const { config, store, dir } = fixture(t);
  const text = 'private-canary-value';
  store.set('history', 'owner', [{ role: 'user', content: text }]);
  assert.equal(store.get('history', 'owner')[0].content, text);
  assert.ok(!readFileSync(dir + '/voice.sqlite-wal').includes(Buffer.from(text)));
  const encrypted = encrypt({ text }, config.dataKey);
  const damaged = Buffer.from(encrypted, 'base64'); damaged[damaged.length - 1] ^= 1;
  assert.throws(() => decrypt(damaged.toString('base64'), config.dataKey));
  assert.equal(secureEqual('abc', 'abcd'), false);
});
test('wrong application, stale/future timestamps and malformed envelopes are rejected', t => {
  const { config } = fixture(t);
  for (const change of [body => { body.context.System.application.applicationId = 'other'; }, body => { body.request.timestamp = 'bad'; }, body => { body.request.timestamp = new Date(Date.now() - 151000).toISOString(); }, body => { body.request.timestamp = new Date(Date.now() + 151000).toISOString(); }, body => { body.request.requestId = ''; }]) {
    const body = envelope(); change(body); assert.throws(() => validateAlexaEnvelope(body, config));
  }
  const body = envelope(); body.context.System.user.userId = 'another-account';
  assert.equal(validateAlexaEnvelope(body, config).authorized, false);
});
test('Amazon verifier rejects missing signatures and untrusted certificate URLs without network', async () => {
  const verifier = new AmazonVerifier();
  await assert.rejects(verifier.verify('{}', {}));
  for (const url of ['http://s3.amazonaws.com/echo.api/cert', 'https://evil.example/echo.api/cert', 'https://s3.amazonaws.com.evil.example/echo.api/cert', 'https://s3.amazonaws.com/other/cert', 'https://user@s3.amazonaws.com/echo.api/cert', 'https://s3.amazonaws.com/echo.api/../other/cert']) {
    await assert.rejects(verifier.verify('{}', { signaturecertchainurl: url, 'signature-256': 'fake' }));
  }
});
test('SSML injection is escaped', () => {
  assert.equal(escapeXml('<audio src="https://evil">&\u0001'), '&lt;audio src=&quot;https://evil&quot;&gt;&amp;');
});
test('daily quota survives owner-history deletion and caps concurrent attempts', t => {
  const { store } = fixture(t);
  assert.equal(store.consume('text', 2), true);
  store.clearOwner('owner');
  assert.equal(store.consume('text', 2), true);
  assert.equal(store.consume('text', 2), false);
});
