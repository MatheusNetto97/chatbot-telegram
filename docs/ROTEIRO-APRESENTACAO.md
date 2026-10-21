# Roteiro de apresentação — ClimaBot Telegram

Use este roteiro como apoio para uma demonstração de aproximadamente cinco minutos. Ajuste as falas ao que você executou e consegue explicar.

## 1. Apresentar o problema

“O bot recebe uma cidade e uma UF pelo Telegram, consulta a OpenWeather e devolve a temperatura atual em Celsius. A entrada segue o formato Cidade,UF,BR.”

Mostre uma entrada, como `Curitiba,PR,BR`, e explique o resultado esperado sem antecipar um valor fixo de temperatura.

## 2. Mostrar o workflow completo

Percorra o canvas na ordem da execução:

1. O Telegram Trigger recebe a solicitação.
2. A entrada é normalizada e validada.
3. A cidade é localizada e comparada com a UF informada.
4. O HTTP Request consulta o clima.
5. A resposta passa por validação de status e campos.
6. O Telegram recebe a temperatura ou uma orientação de erro.

Comparação útil para quem conhece RPA: o gatilho inicia o trabalho como um item recebido em uma fila, mas a integração usa API, sem navegação em uma página. Os nós IF deixam os caminhos de decisão visíveis.

## 3. Explicar duas escolhas de implementação

**Separação de responsabilidades:** a validação da entrada fica antes da consulta. O nó que formata a mensagem não decide se uma cidade é válida. Isso facilita localizar uma falha durante a execução.

**Nomes claros:** `chatId` indica o destino da resposta; `queue` guarda a consulta normalizada por exigência do enunciado. Na URL da OpenWeather o parâmetro correto é `q`. Use os nomes efetivamente presentes na versão final para explicar as demais variáveis.

Sobre a UF: a documentação da OpenWeather não garante filtro de estados brasileiros na consulta textual. Por isso, a localização é conferida antes da consulta do clima. Se não houver correspondência segura, o bot retorna erro.

## 4. Explicar a infraestrutura

“O n8n e o executor dos nós Code rodam em contêineres separados, com a mesma versão definida. A rede e o volume são exclusivos do projeto. O volume mantém workflows e credenciais entre reinicializações. O editor fica na porta local 5682 e o túnel fornece o HTTPS que o Telegram exige para o webhook.”

Mostre o estado do serviço, sem exibir `.env` ou tokens. Explique que o túnel aponta para um gateway que libera somente os webhooks. O editor e a API interna ficam bloqueados no acesso público; o túnel será encerrado após o teste.

“A OpenWeather usa configuração de ambiente. O Telegram usa uma credencial cadastrada no cofre do n8n. Os segredos não entram no JSON de entrega.”

## 5. Demonstrar sucesso e erro

Envie uma cidade válida pelo Telegram e acompanhe o caminho até o envio da resposta. Depois envie `CidadeInexistenteXYZ,SP,BR` e mostre o ramo de erro.

Confira as três cidades obrigatórias durante a validação completa, mesmo que o vídeo mostre apenas parte dos cenários. Se um teste falhar, apresente a falha como pendência e corrija antes de afirmar que a entrega está concluída.

## 6. Fechar com a entrega verificável

Mostre `workflow-chatbot-telegram.json`, `README.md` e o guia de importação. Se o repositório já estiver público, abra o endereço e confirme que os arquivos estão disponíveis.

Explique que Gemini é opcional e não faz parte desta versão: o dado vem da API e a mensagem é montada de forma determinística. Evitar um modelo de linguagem aqui reduz configuração, dependências e variação na resposta.

## Perguntas que você deve conseguir responder

- Por que preservar o `chatId` original durante as chamadas HTTP?
- O que acontece com uma entrada sem UF ou com um sticker?
- Por que Celsius usa `units=metric`?
- Qual é a diferença entre erro HTTP e JSON sem os campos esperados?
- Por que o bot precisa de HTTPS público se o editor abre em localhost?
- O que o volume conserva e o que ocorre se ele for removido?
- Por que modo de teste e modo publicado não devem disputar o mesmo bot?
- Qual evidência comprova que a mensagem chegou ao Telegram?

Na apresentação, acompanhe o caminho de uma mensagem e explique cada decisão observando a execução no canvas.
