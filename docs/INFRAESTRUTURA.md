# Infraestrutura isolada do ClimaBot

## Recursos do projeto

O `name: climabot-telegram` no Compose define um projeto Docker próprio. O serviço não usa rede, volume, banco ou credenciais de outra stack.

| Recurso | Configuração |
|---|---|
| Projeto Compose | `climabot-telegram` |
| Serviço | `n8n`, imagem fixada em `2.44.5` |
| Executor dedicado | `task-runners`, imagem `n8nio/runners:2.44.5` |
| Contêiner esperado | `climabot-telegram-n8n-1` |
| Rede bridge exclusiva | `climabot-telegram_climabot_network` |
| Volume exclusivo | `climabot-telegram_n8n_data` |
| Gateway de webhooks | `nginx:1.28-alpine`, porta `127.0.0.1:5684` |
| Editor no Windows | `http://localhost:5682` |
| Porta dentro do contêiner | `5678` |
| Comunicação dos executores | `http://n8n:5679`, somente na rede Docker do projeto |
| Banco interno | SQLite do n8n, armazenado no volume exclusivo |
| Segredos | `.env` local e credenciais do próprio n8n |
| Workflow de importação | Montagem somente leitura em `/opt/climabot/workflow-chatbot-telegram.json` |

É como criar outro ambiente de aplicação: dois contêineres podem usar a porta interna `5678`, pois cada um tem seu próprio espaço de rede. No Windows, cada publicação precisa de uma porta diferente; este projeto usa `5682`.

A rede bridge separa os serviços e o DNS interno das outras stacks. Ela permite saída à internet para consultar as APIs; não representa isolamento absoluto do host ou de toda a rede externa. A porta publicada fica vinculada apenas a `127.0.0.1`.

## Dependências necessárias

O n8n contém os nós Telegram, HTTP, Set e IF. Os nós Code são executados pelo contêiner auxiliar `task-runners`, conforme a configuração de [executores externos do n8n](https://docs.n8n.io/hosting/configuration/task-runners/). As versões das duas imagens são iguais. A comunicação usa um segredo privado `N8N_RUNNERS_AUTH_TOKEN`; o executor não recebe a chave OpenWeather nem monta o volume de credenciais.

Não há Redis nem Postgres externos: o desafio não exige filas distribuídas ou múltiplos workers. O volume SQLite dedicado já evita compartilhar os dados com outros projetos.

O túnel ngrok aponta para o gateway na porta 5684. O gateway aceita apenas POSTs em `/webhook/` e `/webhook-test/`, e bloqueia editor e `/rest/`. A raiz pública deve responder 404; `/healthz` responde 200. O editor local permanece acessível na porta 5682. O ngrok usa `--inspect=false` para não capturar corpos das mensagens no inspetor. A variável local `WEBHOOK_URL` é repassada pelo Compose como `N8N_WEBHOOK_URL`, nome usado pela versão instalada do n8n.

## Operação sem atingir outras stacks

Execute os comandos a partir de `C:\Users\mathe\Desktop\ClimaBot-Telegram`:

```powershell
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose restart n8n
docker compose stop
docker compose start
docker compose down
```

Esses comandos selecionam apenas o projeto deste Compose. Para conferir os recursos:

```powershell
docker ps --filter label=com.docker.compose.project=climabot-telegram
docker network ls --filter label=com.docker.compose.project=climabot-telegram
docker volume ls --filter label=com.docker.compose.project=climabot-telegram
```

O volume conserva workflows, usuário e credenciais. Não use limpeza global (`prune`) nem remoção de volumes para operar este projeto. Não altere `N8N_ENCRYPTION_KEY` após cadastrar credenciais.

Para importação pela CLI, pare o serviço n8n antes de abrir um segundo processo que acessa o SQLite:

```powershell
docker compose stop n8n
docker compose run --rm --no-deps --entrypoint n8n n8n import:workflow --input=/opt/climabot/workflow-chatbot-telegram.json
docker compose up -d --wait
```

Na interface gráfica, a importação continua pelo menu **Import from File**. O healthcheck usa `/healthz/readiness`, para aguardar a prontidão da aplicação em vez de apenas a abertura do servidor HTTP.

## Antes da integração

1. Confirmar o editor e a saúde do serviço.
2. Cadastrar o proprietário da instância.
3. Importar o JSON e selecionar a credencial do bot novo.
4. Configurar o HTTPS público e atualizar `WEBHOOK_URL`.
5. Testar mensagens reais e registrar os resultados no documento de testes.

Infraestrutura saudável não comprova que o bot recebeu ou entregou uma mensagem.
