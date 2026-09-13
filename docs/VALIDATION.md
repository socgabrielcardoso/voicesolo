# Validação

Data da execução local: 12/09/2026.

## Backend público verificado — 13/09/2026

O proprietário confirmou US$ 7,25 no painel e aplicou o Blueprint. O plugin Render confirmou serviço `srv-dajhoj0ae00c73a1dnag`, Docker, Virginia, uma instância `0.5c-512mb` e disco `dsk-dajhoj0ae00c73a1dnpg` de 1 GB em `/app/data`. Deploy `dep-dajhojgae00c73a1dorg`, commit `b79da2fb1b28615ec51e1b1d2563da5fc84b85e6`: `live`, finalizado às 21:58:46 UTC.

Sete verificações reais via HTTPS de https://gabriel-voice-os.onrender.com concluídas às 22:05:04 UTC, usando validação TLS padrão, sem credenciais e sem chamadas OpenAI:

| Verificação | Resultado |
| --- | --- |
| GET /healthz | 200; status ok e serviço esperado; HSTS/CSP presentes; no-store |
| GET / | 200; página Donna servida |
| GET /api/status sem token | 401 |
| GET /api/status com Origin externo | 403 |
| GET /.env | 404 |
| GET /data/voice.sqlite | 404 |
| POST /alexa sem assinatura | 400 |

Relatório: [evidence/render-2026-09-13.json](evidence/render-2026-09-13.json). Os logs mostram `openaiConfigured: false` e `alexaConfigured: false`. A métrica de memória às 22:03 UTC foi 31.383.552 bytes, com uma instância; é uma amostra inicial, não um teste de carga.

Esta evidência confirma serviço público e controles de entrada. Ainda não testa acesso com ADMIN_TOKEN correto, chamadas OpenAI, UI com microfone, assinatura Amazon real ou persistência após reinício no Render. As chaves geradas foram preservadas. A etapa seguinte depende de OPENAI_API_KEY e acesso operacional seguro para testes autenticados.

## Implantação preparada — 13/09/2026

CI aprovado no commit `bbfbb4aaf9778297ece9acfbc58903ab838c7983`: [execução 34784330707](https://github.com/socgabrielcardoso/voicesolo/actions/runs/34784330707). Jobs verify e container aprovados; logs confirmaram **21 testes, 21 aprovados, zero falhas**, auditoria npm sem vulnerabilidades reportadas e teste do contêiner aprovado com DATA_KEY e ADMIN_TOKEN Base64.

Os três testes novos verificam compatibilidade criptográfica e identidade entre hex/Base64, rejeição de chaves inválidas/não canônicas e inicialização em produção sem credenciais OpenAI/Amazon. A configuração render.yaml passou no JSON Schema oficial obtido de https://render.com/schema/render.yaml.json. Isso verifica estrutura, não autorização ou aceitação final da conta no Dashboard.

Naquele checkpoint, orçamento e pagamento estavam confirmados, mas não havia serviço criado nem chamadas OpenAI reais. A aplicação inicial estava pendente e foi concluída na etapa documentada acima. O commit posterior à preparação alterava somente documentação.

## Retomada: contêiner validado no GitHub Actions

Em 12/09/2026, o CI foi aprovado no commit `2a232628d2798f5fbcb02c37a8cae3de0110979f`: [execução 34679105216](https://github.com/socgabrielcardoso/voicesolo/actions/runs/34679105216). Os jobs `verify` e `container` terminaram com sucesso.

- `verify`: sintaxe/modelo, os 18 testes existentes e auditoria npm sem vulnerabilidades reportadas.
- `container`: build real do Dockerfile em runner Linux; backend iniciado com configuração de produção, origem fornecida por `RENDER_EXTERNAL_URL` e volume inicialmente vazio.
- HTTP real no contêiner: saúde, página, HSTS, autenticação obrigatória, rejeição de origem diferente e bloqueio de arquivos privados.
- Processo principal confirmado com UID 1000; diretório de dados com modo 0700, banco com modo 0600 e presença de FFmpeg/FFprobe.
- Encerramento com código zero; reinício conservando e decifrando o registro de teste e preservando o contador no volume.

Foram usadas chaves temporárias de teste. Nenhuma chave de produção foi lida; não houve chamada OpenAI nem serviço público. O teste valida o contêiner no CI, não a montagem do disco ou o certificado no Render. O commit posterior atualiza somente a documentação dessas evidências.

## Executado

- Instalação de dependências e lockfile completo.
- Verificação de sintaxe JavaScript e restrições básicas do modelo Alexa pt-BR.
- **18 testes automatizados, 18 aprovados**: fluxos Alexa, duplicatas, pendência/continuidade, cancelamento/exclusão, restart, criptografia, quota, ferramenta, provedor e Realtime.
- Servidor HTTP real em loopback: endpoint de saúde, autenticação de API, pedido de texto com provedor controlado, corpo excessivo, origem indevida, tentativa de ler .env/banco e requisição Alexa sem assinatura.
- Conversão real FFmpeg/FFprobe com um tom sintético: MP3, 24 kHz, 48 kbps, dois canais. O tom de teste não é uma fala da OpenAI.
- Verificação do contrato Realtime: criação SDP, configuração GA, controle de ferramentas, deduplicação e encerramento por proprietário com transporte controlado.
- Auditoria npm após atualização de `ws` para 8.21.3: **zero vulnerabilidades reportadas** naquela consulta.
- Inicialização local do backend com chaves da aplicação geradas, mas sem chave OpenAI e sem Skill ID de produção.

## Limites desta evidência

Não houve uso de credenciais reais OpenAI nesta etapa. Os testes automatizados de provedor e transporte usam fixtures. Isso valida código e tratamento de erros, não disponibilidade, latência, custo ou som real dos serviços externos.

O navegador remoto retornou `ERR_BLOCKED_BY_CLIENT` ao abrir o endereço local. Por isso, revisão visual e interação completa de microfone no navegador estão pendentes. Testes locais HTTP não substituem essa verificação.

## Pendências de ativação

- [x] CI no GitHub aprovado no commit bbfbb4aaf9778297ece9acfbc58903ab838c7983 — execução 34784330707, 21 testes.
- [x] Build e execução real do contêiner no CI, com permissões e persistência após reinício.
- [x] Build e execução do contêiner no provedor — deploy live em 13/09/2026.
- [x] Despesa de hospedagem aprovada e pagamento confirmado pelo proprietário.
- [x] Blueprint aplicado; serviço HTTPS ativo no Render e sete verificações públicas aprovadas.
- [ ] Teste autenticado em produção e persistência após reinício no Render.
- [ ] Chave OpenAI configurada em segredo de servidor.
- [ ] Responses e Speech reais aprovados (`smoke:live`).
- [ ] Falas públicas sintetizadas, servidas e reproduzidas.
- [ ] Realtime com áudio real, ferramentas, interrupção e encerramento.
- [ ] Login Amazon Developer, criação/configuração da Skill e build pt-BR.
- [ ] Certificado e assinatura Amazon validados com tráfego real.
- [ ] Conta da Echo autorizada a partir de solicitação assinada.
- [ ] Invocação exata, pergunta, continuar, parar e exclusão testados na Echo física.

Só marcar a ativação como concluída depois das verificações externas. A implementação não encaminha áudio bruto do microfone da Echo à OpenAI e não reproduz conversas pessoais em arquivos públicos de MP3.
