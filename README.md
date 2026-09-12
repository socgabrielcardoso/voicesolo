# Gabriel Voice OS

**Donna pela Echo Dot, com raciocínio no seu backend e um cliente complementar de voz contínua.**

Backend Node.js 24, Alexa Custom Skill em português brasileiro, OpenAI Responses, Speech e Realtime, histórico criptografado e implantação em contêiner.

> **Estado: implementação inicial testada localmente. A ativação real exige hospedagem, chave OpenAI e configuração da Skill na conta Amazon. A Echo ainda não foi validada.** Consulte [VALIDATION.md](docs/VALIDATION.md) para separar testes executados de etapas pendentes.

## O que é possível de verdade

Uma Custom Skill recebe **intents e slots em JSON**, após o reconhecimento da Amazon. Ela não fornece ao nosso backend o microfone bruto da Echo. A experiência na Echo é uma conversa **por turnos**, dentro das regras de sessão da Alexa; não substitui seu firmware nem permite manter o microfone aberto indefinidamente. [Fonte Amazon](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html).

| Caminho | Entrada | Inteligência | Saída |
| --- | --- | --- | --- |
| Echo Dot | Alexa reconhece o pedido; `AMAZON.SearchQuery` envia o texto | Backend Donna → OpenAI Responses → ferramentas autorizadas | Texto pessoal sintetizado pela Alexa; falas públicas fixas podem usar OpenAI Speech |
| Cliente web | Microfone do computador ou celular via WebRTC | OpenAI Realtime com persona Donna e controle de ferramentas no backend | Voz OpenAI, com interrupção e espera semântica |

A Amazon proíbe informações pessoais ou sensíveis nos MP3 servidos por SSML. Por isso, o projeto **não publica respostas pessoais em URLs de áudio**. Apenas três falas fixas, sem dados do usuário, podem virar MP3. [Requisito oficial](https://developer.amazon.com/en-US/docs/alexa/custom-skills/speech-synthesis-markup-language-ssml-reference.html#audio).

O cliente web é independente da Echo. Ele usa o microfone do dispositivo que abre a página. A API não importa automaticamente a voz, as memórias, as skills ou os plugins desta conversa do ChatGPT.

## O que está implementado

- Persona Donna em português: feminina, firme, concisa; tratamento “Chefe” e “o senhor”.
- Entrada Alexa assinada, validação de Skill ID, data, conta autorizada e duplicatas.
- Conversa com histórico de até seis pares de mensagens, criptografado e com validade padrão de 24 horas.
- Resposta rápida ou retomada por **“continuar”**, sem repetir a chamada ao modelo.
- Ferramentas reais de hora/data e cálculo, com validação estrita; sem execução arbitrária de comandos.
- Cliente Realtime com WebRTC, ferramentas atendidas no servidor, microfone visível, mute e encerramento.
- Limites diários, sessões limitadas, exclusão de histórico com confirmação por voz.
- HTTPS em produção, configuração de contêiner e Blueprint Render com disco persistente.
- Testes automatizados e CI. Segredos fora do Git; respostas e áudio privados fora dos logs.

## Executar no Windows

Instale Node.js **24**. No PowerShell, dentro da pasta do projeto:

```powershell
npm ci --ignore-scripts
npm run setup
npm start
```

Abra `http://localhost:3000`. O comando `setup` gera `DATA_KEY` e `ADMIN_TOKEN` em `.env`, preservando valores existentes. O painel pede **ADMIN_TOKEN**; a chave OpenAI fica somente em `OPENAI_API_KEY` no servidor. Sem chave, a interface abre e informa que a integração está pendente.

Não publique `.env`. Para conversa real, configure uma chave de projeto OpenAI com faturamento habilitado. A assinatura do ChatGPT não é uma credencial de API. Para gerar falas públicas localmente, FFmpeg deve estar no PATH; o contêiner já inclui FFmpeg.

```powershell
npm run doctor
npm run prepare:audio
```

`prepare:audio` faz chamadas pagas de síntese apenas para os arquivos ainda ausentes. O backend usa voz Alexa como fallback enquanto esses arquivos não existirem.

## Ativar na Echo

Após concluir a implantação e autorizar a conta Amazon:

1. Diga **“Alexa, abrir Gabriel Voice OS”**.
2. Diga **“Donna, explique o que é autenticação multifator”**.
3. Se houver resposta pendente, diga **“continuar”**.
4. Diga **“parar”** para encerrar, ou **“apagar histórico”** e depois **“sim”** para apagar a conversa local.

O nome técnico de invocação é `gabriel voice o. s.`. A aceitação do nome e seu reconhecimento em pt-BR precisam do build Amazon e do teste físico. Não estão garantidos pelo teste local. O comando alternativo `comando gabriel` está documentado caso a Amazon rejeite a mistura de idiomas; não é alterado automaticamente.

## Documentação

- [Arquitetura, viabilidade e decisões](docs/ARCHITECTURE.md)
- [Implantação e ativação detalhadas](docs/DEPLOYMENT.md)
- [Segurança e dados](SECURITY.md)
- [Operação e diagnóstico](docs/OPERATIONS.md)
- [Validação e pendências](docs/VALIDATION.md)
- [Fontes oficiais consultadas](docs/SOURCES.md)

## Verificação

```powershell
npm run check
npm test
npm audit --omit=dev --audit-level=high
```

O teste de áudio exige FFmpeg e FFprobe. Os testes comuns substituem a OpenAI por respostas controladas; não consomem créditos. `npm run smoke:live` faz chamadas reais a Responses e Speech e **consome créditos**. Ele não comprova, sozinho, que Realtime ou Echo funcionam.

O CI também executa `npm run smoke:container`: constrói a imagem Docker, inicia o backend em configuração de produção e verifica autenticação, permissões, FFmpeg, encerramento e persistência criptografada após reinício. Pode ser executado em uma máquina com Node 24 e Docker. Usa apenas chaves temporárias de teste, não lê `.env` e não chama a OpenAI. A porta fica restrita ao host; isso não publica um serviço na internet. Consulte as execuções comprovadas em [VALIDATION.md](docs/VALIDATION.md).

## Escopo e próximos conectores

Esta versão é privada, para uma conta administradora, uma instância e um disco. E-mail, calendário, Intune, Sentinel, execução de scripts e automações externas **não estão conectados**. Cada ferramenta adicional exige API própria, escopo de acesso e validação; ações com efeitos externos devem ter autorização explícita. Ver o contrato de extensão em [SECURITY.md](SECURITY.md).
