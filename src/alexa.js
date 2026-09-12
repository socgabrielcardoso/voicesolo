import { escapeXml, validateAlexaEnvelope } from './security.js';
import { publicAudioPath } from './audio.js';
import { PUBLIC_PHRASES } from './persona.js';

export function speech(text, { end = false, publicName, config } = {}) {
  let output = escapeXml(text);
  if (publicName && config?.baseUrl.startsWith('https://') && publicAudioPath(config, publicName)) {
    output = `<audio src="${escapeXml(config.baseUrl + '/audio/' + publicName + '.mp3')}"/>`;
  }
  return { version: '1.0', response: {
    outputSpeech: { type: 'SSML', ssml: `<speak>${output}</speak>` }, shouldEndSession: end,
    ...(!end ? { reprompt: { outputSpeech: { type: 'PlainText', text: 'Chefe, diga Donna e o seu pedido, ou continuar.' } } } : {})
  } };
}

export function createAlexa(config, store, conversations) {
  const inFlight = new Map();
  async function dispatch(body, identity) {
    const request = body.request;
    const owner = identity.owner;
    if (!identity.authorized) {
      // Enrollment is allowed only after the HTTP layer verifies Amazon's signature.
      const existing = store.get('enrollment', owner);
      if (existing || store.consume('enrollment', 20)) store.set('enrollment', owner, { userId: identity.rawUser, receivedAt: new Date().toISOString() }, 900);
      return speech('Chefe, esta conta ainda precisa ser autorizada no painel privado do Gabriel Voice OS.', { end: true });
    }
    if (request.type === 'SessionEndedRequest') return { version: '1.0', response: {} };
    if (request.type === 'LaunchRequest') return speech(PUBLIC_PHRASES.welcome, { publicName: 'welcome', config });
    if (request.type !== 'IntentRequest') return speech('Diga Donna e o seu pedido.');
    const intent = request.intent?.name;
    if (['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(intent)) {
      conversations.cancel(owner);
      return speech(PUBLIC_PHRASES.goodbye, { end: true, publicName: 'goodbye', config });
    }
    if (intent === 'AMAZON.HelpIntent') return speech(PUBLIC_PHRASES.help, { publicName: 'help', config });
    if (intent === 'ForgetIntent') {
      store.set('forget-confirmation', owner, true, 60);
      return speech('Quer apagar o histórico deste sistema? Diga sim para confirmar ou não para cancelar.');
    }
    if (intent === 'AMAZON.YesIntent') {
      if (!store.get('forget-confirmation', owner)) return speech('Não há uma exclusão aguardando confirmação. Diga Donna e o seu pedido.');
      conversations.forget(owner);
      return speech('Histórico deste sistema apagado, Chefe.');
    }
    if (intent === 'AMAZON.NoIntent') { store.delete('forget-confirmation', owner); return speech('Cancelado, Chefe.'); }
    store.delete('forget-confirmation', owner);
    if (intent === 'ContinueIntent') {
      const job = await conversations.wait(owner, config.alexaWaitMs);
      if (!job) return speech('Não há resposta pendente, Chefe. Diga Donna e o seu pedido.');
      return speech(conversations.deliver(owner, job) || 'Ainda estou processando, Chefe. Diga continuar em alguns instantes.');
    }
    if (intent !== 'AskDonnaIntent') return speech('Não entendi o pedido. Comece com Donna. Por exemplo: Donna, explique autenticação multifator.');
    const text = request.intent?.slots?.query?.value;
    if (typeof text !== 'string' || !text.trim() || text.length > 1500) return speech('Faça um pedido de até mil e quinhentos caracteres, começando com Donna.');
    const previous = conversations.status(owner);
    if (previous && !previous.delivered) return speech('Existe uma resposta aguardando, Chefe. Diga continuar para ouvi-la, ou parar para cancelar.');
    const job = conversations.submit(owner, text.trim());
    if (job.state === 'failed') return speech(job.text);
    const completed = await conversations.wait(owner, config.alexaWaitMs);
    return speech(conversations.deliver(owner, completed) || 'Estou preparando a resposta, Chefe. Diga continuar em alguns instantes.');
  }
  return async body => {
    const identity = validateAlexaEnvelope(body, config);
    const cacheKey = identity.owner + ':' + body.request.requestId;
    const cached = store.get('request', cacheKey);
    if (cached) return cached;
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const pending = dispatch(body, identity).then(response => {
      store.set('request', cacheKey, response, 300); return response;
    }).finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
    return pending;
  };
}
