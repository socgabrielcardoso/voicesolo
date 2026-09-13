# Implantação e ativação

Este documento registra as tarefas que o agente deve executar assim que houver acesso. O proprietário só precisa intervir para login, consentimento, credenciais, contratação e uso físico da Echo. Não é necessário instalar Linux no computador pessoal.

## 1. Hospedagem

Opção preparada: Render, contêiner Docker, uma instância e disco persistente de 1 GB. `render.yaml` contém o serviço. É uma configuração de infraestrutura paga; sua existência no Git não contrata nenhum plano. O valor atual precisa ser conferido no provedor antes da contratação. Créditos de API OpenAI são separados.

A conexão Render foi confirmada em 12/09/2026. Foi encontrado somente “My Workspace” e a consulta de serviços não retornou serviços. Não pedir novamente instalação ou login da integração. A criação disponível no plugin não expõe disco persistente e sua descrição restringe criação Docker; manter a implantação completa por Blueprint. O agente deve verificar recursos existentes novamente antes de criar para evitar duplicação. [Operações e limitações oficiais](https://render.com/docs/mcp-server).

### Configuração autorizada em 13/09/2026

| Item | Configuração | Base mensal em USD |
| --- | --- | --- |
| Workspace | Hobby, sem upgrade para Pro; confirmar plano no painel | US$ 0 |
| Web service | Docker, 512 MB, uma instância; Starter / `0.5c-512mb` | US$ 7 |
| Disco | 1 GB em `/app/data` | US$ 0,25 |
| Total de infraestrutura | Região Virginia, origem HTTPS Render | US$ 7,25 |

Cotação consultada em 12/09/2026: [preços Render](https://render.com/pricing) e [modelo de cobrança oficial](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses). O total é uma base, não um teto de fatura: impostos, conversão cambial, excedentes de tráfego/build e uso da OpenAI são separados. O plano do workspace não foi informado pela consulta; não contratar upgrade ou aceitar preço diferente sem nova decisão. O modelo gratuito não oferece o disco necessário e adormece, por isso não atende à arquitetura da Echo.

Blueprint já publicado: https://dashboard.render.com/blueprint/new?repo=https://github.com/socgabrielcardoso/voicesolo

Serviço: `gabriel-voice-os`; repositório `socgabrielcardoso/voicesolo`, branch `main`; arquivo `render.yaml`. O link abre a preparação da implantação, não comprova serviço criado. O proprietário aprovou a base de US$ 7,25/mês em 13/09/2026; não pedir novamente essa aprovação. Campos protegidos precisam de valores válidos; não preencher com placeholders para declarar sucesso. O agente gera os segredos próprios quando houver destino seguro e preserva DATA_KEY. OPENAI_API_KEY e ALEXA_SKILL_ID ainda não estão disponíveis.

Antes da implantação, conferir o job `container` no GitHub Actions ou executar `npm run smoke:container` com Docker. Ele utiliza um volume descartável inicialmente vazio para verificar o bootstrap de permissões, o processo com UID 1000 e a recuperação de dados após reinício. Não cria infraestrutura Render nem valida TLS público.

| Opção | Vantagem | Custo/limitação |
| --- | --- | --- |
| A. Render — recomendada para esta versão | Configuração declarativa, HTTPS e disco | Conta, integração e plano de computação pago |
| B. Servidor próprio com Docker | Reutiliza infraestrutura disponível | Exige servidor ligado, domínio/HTTPS, backup e operação |
| C. Somente local, primeiro | Sem contratação de hospedagem nesta etapa | Cliente web em localhost; Echo exige endpoint público e não está atendida |

Passos operacionais do agente no Render:

1. Usar a integração Render autorizada; selecionar o workspace do proprietário.
2. Obter a cotação do plano e disco. Se não houver orçamento previamente aprovado, apresentar o custo concreto antes de contratar.
3. Criar o serviço a partir de `socgabrielcardoso/voicesolo`, branch `main`, Dockerfile da raiz, com disco `/app/data`, tamanho 1 GB, health check `/healthz`, uma instância. Não usar site estático, GitHub Pages ou um processo que adormeça entre requisições para esta arquitetura.
4. Preparar `DATA_KEY` (32 bytes aleatórios em hex) e `ADMIN_TOKEN` (pelo menos 32 caracteres aleatórios) no gerenciador de segredos; preservar DATA_KEY em redeploys. Não escrever valores no Git ou na conversa.
5. Configurar `OPENAI_API_KEY` no campo protegido do serviço. O proprietário pode inseri-la diretamente, sem enviá-la pelo chat. Se o agente já tiver acesso seguro à chave apropriada e autorização de destino, usar essa capacidade.
6. Configurar `ALEXA_SKILL_ID` após a criação Amazon. Deixar `ALLOWED_ALEXA_USERS` vazio até receber e conferir um pedido assinado de cadastro. A conta vazia permanece sem acesso ao modelo.
7. Usar os defaults declarados no Blueprint. O backend detecta `RENDER_EXTERNAL_URL` automaticamente. Para domínio próprio, definir `PUBLIC_BASE_URL` como a origem HTTPS, sem caminho nem barra final adicional.
8. Implantar e verificar `/healthz`. `/api/status` exige ADMIN_TOKEN. Esse estado confirma configuração, não valida uma cobrança ou chamada real à API.
9. Executar `npm run smoke:live` no ambiente seguro para verificar Responses e Speech. Executar `npm run prepare:audio` para preparar as três falas públicas no disco.
10. Confirmar que `/audio/welcome.mp3` retorna `audio/mpeg` por HTTPS. Se síntese ou conversão falhar, a Skill conserva fallback em texto.

Blueprints não guardam segredos no Git: campos `sync:false` são preenchidos no provedor. `ADMIN_TOKEN` pode ser gerado pelo próprio Render. `DATA_KEY` deve ser exatamente 64 caracteres hexadecimais. O preço não foi fixado em código.

O disco persistente só está disponível na instância em execução: não é montado no build, pre-deploy ou one-off jobs. Portanto, gerar os MP3 em `/app/data` dentro do serviço ativo, por acesso operacional autorizado; não mover `prepare:audio` para uma dessas etapas isoladas. O agente deve verificar se a integração conectada permite configurar o disco antes de criar o serviço. Um deploy com disco interrompe brevemente a instância anterior. [Limites oficiais dos discos](https://render.com/docs/disks).

## 2. Conta OpenAI

O agente precisa de uma chave de projeto da API. O login Amazon e a assinatura ChatGPT não substituem essa chave.

Intervenção indispensável se a chave não estiver disponível: o proprietário entra na plataforma OpenAI, seleciona ou cria um projeto próprio, habilita o faturamento/crédito que desejar e cria a credencial. O valor é inserido diretamente em `OPENAI_API_KEY` no serviço, pelo campo protegido de configuração. Nunca colar a chave em um prompt, issue, README ou screenshot.

O modelo de texto, de TTS e de Realtime pode ter disponibilidade diferente por projeto. O agente executa os testes reais e trata 401 (credencial), 403 (permissão), 429 (limite/crédito) e indisponibilidade de modelo com base na resposta recebida. Nenhum modelo alternativo deve ser apresentado como validado sem testar.

## 3. Alexa Developer Console

Fonte: [criar e gerenciar Skills](https://developer.amazon.com/en-US/docs/alexa/devconsole/create-a-skill-and-choose-the-interaction-model.html).

O login deve ser na conta Amazon que tem acesso à Echo. Se houver cadastro de desenvolvedor, aceite de termos, MFA ou verificação, o proprietário conclui essa etapa. O agente pode configurar os campos e arquivos depois do login autorizado.

1. Abrir o Alexa Developer Console e selecionar **Create Skill**.
2. Nome: **Gabriel Voice OS**. Idioma padrão: **Portuguese (BR)** / `pt-BR`.
3. Escolher modelo **Custom** e hospedagem **Provision your own**. Se aparecer seleção de experiência/template, começar sem template de negócio, com **Start from Scratch**.
4. Salvar a criação e obter o **Skill ID**, no formato `amzn1.ask.skill...`. Registrar esse valor em `ALEXA_SKILL_ID` no backend e redeployar a configuração.
5. Em **Build → Interaction Model → JSON Editor**, carregar o arquivo `skill/interactionModels/custom/pt-BR.json`.
6. **Save Model** e **Build Model**. Conferir o resultado do build. Erros de slot ou nome de invocação são corrigidos pelo agente.
7. Em **Endpoint**, selecionar **HTTPS** e definir o endpoint padrão como a origem real do serviço seguida de `/alexa`.
8. Selecionar a opção de certificado correspondente ao certificado efetivamente apresentado pelo domínio: confiável para subdomínio ou wildcard, conforme inspeção. Não escolher self-signed em produção nem adivinhar o tipo.
9. Salvar. Não habilitar AudioPlayer: esta implementação usa SSML e conversa por turnos.
10. Em **Test**, habilitar testes para **Development**. Selecionar pt-BR e digitar `abrir gabriel voice o. s.` no simulador.

`gabriel voice o. s.` preserva a marca e pontua a sigla. A mistura de inglês e português pode precisar de ajuste. Se a Amazon recusar, apresentar a alternativa de invocação **comando gabriel**, mantendo o nome de exibição Gabriel Voice OS; só declarar a frase exata funcionando depois de testá-la.

## 4. Autorizar a conta da Echo

1. Abrir a Skill no simulador, já com endpoint e Skill ID configurados.
2. O backend recebe a chamada assinada e responde que falta autorização. Nenhum prompt é enviado à OpenAI nesse estado.
3. No painel privado web, conectar com ADMIN_TOKEN, abrir **Conectar minha Echo → Ver pedidos de autorização**. A rota autenticada `/api/alexa/enrollments` fornece o mesmo dado.
4. Conferir o pedido com a sessão que o proprietário acabou de abrir. Copiar o `userId` dessa solicitação para `ALLOWED_ALEXA_USERS` no serviço. Não autorizar todas as solicitações nem inferir o usuário por um ID arbitrário.
5. Aplicar a configuração e abrir novamente a Skill. Se não aparecer pedido, investigar endpoint, certificado e Skill ID. Nunca desabilitar a assinatura para “resolver”.

A autorização é por conta Amazon. Não reconhece individualmente todas as pessoas perto do dispositivo. Desabilitar e reabilitar a Skill pode mudar a identidade; repetir a validação se necessário.

## 5. Validação na Echo

Esta é a ação física do proprietário após o agente concluir os testes de serviço:

1. Verificar no app Alexa se a Echo usa o mesmo contexto de conta autorizado e idioma Português (Brasil).
2. Perto da Echo, dizer **“Alexa, abrir Gabriel Voice OS”**, com a pronúncia aceita no teste da Skill.
3. Esperar a saudação e dizer **“Donna, quanto é sete vezes seis?”**. A resposta deve usar cálculo real e retornar 42.
4. Dizer **“Donna, explique autenticação multifator”**. Se ouvir que a resposta está em preparação, dizer **“continuar”** após alguns instantes.
5. Dizer **“parar”** e verificar o fim da sessão.
6. Abrir outra vez; pedir **“apagar histórico”**; dizer **“não”** para cancelar. Repetir e confirmar **“sim”** para testar a exclusão local.
7. Informar somente o comportamento observado e mensagem de erro, se existir. Não mandar credenciais ou áudios pessoais desnecessários.

Se a Echo fechar o microfone por silêncio, invocar a Skill novamente. O backend não controla esse timeout. O recurso de espera paciente do cliente web não altera a Echo.

## 6. Cliente Realtime

Abrir a URL HTTPS, autenticar com ADMIN_TOKEN e clicar **Iniciar voz**. Autorizar o microfone no dispositivo usado. Falar, fazer uma pausa no meio da frase e terminar; avaliar se a espera está confortável. Testar **Silenciar microfone**, interrupção da fala da Donna e **Encerrar**. Confirmar que o indicador do navegador deixa de usar o microfone.

As respostas textuais são exibidas como texto seguro. Não são inseridas como HTML. O áudio do cliente web não passa pelo microfone da Echo.

## 7. Servidor próprio

Usar o mesmo Dockerfile com volume persistente, variáveis de produção e um proxy HTTPS confiável. `compose.yaml` é apenas para desenvolvimento local; publica a porta em loopback e não instala domínio nem TLS. Antes de produção, configurar origens e TLS no provedor escolhido. Uma instância, sem PM2 cluster. Manter serviço ligado para concluir trabalhos pendentes.

## Pagamento — etapa atual

O proprietário já autorizou a base mensal e informou que está logado. No workspace My Workspace, abrir Billing e a seção Payment Method; cadastrar o cartão no formulário seguro do Render se ainda não houver método válido. Manter o workspace Hobby. A cobrança da infraestrutura ocorre conforme os recursos pagos são usados; cadastrar o método não comprova implantação. O plugin conectado não possui operação de cadastro/consulta de cartão. Fonte do caminho de navegação: https://render.com/docs/render-dashboard#manage-billing . Após a confirmação do método de pagamento, o agente continua o deploy com o orçamento já autorizado.
