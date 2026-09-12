import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../src/openai.js';
import { executeTool } from '../src/tools.js';
import { realtimeSession } from '../src/realtime.js';
import { fixture } from './helpers.js';

test('Responses function round trip preserves call ID and uses stateless API storage', async t => {
  const { config } = fixture(t); const requests = [];
  const provider = new OpenAIProvider(config, async (url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(body.store, false);
    if (requests.length === 1) return Response.json({ output: [{ type: 'function_call', name: 'calculate', call_id: 'call_1', arguments: '{"operation":"multiply","a":7,"b":6}' }] });
    assert.deepEqual(JSON.parse(body.input.at(-1).output), { result: 42 }); assert.equal(body.input.at(-1).call_id, 'call_1');
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'São 42, Chefe.' }] }] });
  });
  assert.equal(await provider.answer('sete vezes seis', [], 'hashed-owner', AbortSignal.timeout(1000)), 'São 42, Chefe.');
  assert.equal(requests.length, 2);
});
test('unknown or malformed tools never execute actions', () => {
  for (const [name, args] of [['run_shell', { command: 'whoami' }], ['calculate', { operation: 'divide', a: 1, b: 0 }], ['calculate', { operation: 'add', a: 1, b: 2, code: 'x' }], ['current_time', { url: 'http://localhost' }]]) assert.throws(() => executeTool(name, args, { timeZone: 'UTC' }));
  assert.deepEqual(executeTool('calculate', { operation: 'add', a: 3, b: 4 }, {}), { result: 7 });
});
test('provider failures are sanitized and loop budget is enforced', async t => {
  const { config } = fixture(t);
  const failed = new OpenAIProvider(config, async () => new Response('secret upstream payload', { status: 401 }));
  await assert.rejects(failed.answer('x', [], 'owner', AbortSignal.timeout(1000)), error => error.status === 401 && !error.message.includes('secret'));
  let calls = 0;
  const looping = new OpenAIProvider(config, async () => { calls++; return Response.json({ output: [{ type: 'function_call', name: 'not_allowed', call_id: 'x', arguments: '{}' }] }); });
  await assert.rejects(looping.answer('x', [], 'owner', AbortSignal.timeout(1000)));
  assert.equal(calls, 3);
});
test('Realtime GA schema waits for user and exposes only constrained tools', t => {
  const { config } = fixture(t); const session = realtimeSession(config);
  assert.equal(session.type, 'realtime'); assert.equal(session.audio.input.turn_detection.eagerness, 'low');
  assert.equal(session.audio.input.turn_detection.interrupt_response, true);
  assert.deepEqual(session.tools.map(tool => tool.name), ['current_time', 'calculate']);
  assert.equal(session.max_output_tokens, 256);
});
