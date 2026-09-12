const byId = id => document.getElementById(id);
let token = '', pc = null, stream = null, channel = null, callId = null, timer = null, connecting = false, chatBusy = false, chatGeneration = 0;
const transcriptItems = new Map();

async function api(path, options = {}) {
  const response = await fetch('/api' + path, { ...options, headers: { Authorization: 'Bearer ' + token, ...options.headers }, cache: 'no-store' });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || body.text || 'Não foi possível concluir.');
  return body;
}
function message(speaker, text) {
  const element = document.createElement('div'); element.className = 'message';
  const label = document.createElement('b'); label.textContent = speaker;
  const content = document.createElement('span'); content.textContent = text;
  element.append(label, content); byId('transcript').append(element);
  while (byId('transcript').children.length > 60) byId('transcript').firstChild.remove();
  byId('transcript').scrollTop = byId('transcript').scrollHeight;
  return content;
}
byId('access').addEventListener('submit', async event => {
  event.preventDefault(); token = byId('token').value;
  try {
    const status = await api('/status');
    byId('workspace').hidden = false; byId('access').hidden = true; byId('token').value = '';
    byId('status').textContent = status.openaiConfigured ? 'Conectado. Seu espaço está pronto.' : 'Conectado. Falta configurar a chave OpenAI no servidor.';
    if (status.activeVoice) {
      callId = status.activeVoice.id; byId('stop').disabled = false; byId('start').disabled = true;
      voiceState('Uma sessão anterior continua aberta. Clique Encerrar antes de iniciar outra.');
    }
  } catch (error) { token = ''; byId('status').textContent = error.message; }
});
function voiceState(text, active = false) { byId('voice-status').textContent = text; byId('orb').classList.toggle('active', active); }
async function endVoice() {
  const id = callId; callId = null; connecting = false;
  clearTimeout(timer); timer = null;
  if (stream) stream.getTracks().forEach(track => track.stop()); stream = null;
  if (channel) channel.close(); channel = null;
  if (pc) { pc.onconnectionstatechange = null; pc.close(); } pc = null;
  byId('remote-audio').srcObject = null;
  byId('start').disabled = false; byId('stop').disabled = true; byId('mute').disabled = true;
  byId('mute').textContent = 'Silenciar microfone'; transcriptItems.clear();
  voiceState('Microfone desligado.');
  if (id) { try { await api('/realtime/calls/' + encodeURIComponent(id), { method: 'DELETE' }); } catch (error) { byId('status').textContent = error.message; } }
}
byId('start').addEventListener('click', async () => {
  if (connecting || pc) return;
  connecting = true; byId('start').disabled = true;
  voiceState('Preparando a conexão de voz…');
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Abra por HTTPS ou localhost para usar o microfone.');
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    pc = new RTCPeerConnection();
    pc.ontrack = event => { byId('remote-audio').srcObject = event.streams[0]; byId('remote-audio').play().catch(() => { voiceState('Clique novamente na página para permitir o áudio.'); }); };
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    channel = pc.createDataChannel('oai-events');
    channel.onopen = () => { voiceState('Estou ouvindo, Chefe.', true); };
    channel.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'input_audio_buffer.speech_started') voiceState('Estou ouvindo. Termine sua frase.', true);
        if (data.type === 'response.output_audio_transcript.delta') {
          const key = data.item_id || data.response_id;
          let item = transcriptItems.get(key);
          if (!item) { item = message('Donna', ''); transcriptItems.set(key, item); }
          item.textContent += data.delta || '';
          voiceState('Donna está respondendo.', true);
        }
        if (data.type === 'response.done') { transcriptItems.clear(); voiceState('Estou ouvindo, Chefe.', true); }
        if (data.type === 'error') voiceState('O serviço de voz sinalizou um erro. Encerre e tente novamente.');
      } catch { voiceState('Recebi um evento de voz inválido.'); }
    };
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const result = await api('/realtime/calls', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp });
    callId = result.id;
    await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp });
    timer = setTimeout(endVoice, result.maxSeconds * 1000);
    pc.onconnectionstatechange = () => { if (pc && ['failed', 'closed', 'disconnected'].includes(pc.connectionState)) void endVoice(); };
    byId('stop').disabled = false; byId('mute').disabled = false; connecting = false;
  } catch (error) { await endVoice(); voiceState(error.name === 'NotAllowedError' ? 'O navegador precisa de sua permissão para usar o microfone.' : error.message); }
});
byId('stop').addEventListener('click', endVoice);
byId('mute').addEventListener('click', () => {
  if (!stream) return;
  const enable = !stream.getAudioTracks()[0].enabled;
  stream.getAudioTracks().forEach(track => { track.enabled = enable; });
  byId('mute').textContent = enable ? 'Silenciar microfone' : 'Ativar microfone';
  voiceState(enable ? 'Estou ouvindo, Chefe.' : 'Microfone silenciado.', enable);
});
byId('chat').addEventListener('submit', async event => {
  event.preventDefault(); if (chatBusy) return;
  const text = byId('question').value.trim(); if (!text) return;
  const generation = chatGeneration;
  chatBusy = true; byId('send').disabled = true; message('Chefe', text); byId('question').value = '';
  try {
    let answer = await api('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    let checks = 0;
    while (answer.state === 'pending' && checks++ < 35 && generation === chatGeneration) {
      byId('status').textContent = 'Preparando sua resposta…';
      await new Promise(resolve => setTimeout(resolve, 700));
      answer = await api('/chat/pending');
    }
    if (generation !== chatGeneration) return;
    if (answer.text) message('Donna', answer.text);
    byId('status').textContent = answer.state === 'pending' ? 'Ainda há uma resposta pendente. Tente novamente em instantes.' : 'Conectado.';
  } catch (error) { if (generation === chatGeneration) byId('status').textContent = error.message; }
  finally { chatBusy = false; byId('send').disabled = false; }
});
byId('forget').addEventListener('click', async () => {
  if (!confirm('Apagar o histórico de texto deste sistema?')) return;
  chatGeneration++;
  try { await api('/chat', { method: 'DELETE' }); byId('transcript').replaceChildren(); byId('status').textContent = 'Histórico de texto apagado.'; }
  catch (error) { byId('status').textContent = error.message; }
});
byId('enroll').addEventListener('click', async () => {
  try { byId('enrollments').textContent = JSON.stringify((await api('/alexa/enrollments')).requests, null, 2); }
  catch (error) { byId('status').textContent = error.message; }
});
byId('logout').addEventListener('click', async () => {
  chatGeneration++; await endVoice(); token = ''; byId('workspace').hidden = true; byId('access').hidden = false;
  byId('transcript').replaceChildren(); byId('enrollments').textContent = ''; byId('status').textContent = 'Desconectado.';
});
window.addEventListener('pagehide', () => {
  stream?.getTracks().forEach(track => track.stop());
  if (callId && token) void fetch('/api/realtime/calls/' + encodeURIComponent(callId), { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, keepalive: true }).catch(() => {});
  pc?.close();
});
