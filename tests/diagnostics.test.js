import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture } from './helpers.js';
import { runStartupDiagnostic } from '../src/diagnostics.js';

test('startup probe is opt-in, bounded, redacted and never repeated for the same run', async t => {
  const { config, dir } = fixture(t); const logs = []; const requests = [];
  const options = { runId: 'test-1', mode: 'responses', log: entry => logs.push(entry), fetchImpl: async (url, init) => {
    requests.push({ url, init });
    if (init.method === 'GET') return Response.json({ id: 'gpt-4.1-mini' });
    const body = JSON.parse(init.body);
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, 32); assert.deepEqual(body.tools, []);
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'private result never logged' }] }], usage: { input_tokens: 500, input_tokens_details: { cached_tokens: 100 }, output_tokens: 10 } });
  } };
  await runStartupDiagnostic(config, { ...options, runId: '' });
  assert.equal(requests.length, 0);
  const result = await runStartupDiagnostic(config, options);
  assert.equal(result.status, 'responses_passed'); assert.equal(result.calculatedUsd, 0.000186);
  assert.equal((await runStartupDiagnostic(config, options)).status, 'already_attempted');
  assert.equal(requests.length, 2);
  const persisted = readFileSync(join(dir, 'diagnostics', 'test-1.json'), 'utf8');
  assert.ok(!persisted.includes(config.apiKey)); assert.ok(!JSON.stringify(logs).includes('private result'));
});

test('invalid credentials never reach Responses; quota failures are sanitized without retries', async t => {
  const { config } = fixture(t); let calls = 0;
  const invalid = await runStartupDiagnostic(config, { runId: 'invalid-key', mode: 'responses', log: () => {}, fetchImpl: async () => { calls++; return Response.json({ error: { code: 'invalid_api_key', message: config.apiKey } }, { status: 401 }); } });
  assert.equal(calls, 1); assert.equal(invalid.code, 'invalid_api_key'); assert.equal(invalid.responsesRequests, 0);
  const quota = await runStartupDiagnostic(config, { runId: 'quota', mode: 'responses', log: () => {}, fetchImpl: async (_, init) => init.method === 'GET' ? Response.json({ id: config.textModel }) : Response.json({ error: { code: 'insufficient_quota', message: config.apiKey } }, { status: 429 }) });
  assert.equal(quota.httpStatus, 429); assert.equal(quota.code, 'insufficient_quota'); assert.equal(quota.usageUnavailable, true);
  assert.ok(!JSON.stringify([invalid, quota]).includes(config.apiKey));
});

test('operator options reject path traversal and unpriced models without network access', async t => {
  const { config } = fixture(t);
  const options = { log: () => {}, fetchImpl: () => assert.fail('must not contact OpenAI') };
  assert.equal((await runStartupDiagnostic(config, { ...options, runId: '../escape' })).status, 'invalid_options');
  assert.equal((await runStartupDiagnostic({ ...config, textModel: 'other-model' }, { ...options, runId: 'new', mode: 'responses' })).status, 'unapproved_diagnostic_model');
});
