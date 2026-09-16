# Gabriel Voice OS — PAUSADO

> **Personal AI & Voice Systems Lab** — projeto pessoal para estudo de integração entre assistentes de voz, APIs de IA, segurança de aplicação, WebRTC, containers e automação.

O **Gabriel Voice OS** combina um backend em Node.js 24, Alexa Custom Skill em português brasileiro, OpenAI Responses/Speech/Realtime, histórico criptografado e implantação em contêiner.

> **Status:** desenvolvimento pausado em 16/09/2026 por decisão do proprietário. Não retomar deploys nem consumo de APIs até nova autorização explícita. O estado de retomada está documentado em [PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

## Objetivo técnico

O projeto existe como laboratório de integração e segurança, não como produto comercial. O foco é estudar como serviços de voz, modelos de IA e controles de aplicação podem ser conectados de forma previsível, auditável e com redução de exposição de dados.

## Arquitetura resumida

| Caminho | Entrada | Processamento | Saída |
| --- | --- | --- | --- |
| Echo Dot | Alexa reconhece o pedido e envia intents/slots | Backend → OpenAI Responses → ferramentas autorizadas | Resposta sintetizada pela Alexa |
| Cliente web | Microfone via WebRTC | OpenAI Realtime com ferramentas atendidas pelo servidor | Voz em tempo real no navegador |

Uma Alexa Custom Skill recebe **intents e slots em JSON** após o reconhecimento da Amazon; ela não fornece ao backend o áudio bruto contínuo do microfone. A experiência na Echo é orientada a turnos e segue as regras de sessão da plataforma. Consulte a [documentação oficial da Amazon](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html).

## Controles implementados

- Validação de requisições Alexa e Skill ID.
- Verificação de data, conta autorizada e duplicidade de requisições.
- Histórico de conversa criptografado com validade definida.
- Ferramentas limitadas e validadas no servidor.
- Cliente Realtime com WebRTC, mute e encerramento explícito.
- Limites diários e controle de sessão.
- Exclusão de histórico mediante confirmação.
- HTTPS em produção e execução containerizada.
- Segredos fora do Git.
- Respostas e áudio privados fora dos logs.
- Testes automatizados e CI.

## Segurança e privacidade

O projeto evita publicar respostas pessoais em URLs de áudio. A documentação da Amazon impõe restrições ao uso de conteúdo pessoal ou sensível em áudio servido por SSML; por isso, arquivos públicos de áudio são restritos a conteúdo fixo e não sensível. Consulte a [referência oficial de SSML da Amazon](https://developer.amazon.com/en-US/docs/alexa/custom-skills/speech-synthesis-markup-language-ssml-reference.html#audio).

O cliente web é independente da Echo e utiliza o microfone do dispositivo que abriu a página. Credenciais e segredos de API permanecem no servidor.

## Execução local no Windows

Instale Node.js **24** e execute:

```powershell
npm ci --ignore-scripts
npm run setup
npm start
```

Depois, abra:

```text
http://localhost:3000
```

O comando `setup` gera `DATA_KEY` e `ADMIN_TOKEN` em `.env`, preservando valores já existentes. A chave OpenAI deve permanecer somente em `OPENAI_API_KEY` no servidor.

> Não publique `.env` nem segredos em commits.

## Diagnóstico e preparação

```powershell
npm run doctor
npm run prepare:audio
```

`prepare:audio` realiza chamadas pagas apenas para arquivos de síntese ainda ausentes. O backend usa voz Alexa como fallback quando necessário.

## Validação

```powershell
npm run check
npm test
npm audit --omit=dev --audit-level=high
```

O conjunto de testes comuns utiliza respostas controladas e não consome créditos da OpenAI. O comando `npm run smoke:live` faz chamadas reais e pode consumir créditos.

O CI também executa validação do contêiner de produção, incluindo startup, autenticação, permissões, persistência e encerramento controlado.

## Documentação

- [Arquitetura, viabilidade e decisões](docs/ARCHITECTURE.md)
- [Implantação e ativação](docs/DEPLOYMENT.md)
- [Custos e consumo](docs/COSTS.md)
- [Segurança e dados](SECURITY.md)
- [Operação e diagnóstico](docs/OPERATIONS.md)
- [Validação e pendências](docs/VALIDATION.md)
- [Fontes oficiais](docs/SOURCES.md)

## Escopo atual

Esta versão foi desenhada para uso pessoal e ambiente controlado. Integrações com e-mail, calendário, Intune, Sentinel, execução de scripts e automações externas não fazem parte do escopo atual e exigiriam APIs, permissões e validações próprias.

---

**Categoria:** AI Systems • Voice Interfaces • Application Security • WebRTC • Containers • Technical Lab

**Status:** pausado, com código e documentação preservados para retomada futura.
