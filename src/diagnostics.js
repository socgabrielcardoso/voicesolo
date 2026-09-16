import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DONNA } from './persona.js';

const knownCodes = new Set(['invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found', 'permission_denied', 'billing_hard_limit_reached']);

// Operator-only startup probe: no HTTP route, no secret retrieval, no retries.
// Claim each run on the persistent disk BEFORE contacting the provider.
export async function runStartupDiagnostic(config, {
  runId = process.env.OPENAI_DIAGNOSTIC_RUN_ID || '',
  mode = process.env.OPENAI_DIAGNOSTIC_MODE || 'models',
  fetchImpl = fetch,
  log = entry => console.log(JSON.stringify(entry))
} = {}) {
  if (!runId) return;
  const emit = result => { log({ event: 'openai_diagnostic', runId, ...result }); return result; };
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(runId) || !['models', 'responses'].includes(mode)) return emit({ status: 'invalid_options' });
  if (!config.apiKey) return emit({ status: 'not_configured' });
  // Only this model has an approved price and output cap for the paid probe.
  if (mode === 'responses' && config.textModel !== 'gpt-4.1-mini') return emit({ status: 'unapproved_diagnostic_model' });

  const dir = join(config.dataDir, 'diagnostics');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `${runId}.json`);
  try {
    const claim = await open(path, 'wx', 0o600);
    try { await claim.writeFile(JSON.stringify({ status: 'claimed', mode })); }
    finally { await claim.close(); }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let previousStatus = 'unknown';
    try { previousStatus = JSON.parse(await readFile(path, 'utf8')).status; } catch {}
    return emit({ status: 'already_attempted', previousStatus });
  }

  const started = Date.now();
  const result = { mode, model: config.textModel, modelRequests: 0, responsesRequests: 0 };
  const signal = AbortSignal.timeout(20000);
  async function request(url, options) {
    const response = await fetchImpl(url, { ...options, signal, redirect: 'error', headers: {
      Authorization: `Bearer ${config.apiKey}`, ...(options.body ? { 'Content-Type': 'application/json' } : {})
    } });
    if (!response.ok) {
      result.httpStatus = response.status;
      let code;
      try { code = (await response.json())?.error?.code; } catch {}
      if (knownCodes.has(code)) result.code = code;
      throw new Error('provider_rejected');
    }
    return response.json();
  }
  try {
    result.modelRequests++;
    const model = await request(`https://api.openai.com/v1/models/${encodeURIComponent(config.textModel)}`, { method: 'GET' });
    if (model.id !== config.textModel) throw new Error('unexpected_model');
    result.modelAccessible = true;
    result.status = 'model_access_confirmed';
    if (mode === 'responses') {
      result.responsesRequests++;
      const response = await request('https://api.openai.com/v1/responses', { method: 'POST', body: JSON.stringify({
        model: config.textModel, instructions: DONNA,
        input: 'Responda somente: Conexão confirmada, Chefe.',
        max_output_tokens: 32, store: false, tools: [], tool_choice: 'none'
      }) });
      // Keep only measured usage, never provider bodies, personal text or keys.
      const usage = response.usage;
      if (Number.isSafeInteger(usage?.input_tokens) && usage.input_tokens >= 0 && Number.isSafeInteger(usage?.output_tokens) && usage.output_tokens >= 0) {
        const cached = Math.min(usage.input_tokens, Math.max(0, Number.isSafeInteger(usage.input_tokens_details?.cached_tokens) ? usage.input_tokens_details.cached_tokens : 0));
        result.usage = { inputTokens: usage.input_tokens, cachedInputTokens: cached, outputTokens: usage.output_tokens };
        result.calculatedUsd = Number(((usage.input_tokens - cached) * 0.40 / 1e6 + cached * 0.10 / 1e6 + usage.output_tokens * 1.60 / 1e6).toFixed(10));
        result.pricingChecked = '2026-09-16';
      }
      const hasText = response.output?.some(item => item.type === 'message' && item.content?.some(part => part.type === 'output_text' && part.text?.trim()));
      if (!hasText) throw new Error('empty_response');
      result.status = 'responses_passed';
    }
  } catch (error) {
    result.status = 'failed';
    result.failure = ['provider_rejected', 'unexpected_model', 'empty_response'].includes(error.message) ? error.message : 'network_or_timeout';
    // A timeout cannot establish whether the provider charged the request.
    if (result.responsesRequests && !result.usage) result.usageUnavailable = true;
  }
  result.elapsedMs = Date.now() - started;
  result.finishedAt = new Date().toISOString();
  await writeFile(path, JSON.stringify(result, null, 2), { mode: 0o600 });
  return emit(result);
}
