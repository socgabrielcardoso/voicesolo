import { loadConfig } from './config.js';
import { Store } from './store.js';
import { OpenAIProvider } from './openai.js';
import { Conversations } from './conversation.js';
import { Realtime } from './realtime.js';
import { createApp } from './app.js';

const config = loadConfig();
const store = new Store(config);
const provider = new OpenAIProvider(config);
const conversations = new Conversations(config, store, provider);
const realtime = new Realtime(config, store, provider);
await realtime.recover();
const app = createApp(config, store, conversations, realtime);
const server = app.listen(config.port, config.host, () => console.log(JSON.stringify({ event: 'listening', host: config.host, port: config.port, openaiConfigured: Boolean(config.apiKey), alexaConfigured: Boolean(config.skillId) })));
server.requestTimeout = 30000;
server.headersTimeout = 10000;
const cleanup = setInterval(() => { store.cleanup(); void realtime.recover().catch(() => {}); }, 60000); cleanup.unref();
let closing = false;
async function shutdown() {
  if (closing) return; closing = true;
  clearInterval(cleanup);
  server.close();
  await conversations.close(); await realtime.close();
  store.close();
  server.closeAllConnections();
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
