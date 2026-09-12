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
| Serviço não inicia | Node 24; DATA_KEY hex com 64 caracteres; ADMIN_TOKEN; URL HTTPS em produção; disco gravável |
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

Logs válidos: `listening`, `answer_failed`, `realtime_hangup_failed`, `public_audio_prepared`. Não habilitar logging global de corpos HTTP ou eventos Realtime, pois podem conter texto ou áudio.

## Critério de operação concluída

Código publicado e teste local verde não bastam. É necessário obter evidência de build Amazon, HTTPS real, uma resposta real OpenAI, áudio real no cliente web e execução física dos comandos na Echo. Registrar datas e limitações em VALIDATION.md.
