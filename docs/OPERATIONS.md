# Operação

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run setup` | Cria .env e segredos ausentes; preserva os existentes |
| `npm start` | Inicia HTTP, Skill e controle Realtime |
| `npm run doctor` | Verifica configuração local, sem expor segredos |
| `npm run prepare:audio` | Gera falas públicas ausentes; consome API Speech |
| `npm run smoke:live` | Valida Responses e Speech reais; consome créditos |
| `npm run smoke:container` | Com Docker, constrói e verifica contêiner e volume temporários; sem credenciais reais ou chamadas OpenAI |
| `npm run check` | Verifica sintaxe e restrições básicas do JSON Alexa |
| `npm test` | Testes locais com OpenAI substituída por fixtures |

## Diagnóstico direto

| Sintoma | Verificar |
| --- | --- |
| Serviço não inicia | Node 24; DATA_KEY de 32 bytes em hex ou Base64 canônico; ADMIN_TOKEN; URL HTTPS em produção; disco gravável |
| `/healthz` responde, Donna não | Chave e permissão dos modelos, crédito e logs sanitizados de erro |
| Alexa diz que há problema na Skill | Endpoint HTTPS, certificado, Skill ID, build pt-BR e status do serviço |
| Alexa não reconhece a invocação | Idioma e nome realmente aceito no build; testar primeiro no simulador |
| Pedido de autorização não aparece | Chamada não chegou com assinatura válida/Skill ID correto; ver configuração Amazon |
| Conta não autorizada | Comparar solicitação assinada com a conta da Echo e ALLOWED_ALEXA_USERS |
| “Continuar” ainda aguarda | O job está processando; o prazo padrão é 25 segundos; não iniciar outro pedido até ouvir ou cancelar |
| Voz pública usa voz Alexa | Arquivo público ainda ausente ou origem não HTTPS; executar prepare:audio |
| Realtime indisponível | Modelos autorizados, limite diário, sessão ativa/presa, WebRTC e conectividade de saída |
| Sessão anterior presa | Conectar o painel e clicar Encerrar; o servidor tenta hangup remoto; falha preserva o bloqueio e tenta recuperar |
| Microfone web não abre | HTTPS/localhost, permissão do navegador e dispositivo de áudio |
| Histórico voltou vazio | TTL expirou, exclusão confirmada, volume perdido ou identidade diferente |

O processo não recupera respostas pendentes executando de novo após reiniciar: marca o trabalho como interrompido e pede nova pergunta. Isso evita repetir chamadas pagas silenciosamente. Contexto web e Alexa são separados. O cliente Realtime mantém contexto na chamada ativa; não importa o histórico de texto SQLite.

## Backup e atualização

Parar o serviço e aguardar seu encerramento antes de copiar o volume SQLite. Preservar banco e DATA_KEY separadamente; perder a chave torna o conteúdo ilegível. Um backup antigo pode conter dados já apagados do banco ativo. Não assumir que o snapshot automático de disco do Render é um backup consistente do banco em execução: o provedor alerta que restaurar discos de bancos pode resultar em corrupção. Ver [restrições de restauração](https://render.com/docs/disks#restoring-a-custom-database).

Atualizar dependências com `npm install --save-exact`, revisar lockfile, executar checks/testes/auditoria e redeployar. Não alterar DATA_KEY em um redeploy comum. Ao trocar a voz/configuração TTS, gerar novamente apenas os arquivos públicos do catálogo durante uma janela controlada.

Logs válidos: `listening`, `answer_failed`, `realtime_hangup_failed`, `public_audio_prepared`, `openai_diagnostic`. Não habilitar logging global de corpos HTTP ou eventos Realtime, pois podem conter texto ou áudio.

## Diagnóstico OpenAI sem shell remoto

O operador com acesso à configuração Render pode definir `OPENAI_DIAGNOSTIC_RUN_ID` com um identificador único (letras, números, hífen ou sublinhado; até 64 caracteres). `OPENAI_DIAGNOSTIC_MODE=models` consulta somente o modelo configurado; não gera tokens. `responses` também faz **uma** chamada ao GPT-4.1 mini, sem ferramentas, histórico ou áudio, limitada a **32 tokens de saída**. Não funciona com outros modelos sem revisão de orçamento. Informar custo estimado ao proprietário antes de habilitar esse modo pago.

O diagnóstico começa após a inicialização do servidor. Usa a credencial já existente no processo, sem expô-la ao agente. Não cria rota HTTP ou substitui ADMIN_TOKEN/DATA_KEY. A aplicação grava uma reserva atômica em `/app/data/diagnostics/<id>.json` antes de contatar a OpenAI e não repete aquele identificador após reinício, falha ou timeout. Preservar esse arquivo: removê-lo ou restaurar um disco anterior pode permitir uma nova tentativa.

O evento `openai_diagnostic` registra apenas estado, modelo, contadores, códigos de erro permitidos, duração e tokens retornados. O valor `calculatedUsd` usa as tarifas consultadas em 16/09/2026 (US$ 0,40 entrada; US$ 0,10 entrada em cache; US$ 1,60 saída, por milhão). É custo calculado de API, não uma consulta à fatura. Se o provedor não devolver uso, o custo permanece desconhecido. `model_access_confirmed` não comprova saldo nem geração. `responses_passed` confirma apenas texto; Speech, Realtime e Alexa exigem validação própria.

Para desativar, deixar `OPENAI_DIAGNOSTIC_RUN_ID` vazio; manter o registro persistente. Alterar o ID representa autorizar uma nova tentativa e requer informação prévia de custo. O serviço permanece disponível mesmo se o diagnóstico falhar.

## Critério de operação concluída

Código publicado e teste local verde não bastam. É necessário obter evidência de build Amazon, HTTPS real, uma resposta real OpenAI, áudio real no cliente web e execução física dos comandos na Echo. Registrar datas e limitações em VALIDATION.md.
