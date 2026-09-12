# Fontes oficiais

Consultadas em 12/09/2026. Serviram para escolher interfaces e requisitos. Não são evidência de acesso às contas ou execução real da Skill.

| Fonte | Aplicação no projeto |
| --- | --- |
| [Amazon — Request and Response JSON](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html) | Contrato JSON, sessões e resposta Alexa |
| [Amazon — Slot Type Reference](https://developer.amazon.com/en-US/docs/alexa/custom-skills/slot-type-reference.html#amazonsearchquery) | SearchQuery em pt-BR e frase introdutória |
| [Amazon — Progressive Response](https://developer.amazon.com/en-US/docs/alexa/custom-skills/send-the-user-a-progressive-response.html) | Prazo de aproximadamente oito segundos não ampliado por aviso intermediário |
| [Amazon — SSML](https://developer.amazon.com/en-US/docs/alexa/custom-skills/speech-synthesis-markup-language-ssml-reference.html#audio) | MP3, HTTPS, formato de áudio e vedação a conteúdo pessoal/sensível em MP3 |
| [Amazon — HTTPS Web Service](https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html) | Assinatura SHA-256, certificado e timestamp |
| [Amazon — ASK SDK Web Service](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/host-web-service.html) | Verificador oficial do corpo original |
| [Amazon — Invocation Name](https://developer.amazon.com/en-US/docs/alexa/custom-skills/choose-the-invocation-name-for-a-custom-skill.html) | Nome de invocação e representação de siglas |
| [Amazon — Create Skills](https://developer.amazon.com/en-US/docs/alexa/devconsole/create-a-skill-and-choose-the-interaction-model.html) | Criação no console e escolhas de modelo/hospedagem |
| [Amazon — Manifest](https://developer.amazon.com/en-US/docs/alexa/smapi/skill-manifest.html) | Endpoint HTTPS e tipos de certificado |
| [OpenAI — Function Calling](https://developers.openai.com/api/docs/guides/function-calling) | Rodada de ferramentas e schema estrito em Responses |
| [OpenAI — GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) | Modelo de texto configurável escolhido |
| [OpenAI — Realtime](https://developers.openai.com/api/docs/guides/realtime) | Interface de voz e formato GA |
| [OpenAI — GPT-Realtime-2](https://developers.openai.com/api/docs/models/gpt-realtime-2) | Modelo de voz configurável escolhido |
| [OpenAI — WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc) | Oferta SDP via servidor e conexão de áudio |
| [OpenAI — Server-side Controls](https://developers.openai.com/api/docs/guides/voice-server-controls) | Canal WebSocket associado ao call ID |
| [OpenAI — Hangup](https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/hangup) | Encerramento remoto de SIP/WebRTC |
| [OpenAI — VAD](https://developers.openai.com/api/docs/guides/realtime-vad) | `semantic_vad` com `eagerness:low` |
| [OpenAI — Text to Speech](https://developers.openai.com/api/docs/guides/text-to-speech) | PCM e síntese de falas fixas; voz de IA declarada |
| [OpenAI — Data Controls](https://developers.openai.com/api/docs/guides/your-data) | Limites de `store:false` e retenção do provedor |
| [Node — SQLite](https://nodejs.org/api/sqlite.html) | Banco local e prepared statements |
| [Render — Blueprint](https://render.com/docs/blueprint-spec) | Infraestrutura declarativa e disco |
| [Render — Environment Variables](https://render.com/docs/environment-variables) | Origem HTTPS automática do serviço |
| [Render — Deploys](https://render.com/docs/deploys) | Configuração de implantação |
| [Render — Pricing](https://render.com/pricing) | Página para cotação antes de contratação; preço não afirmado nesta etapa |

Não foi usada documentação não oficial para fundamentar as integrações. O diagnóstico de dependências veio de `npm audit` no lockfile instalado.
