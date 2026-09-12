# Validação

Data da execução local: 12/09/2026.

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

- [x] CI no GitHub aprovado no commit 35fbaa5d662de193c9510ac55eb9bd934992a4af — execução 34666847238. O commit seguinte registra somente documentação da pausa.
- [ ] Build e execução do contêiner no provedor.
- [ ] Hospedagem e despesa aprovadas; serviço HTTPS ativo.
- [ ] Chave OpenAI configurada em segredo de servidor.
- [ ] Responses e Speech reais aprovados (`smoke:live`).
- [ ] Falas públicas sintetizadas, servidas e reproduzidas.
- [ ] Realtime com áudio real, ferramentas, interrupção e encerramento.
- [ ] Login Amazon Developer, criação/configuração da Skill e build pt-BR.
- [ ] Certificado e assinatura Amazon validados com tráfego real.
- [ ] Conta da Echo autorizada a partir de solicitação assinada.
- [ ] Invocação exata, pergunta, continuar, parar e exclusão testados na Echo física.

Só marcar a ativação como concluída depois das verificações externas. A implementação não encaminha áudio bruto do microfone da Echo à OpenAI e não reproduz conversas pessoais em arquivos públicos de MP3.
