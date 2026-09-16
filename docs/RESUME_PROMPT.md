# Projeto PAUSADO — retomada somente por ordem explícita

O proprietário pausou o Gabriel Voice OS em 16/09/2026 e solicitou cancelamento do Render ou o link para fazê-lo. Não executar o roteiro abaixo sem nova ordem de retomada. Autorizações históricas de implantação não anulam a pausa.

## Prompt para quando o proprietário decidir retomar

Donna, retome o Gabriel Voice OS no repositório https://github.com/socgabrielcardoso/voicesolo, branch main. Leia primeiro README.md e docs/PROJECT_STATUS.md, que registram a pausa e o último ponto conhecido. Preserve o código e os segredos existentes.

O último commit de implementação é 467cdec15d6a9be4c83e301628559d9cd236b3f2. O backend havia sido implantado no Render, serviço srv-dajhoj0ae00c73a1dnag. O cancelamento/suspensão foi solicitado, mas ainda não estava confirmado no checkpoint: consulte o estado atual antes de qualquer ação e não presuma que o serviço ou seu disco continuam disponíveis. Não recrie automaticamente recursos pagos.

A chave OpenAI já havia sido configurada. A consulta autenticada do modelo foi aceita, mas uma tentativa de geração retornou HTTP 429, sem métricas de uso ou resposta. Não atribua a falha exclusivamente a falta de saldo sem evidência. O diagnóstico automático ficou desativado, com OPENAI_DIAGNOSTIC_RUN_ID vazio. Não regenerar ADMIN_TOKEN ou DATA_KEY para facilitar acesso. Nunca solicitar segredos pelo chat.

O CI anterior aprovou 24 testes e contêiner. Não repetir testes sem necessidade concreta. Alexa continua sem Skill configurada nem teste físico na Echo. O navegador disponível não conseguiu concluir o login Amazon. A estimativa histórica era aproximadamente 75%; isso não significa conversa real validada.

Confirme os custos vigentes antes de reativar hospedagem ou consumir APIs. A antiga base Render era US$ 7,25/mês; a pausa substituiu a autorização de continuar a execução. Se minha participação for indispensável, escreva “AÇÃO NECESSÁRIA DO CHEFE” e explique o bloqueio concreto com instruções para aquela etapa.

Preserve os limites: Alexa envia texto reconhecido em intents/slots, não áudio bruto; respostas pessoais usam síntese Alexa; Realtime usa o microfone do cliente web; voz, memórias e plugins do ChatGPT não são transferidos automaticamente. Só avance para implementação/deploy conforme a nova autorização de retomada.
