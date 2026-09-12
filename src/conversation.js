import { randomUUID } from 'node:crypto';

export class Conversations {
  constructor(config, store, provider) { this.config = config; this.store = store; this.provider = provider; this.active = new Map(); }

  status(owner) {
    const job = this.store.get('job', owner);
    if (job?.state === 'pending' && !this.active.has(owner)) {
      const interrupted = { ...job, state: 'failed', text: 'Chefe, o serviço reiniciou durante a resposta. Faça o pedido novamente.' };
      this.store.set('job', owner, interrupted, this.config.historyTtl);
      return interrupted;
    }
    return job;
  }

  submit(owner, text) {
    const previous = this.status(owner);
    if (previous && !previous.delivered) return previous;
    if (!this.provider.config.apiKey) return { state: 'failed', text: 'Chefe, a conexão OpenAI ainda não foi configurada.' };
    if (!this.store.consume('text', this.config.dailyTurns)) return { state: 'failed', text: 'Chefe, atingimos o limite diário de pedidos configurado no sistema.' };
    const id = randomUUID();
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(this.config.jobTimeoutMs)]);
    const job = { id, state: 'pending', delivered: false };
    this.store.set('job', owner, job, this.config.historyTtl);
    const run = { id, controller, promise: null };
    this.active.set(owner, run);
    run.promise = (async () => {
      try {
        const history = this.store.get('history', owner) || [];
        const answer = await this.provider.answer(text, history, owner, signal);
        signal.throwIfAborted();
        if (this.active.get(owner)?.id !== id) return;
        this.store.set('history', owner, [...history, { role: 'user', content: text }, { role: 'assistant', content: answer }].slice(-12), this.config.historyTtl);
        this.store.set('job', owner, { id, state: 'ready', text: answer, delivered: false }, this.config.historyTtl);
      } catch (error) {
        if (this.active.get(owner)?.id !== id) return;
        const message = signal.aborted ? 'Chefe, o pedido excedeu o tempo limite. Tente uma pergunta mais curta.' : 'Chefe, houve uma falha na conexão com a OpenAI. Tente novamente em instantes.';
        this.store.set('job', owner, { id, state: 'failed', text: message, delivered: false }, this.config.historyTtl);
        console.warn(JSON.stringify({ event: 'answer_failed', reason: signal.aborted ? 'timeout' : 'provider_error', status: error.status || null }));
      } finally {
        if (this.active.get(owner)?.id === id) this.active.delete(owner);
      }
    })();
    return job;
  }

  async wait(owner, milliseconds) {
    const running = this.active.get(owner);
    if (running) {
      let timer;
      await Promise.race([running.promise, new Promise(resolve => { timer = setTimeout(resolve, milliseconds); })]);
      clearTimeout(timer);
    }
    return this.status(owner);
  }

  deliver(owner, job) {
    if (!job || job.state === 'pending') return null;
    this.store.set('job', owner, { ...job, delivered: true }, this.config.historyTtl);
    return job.text;
  }

  cancel(owner) {
    const running = this.active.get(owner);
    this.active.delete(owner);
    running?.controller.abort();
    this.store.delete('job', owner);
  }
  forget(owner) { this.cancel(owner); this.store.clearOwner(owner); }
  async close() {
    const runs = [...this.active.values()];
    for (const owner of this.active.keys()) this.cancel(owner);
    await Promise.allSettled(runs.map(run => run.promise));
  }
}
