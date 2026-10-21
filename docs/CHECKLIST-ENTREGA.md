# Checklist de entrega

## Construção local

- [x] Workflow JSON com nome exigido.
- [x] Telegram Trigger, Set, IF, HTTP Request e Telegram Send Message.
- [x] `queue`, normalização, validação de UF e país.
- [x] OpenWeather, Celsius, português brasileiro e chave pelo ambiente.
- [x] Rotas de sucesso e erro com preservação do chat de origem.
- [x] README, guia do zero, Compose e exemplo de configuração sem segredos.
- [x] Verificações locais de lógica e conexões.
- [x] Importação e exportação na CLI n8n 2.44.5, em ambiente temporário isolado.
- [x] Um cenário simulado executado no motor n8n, com integrações substituídas na cópia de teste.
- [x] Instância Docker e executor externo dedicados, com rede e volume exclusivos.
- [x] Workflow importado na instância Docker; arquivo de entrega inativo e sem credenciais.
- [x] Versão de teste publicada no bot exclusivo e webhook confirmado na Telegram API, sem erro.

## Integração real — preencher depois da execução

- [x] Usuário confirmou que já possui bot/token Telegram e chave OpenWeather.
- [ ] Confirmar que o bot informado é exclusivo do desafio.
- [x] Iniciar Docker e cadastrar proprietário na instância isolada.
- [x] Abrir túnel HTTPS restrito aos webhooks e configurar `WEBHOOK_URL` real.
- [x] Selecionar a credencial Telegram nos três nós do workflow já importado.
- [x] Validar consultas reais: `q` na consulta principal e coordenadas no fallback.
- [x] Testar São Paulo,SP,BR.
- [x] Testar Belo Horizonte,MG,BR.
- [x] Testar Florianópolis,SC,BR.
- [x] Testar cidade inexistente e conferir mensagem exigida.
- [x] Confirmar recebimento efetivo das mensagens no Telegram.
- [x] Encerrar modo de teste e validar uma execução publicada.
- [x] Registrar evidências sem segredos ou dados pessoais.
- [x] Exportar o arquivo final da instância n8n testada e revisar segredos (CLI).

Confirmação manual e captura do Telegram recebidas em 21/10/2026 para os quatro cenários: 22°C, 27°C, 21°C e erro esperado, entre 16:04 e 16:05. IDs individuais não foram capturados. A imagem contém outras conversas e permanece apenas na pasta privada de evidências. A exclusividade do bot foi presumida pelo escopo do desafio e pelo webhook inicialmente ausente; não foi auditado todo o histórico de uso do token.

## Publicação e submissão

- [ ] Criar repositório público `chatbot-telegram`.
- [ ] Publicar JSON final e README, com os auxiliares revisados.
- [ ] Confirmar que `.env`, tokens e credenciais não aparecem no histórico.
- [ ] Abrir repositório em janela anônima e conferir acesso.
- [ ] Submeter o link na Rocketseat e guardar confirmação.
- [ ] Encerrar túnel e desligar instância após a demonstração, preservando o volume.
