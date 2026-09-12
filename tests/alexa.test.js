import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createAlexa } from '../src/alexa.js';
import { Conversations } from '../src/conversation.js';
import { ownerId } from '../src/security.js';
import { fixture, envelope } from './helpers.js';

test('launch, unsigned-user allowlist, help and fallback avoid model calls', async t => {
  const { config, store } = fixture(t); let calls = 0;
  const conversations = new Conversations(config, store, { config, answer: async () => { calls++; return 'x'; } });
  const alexa = createAlexa(config, store, conversations);
  assert.match((await alexa(envelope())).response.outputSpeech.ssml, /Donna/);
  for (const name of ['AMAZON.HelpIntent', 'AMAZON.FallbackIntent']) assert.equal((await alexa(envelope(name))).response.shouldEndSession, false);
  const stranger = envelope('AskDonnaIntent'); stranger.context.System.user.userId = 'stranger';
  assert.equal((await alexa(stranger)).response.shouldEndSession, true);
  assert.equal(calls, 0);
});
test('duplicate Alexa requests share execution and cached response', async t => {
  const { config, store } = fixture(t); let calls = 0;
  const conversations = new Conversations(config, store, { config, answer: async () => { calls++; await delay(10); return 'Resposta <segura>.'; } });
  const alexa = createAlexa(config, store, conversations); const request = envelope('AskDonnaIntent');
  const [a, b] = await Promise.all([alexa(request), alexa(structuredClone(request))]);
  assert.deepEqual(a, b); assert.match(a.response.outputSpeech.ssml, /&lt;segura&gt;/);
  assert.deepEqual(await alexa(request), a); assert.equal(calls, 1);
});
test('slow answers return promptly then continue without another model call', async t => {
  const { config, store } = fixture(t); let finish, calls = 0;
  const conversations = new Conversations(config, store, { config, answer: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const alexa = createAlexa(config, store, conversations);
  const pending = await alexa(envelope('AskDonnaIntent'));
  assert.match(pending.response.outputSpeech.ssml, /continuar/);
  finish('Resposta concluída.'); await delay(0);
  assert.match((await alexa(envelope('ContinueIntent'))).response.outputSpeech.ssml, /Resposta concluída/);
  assert.equal(calls, 1);
});
test('forget requires confirmation and cancelled jobs cannot recreate history', async t => {
  const { config, store } = fixture(t); let finish;
  const conversations = new Conversations(config, store, { config, answer: () => new Promise(resolve => { finish = resolve; }) });
  const alexa = createAlexa(config, store, conversations);
  const owner = ownerId('test-owner', config.dataKey);
  store.set('history', owner, [{ role: 'user', content: 'private' }]);
  await alexa(envelope('ForgetIntent')); assert.ok(store.get('history', owner));
  await alexa(envelope('AMAZON.YesIntent')); assert.equal(store.get('history', owner), null);
  conversations.submit(owner, 'request'); conversations.forget(owner); finish('late result'); await delay(0);
  assert.equal(store.get('history', owner), null); assert.equal(store.get('job', owner), null);
});
test('restart marks outstanding work interrupted instead of silently repeating billing', t => {
  const { config, store } = fixture(t);
  store.set('job', 'owner', { id: 'pending', state: 'pending', delivered: false });
  const conversations = new Conversations(config, store, {});
  assert.equal(conversations.status('owner').state, 'failed');
});
