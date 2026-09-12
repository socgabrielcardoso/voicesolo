import WebSocket from 'ws';
import { DONNA } from './persona.js';
import { toolDefinitions, executeTool } from './tools.js';

export function realtimeSession(config) {
  return {
    type: 'realtime', model: config.realtimeModel, instructions: DONNA,
    output_modalities: ['audio'], max_output_tokens: 256,
    audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'low', create_response: true, interrupt_response: true } }, output: { voice: config.voice } },
    tools: toolDefinitions.map(({ strict, ...tool }) => tool), tool_choice: 'auto'
  };
}

export class Realtime {
  constructor(config, store, provider, WebSocketImpl = WebSocket) {
    this.config = config; this.store = store; this.provider = provider; this.WebSocket = WebSocketImpl;
    this.calls = new Map(); this.starting = false;
  }
  async recover() {
    if (this.starting || this.calls.size) return;
    const previous = this.store.get('realtime', 'active');
    if (previous) await this.hangupRemote(previous.id);
  }
  async create(sdp, owner) {
    if (this.starting || this.calls.size || this.store.get('realtime', 'active')) throw new Error('Uma sessão de voz já está aberta ou aguardando encerramento.');
    if (!this.config.apiKey) throw new Error('A chave OpenAI ainda não está configurada.');
    if (!this.store.consume('realtime', this.config.dailyRealtime)) throw new Error('Limite diário de sessões de voz atingido.');
    this.starting = true;
    let id;
    try {
      const form = new FormData(); form.set('sdp', sdp); form.set('session', JSON.stringify(realtimeSession(this.config)));
      const response = await this.provider.request('/realtime/calls', { body: form, contentType: null, safetyIdentifier: owner, signal: AbortSignal.timeout(20000) });
      const location = response.headers.get('location');
      id = location ? new URL(location, 'https://api.openai.com').pathname.split('/').pop() : '';
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new Error('A OpenAI não retornou uma identificação de chamada válida.');
      this.store.set('realtime', 'active', { id, owner }, 7200);
      const answer = await response.text();
      if (!answer.startsWith('v=0')) throw new Error('Resposta de voz inválida.');
      const socket = new this.WebSocket('wss://api.openai.com/v1/realtime?call_id=' + encodeURIComponent(id), {
        headers: { Authorization: `Bearer ${this.config.apiKey}` }, handshakeTimeout: 8000, maxPayload: 2 * 1024 * 1024
      });
      const call = { id, owner, socket, seen: new Set(), toolCount: 0, stopping: false, timer: null };
      this.calls.set(id, call);
      socket.on('error', () => { void this.stop(id, owner).catch(() => {}); });
      socket.on('close', () => { if (!call.stopping) void this.stop(id, owner).catch(() => {}); });
      socket.on('message', bytes => this.onMessage(call, bytes));
      await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); socket.once('close', () => reject(new Error('Canal de controle encerrado.'))); });
      call.timer = setTimeout(() => { void this.stop(id, owner).catch(() => {}); }, this.config.realtimeMaxSeconds * 1000);
      call.timer.unref();
      return { id, sdp: answer, maxSeconds: this.config.realtimeMaxSeconds };
    } catch (error) {
      if (id) {
        const call = this.calls.get(id); if (call) { call.stopping = true; call.socket.terminate(); this.calls.delete(id); }
        await this.hangupRemote(id);
      }
      throw error;
    } finally { this.starting = false; }
  }
  onMessage(call, bytes) {
    try {
      const event = JSON.parse(bytes.toString());
      if (event.type !== 'response.function_call_arguments.done' || call.stopping) return;
      if (typeof event.call_id !== 'string' || call.seen.has(event.call_id)) return;
      if (++call.toolCount > 50) { void this.stop(call.id, call.owner).catch(() => {}); return; }
      call.seen.add(event.call_id);
      let output;
      try {
        if (typeof event.arguments !== 'string' || event.arguments.length > 2000) throw new Error('Arguments too long');
        output = executeTool(event.name, JSON.parse(event.arguments), this.config);
      } catch { output = { error: 'Ferramenta ou argumentos não autorizados.' }; }
      if (call.socket.readyState !== 1) return;
      call.socket.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: event.call_id, output: JSON.stringify(output) } }));
      call.socket.send(JSON.stringify({ type: 'response.create' }));
    } catch { /* Malformed events never reach tool execution. */ }
  }
  async hangupRemote(id) {
    try {
      await this.provider.request('/realtime/calls/' + encodeURIComponent(id) + '/hangup', { signal: AbortSignal.timeout(5000) });
      this.store.delete('realtime', 'active'); return true;
    } catch (error) {
      if (error.status === 404) { this.store.delete('realtime', 'active'); return true; }
      console.warn(JSON.stringify({ event: 'realtime_hangup_failed', status: error.status || null }));
      return false;
    }
  }
  async stop(id, owner) {
    const record = this.store.get('realtime', 'active');
    const call = this.calls.get(id);
    if (!record || record.id !== id || record.owner !== owner) throw new Error('Chamada não encontrada.');
    if (call?.stopping) return;
    if (call) { call.stopping = true; clearTimeout(call.timer); }
    const ended = await this.hangupRemote(id);
    if (call) call.socket.terminate();
    this.calls.delete(id);
    if (!ended) throw new Error('Não foi possível confirmar o encerramento remoto.');
  }
  async close() { await Promise.allSettled([...this.calls.values()].map(call => this.stop(call.id, call.owner))); }
}
