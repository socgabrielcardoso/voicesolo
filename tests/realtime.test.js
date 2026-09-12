import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Realtime } from '../src/realtime.js';
import { fixture } from './helpers.js';

class Socket extends EventEmitter {
  constructor(url, options) {
    super(); this.url = url; this.options = options; this.readyState = 1; this.sent = [];
    queueMicrotask(() => this.emit('open'));
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  terminate() { this.readyState = 3; this.emit('close'); }
}

test('Realtime keeps API credentials server-side, deduplicates tools and enforces ownership', async t => {
  const { config, store } = fixture(t); let hungUp = 0;
  const provider = { request: async (path, options) => {
    if (path.endsWith('/hangup')) { hungUp++; return new Response(null, { status: 200 }); }
    assert.equal(options.contentType, null); assert.equal(options.safetyIdentifier, 'owner');
    assert.equal(options.body.get('sdp'), 'v=0\r\n');
    assert.equal(JSON.parse(options.body.get('session')).type, 'realtime');
    return new Response('v=0\r\nanswer', { status: 201, headers: { Location: '/v1/realtime/calls/rtc_test' } });
  } };
  const realtime = new Realtime(config, store, provider, Socket);
  const answer = await realtime.create('v=0\r\n', 'owner');
  assert.ok(!JSON.stringify(answer).includes(config.apiKey));
  await assert.rejects(realtime.create('v=0\r\n', 'owner'));
  const call = realtime.calls.get(answer.id);
  const event = Buffer.from(JSON.stringify({ type: 'response.function_call_arguments.done', call_id: 'tool-1', name: 'calculate', arguments: '{"operation":"multiply","a":6,"b":7}' }));
  call.socket.emit('message', event); call.socket.emit('message', event);
  assert.equal(call.socket.sent.length, 2); assert.equal(JSON.parse(call.socket.sent[0].item.output).result, 42);
  await assert.rejects(realtime.stop(answer.id, 'other-owner'));
  await realtime.stop(answer.id, 'owner');
  assert.equal(hungUp, 1); assert.equal(store.get('realtime', 'active'), null); assert.equal(realtime.calls.size, 0);
});

test('Realtime recovery terminates an interrupted session before allowing new calls', async t => {
  const { config, store } = fixture(t); let calls = 0;
  store.set('realtime', 'active', { id: 'rtc_old', owner: 'owner' });
  const realtime = new Realtime(config, store, { request: async path => { calls++; assert.ok(path.endsWith('/rtc_old/hangup')); return new Response(null); } }, Socket);
  await realtime.recover(); assert.equal(calls, 1); assert.equal(store.get('realtime', 'active'), null);
});
