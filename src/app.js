import express from 'express';
import { fileURLToPath } from 'node:url';
import { secureEqual, ownerId, rateGate, validateAlexaEnvelope } from './security.js';
import { AmazonVerifier } from './amazon-verifier.js';
import { createAlexa } from './alexa.js';
import { publicAudioPath } from './audio.js';

export function createApp(config, store, conversations, realtime) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const alexa = createAlexa(config, store, conversations);
  const verifier = new AmazonVerifier();
  const publicGate = rateGate({ limit: 180 });
  const authGate = rateGate({ limit: 15 });
  const privateGate = rateGate({ limit: 120 });
  const webOwner = ownerId('private-web-owner', config.dataKey);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://api.openai.com wss://api.openai.com; media-src 'self' blob:; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'Permissions-Policy': 'microphone=(self), camera=()', 'Cache-Control': 'no-store' });
    if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'gabriel-voice-os' }));
  app.post('/alexa', (req, res, next) => {
    if (!publicGate(req.socket.remoteAddress)) return res.status(429).end();
    next();
  }, express.text({ type: 'application/json', limit: '32kb' }), async (req, res) => {
    if (typeof req.body !== 'string') return res.status(400).json({ error: 'Invalid request' });
    let body;
    try { body = JSON.parse(req.body); validateAlexaEnvelope(body, config); await verifier.verify(req.body, req.headers); }
    catch { return res.status(400).json({ error: 'Invalid Alexa request' }); }
    try { res.json(await alexa(body)); }
    catch { res.status(500).json({ error: 'Skill processing failed' }); }
  });
  app.get('/audio/:filename', (req, res) => {
    const match = /^(welcome|help|goodbye)\.mp3$/.exec(req.params.filename);
    const path = match && publicAudioPath(config, match[1]);
    if (!path) return res.status(404).end();
    res.type('audio/mpeg'); res.sendFile(path);
  });
  app.use('/api', (req, res, next) => {
    if (req.headers.origin && req.headers.origin !== config.baseUrl) return res.status(403).json({ error: 'Origem não permitida.' });
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    if (!secureEqual(token, config.adminToken)) {
      return res.status(authGate(req.socket.remoteAddress) ? 401 : 429).json({ error: 'Acesso negado.' });
    }
    if (!privateGate(webOwner)) return res.status(429).json({ error: 'Muitos pedidos. Aguarde.' });
    next();
  });
  app.get('/api/status', (req, res) => res.json({
    openaiConfigured: Boolean(config.apiKey), alexaConfigured: Boolean(config.skillId), authorizedAlexaUsers: config.allowedUsers.size,
    textModel: config.textModel, realtimeModel: config.realtimeModel, usage: store.usage(),
    activeVoice: store.get('realtime', 'active'),
    limits: { turns: config.dailyTurns, realtime: config.dailyRealtime, voiceSeconds: config.realtimeMaxSeconds }
  }));
  app.get('/api/alexa/enrollments', (req, res) => res.json({ requests: store.list('enrollment') }));
  app.post('/api/chat', express.json({ limit: '4kb' }), async (req, res) => {
    const text = req.body?.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 1500) return res.status(400).json({ error: 'Pedido inválido ou longo demais.' });
    const job = conversations.submit(webOwner, text.trim());
    if (job.state === 'failed') return res.status(503).json({ state: 'failed', text: job.text });
    const result = await conversations.wait(webOwner, config.alexaWaitMs);
    if (result?.state !== 'pending') conversations.deliver(webOwner, result);
    res.status(result?.state === 'pending' ? 202 : 200).json(result);
  });
  app.get('/api/chat/pending', async (req, res) => {
    const job = await conversations.wait(webOwner, 1000);
    if (job && job.state !== 'pending') conversations.deliver(webOwner, job);
    res.json(job || { state: 'empty' });
  });
  app.delete('/api/chat', (req, res) => { conversations.forget(webOwner); res.status(204).end(); });
  app.post('/api/realtime/calls', express.text({ type: 'application/sdp', limit: '32kb' }), async (req, res) => {
    if (typeof req.body !== 'string' || !req.body.startsWith('v=0')) return res.status(400).json({ error: 'Oferta de áudio inválida.' });
    try { res.status(201).json(await realtime.create(req.body, webOwner)); }
    catch { res.status(503).json({ error: 'Não foi possível iniciar a voz. Verifique a chave, os limites e se há uma sessão aberta.' }); }
  });
  app.delete('/api/realtime/calls/:id', async (req, res) => {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(req.params.id)) return res.status(400).end();
    try { await realtime.stop(req.params.id, webOwner); res.status(204).end(); }
    catch { res.status(409).json({ error: 'Encerramento remoto não confirmado. Consulte o estado do serviço.' }); }
  });
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url)), { dotfiles: 'deny', etag: false }));
  app.use((req, res) => res.status(404).json({ error: 'Não encontrado.' }));
  app.use((error, req, res, next) => { if (res.headersSent) return next(error); res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Pedido inválido.' }); });
  return app;
}
