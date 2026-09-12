import { DONNA } from './persona.js';
import { toolDefinitions, executeTool } from './tools.js';

export class ProviderError extends Error {
  constructor(status) { super(`OpenAI request failed (${status})`); this.status = status; }
}

export class OpenAIProvider {
  constructor(config, fetchImpl = fetch) { this.config = config; this.fetch = fetchImpl; }
  async request(path, { body, signal, contentType = 'application/json', safetyIdentifier } = {}) {
    if (!this.config.apiKey) throw new ProviderError('not_configured');
    const response = await this.fetch(`https://api.openai.com/v1${path}`, {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${this.config.apiKey}`, ...(contentType ? { 'Content-Type': contentType } : {}), ...(safetyIdentifier ? { 'OpenAI-Safety-Identifier': safetyIdentifier } : {}) },
      body: contentType === 'application/json' ? JSON.stringify(body) : body
    });
    if (!response.ok) { await response.body?.cancel(); throw new ProviderError(response.status); }
    return response;
  }
  async answer(text, history, owner, signal) {
    const input = [...history.slice(-12), { role: 'user', content: text }];
    for (let round = 0; round < 3; round++) {
      signal.throwIfAborted();
      const response = await this.request('/responses', { signal, body: {
        model: this.config.textModel, instructions: DONNA, input,
        store: false, safety_identifier: owner, max_output_tokens: 256,
        tools: toolDefinitions, parallel_tool_calls: false,
        tool_choice: round === 2 ? 'none' : 'auto'
      } });
      const result = await response.json();
      if (!Array.isArray(result.output)) throw new ProviderError('invalid_response');
      const calls = result.output.filter(item => item.type === 'function_call');
      if (calls.length) {
        if (calls.length > 4) throw new ProviderError('tool_limit');
        input.push(...result.output);
        for (const call of calls) {
          let output;
          try {
            if (typeof call.arguments !== 'string' || call.arguments.length > 2000) throw new Error('Invalid arguments');
            output = executeTool(call.name, JSON.parse(call.arguments), this.config);
          } catch { output = { error: 'Ferramenta ou argumentos não autorizados.' }; }
          input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
        }
        continue;
      }
      const answer = result.output.filter(item => item.type === 'message').flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
      if (!answer) throw new ProviderError('empty_response');
      return answer.length > 1500 ? answer.slice(0, 1450) + ' Posso continuar, Chefe.' : answer;
    }
    throw new ProviderError('tool_limit');
  }
  async speech(text, signal) {
    const response = await this.request('/audio/speech', { signal, body: {
      model: this.config.ttsModel, voice: this.config.voice, input: text, response_format: 'pcm',
      instructions: 'Fale em português brasileiro. Voz feminina elegante, natural e firme. Ritmo calmo e articulação clara.'
    } });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 12 * 1024 * 1024) throw new ProviderError('audio_too_large');
    return bytes;
  }
}
