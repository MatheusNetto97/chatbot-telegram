# ClimaBot — plano de execução

## 1. Escopo e critérios

Criar tudo do zero: bot exclusivo, chave OpenWeather própria, instância n8n independente, workflow e repositório novo. Receber Cidade,UF,BR pelo Telegram e responder a temperatura atual obtida da OpenWeather. Usar nomes de negócio nos nós e camelCase nas variáveis. A exceção é `queue`, mantida para atender ao enunciado.

Aceite final: importar no n8n, configurar credenciais locais, testar três cidades e uma inexistente, revisar o JSON exportado e publicar os arquivos exigidos em repositório público.

## 2. Arquitetura escolhida

Telegram → normalização e validação → geocodificação OpenWeather → seleção por cidade/UF/BR → consulta do clima → validação HTTP e payload → resposta Telegram.

- Um workflow, sem agentes de IA, banco de aplicação ou Gemini: a resposta depende de um dado objetivo.
- n8n em Docker, com SQLite gerenciado pelo próprio n8n e volume persistente.
- Editor somente em localhost:5682; túnel HTTPS para o webhook do Telegram.
- Chave OpenWeather em variável de ambiente; token Telegram no cofre de credenciais do n8n.
- Nós Code limitados ao tratamento de entrada, escolha da localidade e formatação da resposta. Decisões de rota visíveis em nós IF.
- Nada será ativado ou enviado antes de haver credenciais configuradas e ambiente de teste identificado.

## 3. Ajustes necessários no enunciado

1. `queue` é a variável interna; o parâmetro HTTP correto é `q`.
2. O nome final segue a seção Entrega: `workflow-chatbot-telegram.json`.
3. Preservar espaços entre palavras; retirar espaços excedentes e junto às vírgulas.
4. A OpenWeather não garante filtro de UF brasileira na consulta textual. A geocodificação filtra o estado retornado e fornece coordenadas. A consulta principal usa `q` e um fallback usa apenas coordenadas se a localização textual divergir. Os testes reais da API mostraram que misturar os dois métodos na mesma chamada não resolve a divergência de Florianópolis.
5. A busca geográfica retorna no máximo cinco candidatos. Se não houver correspondência inequívoca, o bot informa erro em vez de responder por outra cidade. Isso limita a promessa de cobertura irrestrita a qualquer cidade.

## 4. Fases

| Fase | Resultado | Verificação |
|---|---|---|
| 1 — Planejamento | Escopo, fluxo e decisões | Comparação com enunciado e documentação oficial |
| 2 — Construção | Workflow importável e infraestrutura | JSON, conexões, parâmetros e configuração Compose |
| 3 — Verificação local | Entrada, rotas e erros simulados | Testes executáveis sobre o código do próprio workflow |
| 4 — Integração | Importação no n8n e teste Telegram/OpenWeather | Três cidades reais e uma inexistente, com evidências |
| 5 — Entrega | JSON exportado, README e repositório público | Revisão de segredos e checklist final |

## 5. Conceitos aplicados

Automação orientada a eventos; API REST e JSON; normalização de dados; validação nas fronteiras; separação de responsabilidades; tratamento de exceções; configuração por ambiente; persistência por volume; testes por cenários e rastreabilidade dos critérios.

Os materiais sincronizados em `sources/` estão vazios nesta sessão. Esses conceitos são aplicáveis ao desafio; não representam uma confirmação do conteúdo específico das aulas.

## 6. Limite da validação

Teste simulado não comprova entrega no Telegram. Publicação e submissão só devem ocorrer após a integração real.
