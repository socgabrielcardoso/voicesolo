# Segurança e dados

## Fronteiras implementadas

- `/alexa` exige assinatura Amazon SHA-256 sobre o corpo original; não existe flag de bypass para produção ou desenvolvimento. O SDK oficial valida assinatura e cadeia de confiança. O wrapper restringe URL, tamanho, cache e prazo de download, e revalida a validade do certificado em cache hits.
- Timestamp com tolerância absoluta máxima de 150 segundos; Skill ID e identidade de sessão conferidos. Uma requisição legítima repetida reutiliza a resposta guardada por cinco minutos.
- Usuários fora da allowlist não chamam a OpenAI. Uma requisição previamente autenticada pela Amazon pode registrar um pedido de autorização, visível apenas no painel privado, por 15 minutos. Não existe cadastro aberto automático.
- A allowlist identifica **a conta Alexa**, não a pessoa que fala. Qualquer pessoa perto de uma Echo dessa conta pode usar a Skill. Esta versão não deve ganhar poderes administrativos, financeiros ou acesso corporativo apenas com essa identificação.
- `/api` exige `ADMIN_TOKEN` de pelo menos 32 caracteres, com comparação em tempo constante e verificação de Origin quando presente. O token só fica na memória da página, não em localStorage, cookie ou URL.
- Chave OpenAI e DATA_KEY só no servidor. Não há endpoint para ler, criar ou trocar segredos.
- SQLite tem dados de conteúdo criptografados por AES-256-GCM com nonce aleatório. IDs usam HMAC. A chave fica fora do banco e precisa de backup separado. Isso não protege contra um invasor que já controle o processo com acesso a ambos.
- Histórico padrão: seis pares de mensagens, validade de 24 horas desde a última atualização. Resultados pendentes e cache também expiram. Contadores globais são mantidos por até sete dias e não desaparecem ao apagar histórico.
- Não há logs de áudio, mensagens, envelopes completos, tokens, URLs assinadas ou chaves. Logs registram eventos, estados e códigos de erro sanitizados.
- Ferramentas só de leitura/cálculo. Nomes desconhecidos, campos extras, valores inválidos e divisão por zero são rejeitados. Não há `eval`, shell de modelo, URLs arbitrárias, envio de e-mail ou acesso a arquivos do host por ferramentas.

## Dados enviados

| Destino | Conteúdo |
| --- | --- |
| Amazon | Fala captada pela Echo, reconhecimento e resposta de texto da Skill |
| OpenAI Responses | Pedido reconhecido, histórico limitado, persona e resultados das ferramentas |
| OpenAI Realtime | Áudio do microfone do cliente web, configurações e eventos da sessão |
| OpenAI Speech | Somente falas públicas fixas de saudação, ajuda e despedida |
| Disco do serviço | Histórico/resultados criptografados, uso diário e MP3 das falas públicas |

`store:false` reduz o estado persistido pela Responses API; não é uma promessa de retenção zero. As políticas e os controles de dados dos provedores continuam aplicáveis. A exclusão local não apaga gravações da Alexa, registros de segurança dos provedores nem backups antigos. Referência: [OpenAI Data Controls](https://developers.openai.com/api/docs/guides/your-data).

## Operação

HTTPS público é obrigatório em produção. Use uma instância; SQLite e controle de jobs desta versão não suportam vários workers independentes. O contêiner inicializa a permissão do volume e então abandona root, executando o serviço com UID/GID 1000. Nunca exponha diretamente um servidor de desenvolvimento à internet.

Contas de API precisam de projeto dedicado, permissões mínimas e acompanhamento de uso. Cotas locais são controles de aplicação, não promessa de fatura máxima. A perda de conectividade pode impedir um hangup imediato; novas sessões ficam bloqueadas até recuperação ou expiração do registro.

## Adicionar ferramentas com efeitos externos

Criar um adaptador para a API oficial; definir schema sem propriedades extras; limitar a operação aos recursos autorizados; manter segredos do lado do servidor; verificar a identidade necessária independentemente do texto do modelo; usar identificadores de idempotência; apresentar a ação concreta e exigir confirmação antes de enviar mensagens, executar comandos ou alterar dados externos. Uma frase do modelo dizendo que recebeu autorização não é prova de autorização.

Não copie automaticamente plugins, memórias ou permissões do ChatGPT. Essa integração requer um contrato e credenciais próprios.

## Relatar problema

Não publique chaves, áudios pessoais, banco ou conteúdo de conversas em issues. Para falhas públicas de código, abra uma issue com versão, comportamento esperado e reprodução sem dados reais. Credencial exposta deve ser revogada no provedor e substituída no serviço.
