# Guia de execução — ClimaBot Telegram

Este guia começa do zero: bot novo, chave OpenWeather própria, instância n8n isolada e repositório novo. Não depende de workflows ou credenciais de outros projetos. A entrega só está pronta depois de o workflow receber mensagens reais no Telegram e passar pelos cenários abaixo. Não há registro de que esses testes reais já tenham sido executados.

## 1. Entender o caminho da mensagem

```text
Telegram → validar entrada → localizar cidade/UF → consultar clima
         → validar resposta → enviar temperatura ou orientação de erro
```

Pense no Telegram Trigger como uma fila de trabalho que inicia o processo quando chega uma solicitação. Os nós intermediários equivalem às etapas de uma automação RPA; cada um tem uma responsabilidade visível. O HTTP Request integra a API diretamente, sem depender de cliques em uma página de previsão do tempo.

O ambiente usa n8n 2.44.5 e um executor externo da mesma versão em Docker, com porta local 5682. O volume conserva workflows e credenciais quando o contêiner é recriado. O SQLite é o armazenamento interno do n8n; o bot não precisa de banco de aplicação. A rede e o volume pertencem somente a este projeto.

## 2. Preparar as ferramentas no Windows

1. Instale o Docker Desktop e conclua os requisitos de virtualização/WSL 2 indicados pelo instalador. Reinicie o Windows se solicitado.
2. Abra o Docker Desktop e aguarde o mecanismo ficar disponível.
3. Instale o ngrok seguindo a documentação oficial e configure a autenticação da sua conta. Esse token pertence ao túnel, não ao Telegram.
4. Tenha acesso ao Telegram. Crie do zero as contas necessárias: OpenWeather na etapa 4 e GitHub em [github.com/signup](https://github.com/signup), se ainda não tiver uma conta. O repositório do desafio será novo, mesmo se usar uma conta GitHub existente.
5. Abra o PowerShell na pasta do projeto:

```powershell
Set-Location 'C:\Users\mathe\Desktop\ClimaBot-Telegram'
docker version
docker compose version
```

Os comandos de verificação precisam responder sem erro de conexão com o Docker. Se a porta 5682 já estiver ocupada, resolva o conflito antes de continuar; não encerre serviços desconhecidos.

## 3. Criar um bot exclusivo para o desafio

1. No Telegram, abra o perfil oficial **@BotFather**.
2. Envie `/newbot` e siga as instruções.
3. Escolha um nome e um nome de usuário terminado em `bot`.
4. Guarde o token em local privado. Não o inclua em screenshots, gravações, commits ou mensagens públicas.
5. Abra a conversa com o novo bot e toque em **Iniciar**. A consulta será enviada depois de configurar o workflow.

Use um bot exclusivo: o Telegram mantém um webhook por bot. Outro workflow usando o mesmo token pode substituir o destino das mensagens.

## 4. Obter a chave OpenWeather

1. Crie sua conta em [OpenWeather](https://home.openweathermap.org/users/sign_up).
2. Confirme o e-mail e abra [API Keys](https://home.openweathermap.org/api_keys).
3. Copie a chave para a configuração local. A ativação da chave pode não ser imediata; consulte o status da sua conta caso receba erro 401.

A criação das contas e a guarda dos segredos ficam sob seu controle. Este guia não exige enviar senhas ou tokens ao chat.

## 5. Preparar a configuração local

Copie o arquivo de exemplo fornecido no projeto:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
notepad .env
```

Se `.env` já existir, preserve a configuração atual e edite o arquivo diretamente, sem sobrescrevê-lo.

Preencha os campos do exemplo. Os principais são:

| Campo | Finalidade |
|---|---|
| `OPENWEATHER_API_KEY` | Chave utilizada pelos HTTP Request via `$env.OPENWEATHER_API_KEY` |
| `TELEGRAM_BOT_TOKEN` | Referência local privada; o token precisa ser cadastrado manualmente na credencial Telegram do n8n |
| `WEBHOOK_URL` | Endereço HTTPS público que receberá os eventos do Telegram |
| `N8N_ENCRYPTION_KEY` | Chave aleatória que protege as credenciais persistidas pelo n8n |
| `N8N_RUNNERS_AUTH_TOKEN` | Segredo de comunicação entre n8n e o contêiner executor |

Para um ambiente novo, gere a chave de criptografia com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e cole o resultado no campo `N8N_ENCRYPTION_KEY` do `.env`. Execute o comando novamente e use outro resultado em `N8N_RUNNERS_AUTH_TOKEN`. Se esses campos já estiverem preenchidos, preserve os valores. Não troque a chave de criptografia depois de cadastrar credenciais. O Node.js é necessário para esse comando e para os testes locais; o workflow roda no n8n dentro do Docker.

Nesta primeira inicialização, mantenha `WEBHOOK_URL=https://example.invalid/` do exemplo. Esse endereço provisório permite criar o proprietário com o editor ainda local; não recebe eventos do Telegram. Na próxima etapa será substituído pelo HTTPS real do túnel.

Mantenha o `.env` fora do Git. Um arquivo `.env.example` pode conter nomes de variáveis e placeholders, nunca valores reais. Preserve também qualquer chave de criptografia exigida pelo arquivo de exemplo: trocar essa chave após salvar credenciais pode impedir que o n8n as leia.

**A variável `TELEGRAM_BOT_TOKEN` não preenche automaticamente a credencial dos nós Telegram.** O cadastro na interface, explicado na etapa 8, é necessário.

## 6. Iniciar o n8n e abrir o túnel

Inicie o serviço local:

```powershell
docker compose up -d
docker compose ps
```

Abra [http://localhost:5682](http://localhost:5682) no navegador e conclua o cadastro do proprietário da instância. Use uma senha exclusiva.

Em outro terminal, mantenha o túnel em execução:

```powershell
ngrok http http://localhost:5684 --inspect=false
```

Copie o endereço **HTTPS** apresentado pelo ngrok. Volte ao `.env` e configure, por exemplo:

```dotenv
WEBHOOK_URL=https://SEU-ENDERECO.ngrok-free.app/
```

O endereço acima é ilustrativo; use exatamente o HTTPS exibido no seu terminal. Recrie o serviço para aplicar a variável:

```powershell
docker compose up -d --force-recreate
```

Atualize a página do n8n. O Telegram precisa alcançar um HTTPS público; `localhost` sozinho só é acessível no seu computador.

**O túnel aponta para o gateway na porta 5684.** Esse gateway permite apenas POSTs de webhook e bloqueia editor e API interna; acessar a raiz HTTPS deve retornar 404. O editor continua em localhost:5682. Desligue o túnel ao terminar os testes. Este ambiente é para o desafio; mantenha o Docker Desktop e o terminal do ngrok abertos durante a demonstração.

Se o endereço do túnel mudar, atualize `WEBHOOK_URL`, recrie o serviço e publique/ative novamente o workflow para registrar o novo webhook.

## 7. Importar o workflow

1. Na interface do n8n, crie ou abra um workflow.
2. No menu do workflow, escolha **Import from File** ou a opção equivalente da versão instalada.
3. Selecione `workflow-chatbot-telegram.json` na raiz do projeto.
4. Confira se os nós e suas conexões foram carregados sem indicação de tipo desconhecido.
5. Salve o workflow.

O arquivo já passou por importação e exportação na CLI do n8n 2.44.5 em ambiente temporário, sem credenciais. Importe-o na sua instância Docker nova. O download final feito depois da configuração e dos testes reais será a versão de entrega.

## 8. Cadastrar a credencial Telegram

1. Abra o nó **Telegram Trigger** do workflow, identificado pelo ícone do Telegram e pela função de recepção.
2. No seletor de credenciais, crie uma credencial **Telegram API**.
3. Cole o token do BotFather no campo de acesso e salve. Use um nome claro, como `Telegram — ClimaBot desafio`.
4. Selecione essa mesma credencial no Trigger e nos **dois nós Telegram Send Message**: o de sucesso e o de erro.
5. Salve o workflow novamente.

Os nomes visíveis dos nós podem descrever a ação em português. Identifique-os também pelo tipo: um recebe o evento e dois enviam mensagens.

A chave OpenWeather é lida do ambiente do contêiner. Confirme visualmente que os HTTP Request usam a expressão `={{ $env.OPENWEATHER_API_KEY }}`, sem substituir por uma chave literal. Evite compartilhar telas que mostrem a avaliação dessa expressão.

## 9. Conferir as decisões do fluxo

Antes de executar, percorra os nós da esquerda para a direita:

| Etapa | O que conferir |
|---|---|
| Recepção | Evento de mensagem e credencial do bot exclusivo |
| Entrada | Texto e `chatId`; variável obrigatória `queue`; normalização e validação de UF/BR |
| Localidade | Geocodificação e seleção compatível com cidade e estado |
| Clima | Endpoint `/data/2.5/weather`, Celsius com `units=metric` e idioma `lang=pt_br` |
| Resposta | Status e campos esperados válidos antes de usar a temperatura |
| Envio | Mesmo `chatId` da solicitação e saída de erro conectada |

O enunciado chama o parâmetro de consulta de `queue`. No projeto, esse nome permanece como variável interna; o nome reconhecido pela API é `q`. A geocodificação ajuda a conferir o estado brasileiro, pois a pesquisa textual da OpenWeather não garante esse filtro por UF.

## 10. Executar os testes de integração

1. Mantenha o workflow desativado enquanto usa o modo de teste.
2. Clique em **Execute workflow** e aguarde o Telegram Trigger entrar em escuta.
3. Envie uma mensagem na conversa com seu bot.
4. Acompanhe a execução no n8n e confira a resposta no Telegram.
5. Repita a escuta quando o teste manual encerrar. Não espere várias mensagens serem recebidas por uma única escuta já finalizada.

Use estes cenários e registre o resultado real:

| Mensagem | Resultado esperado |
|---|---|
| `São Paulo,SP,BR` | Nome da cidade e temperatura atual em °C |
| `Belo Horizonte,MG,BR` | Nome da cidade e temperatura atual em °C |
| `Florianópolis,SC,BR` | Nome da cidade e temperatura atual em °C |
| `CidadeInexistenteXYZ,SP,BR` | Mensagem de cidade não encontrada e orientação de formato |
| `  SÃO PAULO , SP , BR  ` | Entrada normalizada e consulta da mesma localidade |
| `Curitiba,XX,BR` | Erro de entrada; nenhuma temperatura inventada |
| Foto ou sticker | Tratamento controlado da ausência de texto |

Uma mensagem de sucesso deve seguir este padrão: `🌤️ A temperatura em Belo Horizonte é de 25°C.` O número é somente um exemplo de formato; a temperatura verdadeira virá da API no momento do teste.

Para cidade inexistente, entrada inválida ou payload inválido em HTTP 200, conferir a mensagem exigida pelo desafio:

```text
❌ Cidade não encontrada. Use o formato Cidade,UF,BR (ex.: São Paulo,SP,BR).
```

Falhas técnicas, como 401, 429 ou timeout, usam a mensagem de indisponibilidade temporária. O tratamento preserva a mensagem exigida pelo desafio para payloads inválidos retornados com HTTP 200.

Registre data, entrada, resposta recebida e identificação da execução. Capturas podem comprovar o resultado, desde que não revelem tokens, chave da API ou dados pessoais. Testes locais com respostas simuladas demonstram a lógica; o aceite de integração depende da mensagem efetivamente recebida no Telegram.

## 11. Testar o modo publicado

Depois dos testes manuais:

1. Termine a escuta manual.
2. Salve e **publique/ative** o workflow pela interface do n8n.
3. Envie outra cidade e confirme a execução registrada e a mensagem recebida.

O webhook de teste e o publicado disputam o mesmo bot. Não deixe o teste em escuta enquanto espera receber mensagens na versão publicada. A edição de um workflow pode exigir nova publicação para atualizar a versão em uso.

## 12. Resolver problemas comuns

| Sintoma | Verificação |
|---|---|
| Docker não responde | Docker Desktop aberto e mecanismo disponível |
| Editor não abre | Serviço ativo e porta 5682 livre |
| Telegram exige HTTPS | `WEBHOOK_URL` deve conter o HTTPS público do túnel |
| Telegram não dispara | Bot correto, túnel ativo, credencial selecionada e modo de teste/publicação consistente |
| OpenWeather retorna 401 | Chave correta, conta confirmada, chave ativa e variável aplicada após recriar o contêiner |
| Acesso ao `$env` bloqueado | Revisar a configuração de acesso a variáveis dos nós prevista no Compose |
| API retorna 429 | Limite da conta atingido; reduzir consultas e aguardar recuperação |
| Cidade existente recebe erro | Conferir UF e grafia; a busca de candidatos da API tem limite e não garante cobertura irrestrita |

Consulte logs localmente quando necessário. Não copie logs completos para um repositório público: podem conter informações de requisição e credenciais avaliadas.

## 13. Exportar a entrega final

1. No n8n, salve o workflow validado.
2. Use **Download** no menu do workflow.
3. Salve como **`workflow-chatbot-telegram.json`**.
4. Abra o JSON em um editor e revise: tokens, chaves literais, dados fixados de execução (`pinData`), IDs de chat e dados pessoais não devem fazer parte da entrega.
5. Referências a credenciais não equivalem a tokens, mas nomes e IDs privados também podem ser removidos antes de compartilhar. Não exporte um arquivo de credenciais descriptografadas.
6. Confirme que o README continua alinhado ao workflow exportado.

O enunciado também menciona outro nome em um trecho, mas a seção de entrega e as dicas repetem `workflow-chatbot-telegram.json`; esse é o nome adotado.

## 14. Publicar e submeter

1. Crie no GitHub um repositório chamado **`chatbot-telegram`**, com visibilidade **pública**.
2. Confira os arquivos antes de fazer upload ou commit. Inclua o JSON final e `README.md`; o Compose e a documentação ajudam na reprodução.
3. Não publique `.env`, arquivos de credenciais, volume do n8n, logs ou capturas com dados sensíveis.
4. Abra o repositório em janela anônima e confira se o README e o JSON estão acessíveis.
5. Copie o endereço do repositório e envie no campo de entrega da Rocketseat.
6. Guarde a confirmação de submissão mostrada pela plataforma.

Publicação do repositório e submissão são passos manuais deste guia; não foram realizadas automaticamente.

## 15. Encerrar o ambiente

Quando concluir a demonstração, despublique/desative o workflow e encerre o ngrok com `Ctrl+C`. Para parar o n8n:

```powershell
docker compose down
```

O volume persiste. Evite `docker compose down -v`: a opção `-v` remove os volumes e pode apagar workflows e credenciais. Para retomar, inicie o Docker, suba o serviço, abra o túnel e atualize o endereço público se necessário.

## Referências

- [Documentação OpenWeather: clima atual](https://openweathermap.org/api/current)
- [Documentação OpenWeather: geocodificação](https://openweathermap.org/api/geocoding-api)
- [n8n: Telegram Trigger e problemas comuns](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.telegramtrigger/common-issues/)
- [ngrok: início rápido](https://ngrok.com/docs/getting-started/)

