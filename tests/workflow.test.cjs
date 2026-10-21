// Testa o código e as expressões do JSON entregue, sem duplicar a lógica de negócio.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflow-chatbot-telegram.json'), 'utf8'));
const node = name => workflow.nodes.find(item => item.name === name);
const run = (name, data, previous = {}) => vm.runInNewContext(
  `(function () { ${node(name).parameters.jsCode}\n })()`,
  { $json: data, $: name => ({ item: { json: previous[name] } }) },
  { timeout: 1000 },
).json;
let checks = 0;
function check(name, test) { test(); checks++; console.log(`OK ${name}`); }
function input(rawText) { return run('Normalizar entrada', { rawText, chatId: '10001' }); }
const saoPaulo = input(' São  Paulo , sp , br ');
const geoBody = [{ name: 'São Paulo', local_names: { pt: 'São Paulo' }, state: 'São Paulo', country: 'BR', lat: -23.55, lon: -46.63 }];
function geo(body = geoBody, statusCode = 200, request = saoPaulo) {
  return run('Selecionar cidade', { body, statusCode }, { 'Normalizar entrada': request });
}
const location = geo();
function weather(body, statusCode = 200) {
  return run('Preparar resposta', { body, statusCode }, { 'Selecionar cidade': location });
}
const validWeather = { cod: 200, name: 'São Paulo', main: { temp: 24.7 }, sys: { country: 'BR' }, coord: { lat: -23.55, lon: -46.63 } };

check('São Paulo: acentos, caixa e espaços', () => {
  assert.equal(saoPaulo.queue, 'sao paulo,sp,br'); assert.equal(saoPaulo.inputValid, true); assert.equal(saoPaulo.chatId, '10001');
});
check('Belo Horizonte preserva espaço interno', () => assert.equal(input('Belo Horizonte,MG,BR').queue, 'belo horizonte,mg,br'));
check('Florianópolis normaliza acento', () => assert.equal(input('Florianópolis,SC,BR').queue, 'florianopolis,sc,br'));
for (const text of ['', 'São Paulo', 'São Paulo,SP', 'São Paulo,XX,BR', 'São Paulo,SP,PT', 'São Paulo,SP,BR,extra', '123,SP,BR', '<b>São Paulo</b>,SP,BR', 'a'.repeat(121) + ',SP,BR']) {
  check(`Entrada inválida: ${text.slice(0, 35) || '(vazia)'}`, () => assert.equal(input(text).inputValid, false));
}
check('Mídia sem texto gera orientação', () => assert.equal(input(undefined).inputValid, false));
check('/start apresenta o formato', () => assert.match(input('/start').message, /Cidade,UF,BR/));
check('/help com nome do bot', () => assert.match(input('/help@climabot').message, /Cidade,UF,BR/));
check('Cidade e estado corretos selecionam coordenadas', () => { assert.equal(location.locationFound, true); assert.equal(location.latitude, -23.55); });
check('Nome local em português pode identificar a cidade', () => assert.equal(geo([{ ...geoBody[0], name: 'Sao Paolo' }]).locationFound, true));
check('UF errada não escolhe homônimo', () => assert.equal(geo([{ ...geoBody[0], state: 'Rio de Janeiro' }]).locationFound, false));
check('Cidade de nome diferente é rejeitada', () => assert.equal(geo([{ ...geoBody[0], name: 'Santos', local_names: {} }]).locationFound, false));
check('País incorreto é rejeitado', () => assert.equal(geo([{ ...geoBody[0], country: 'PT' }]).locationFound, false));
check('Coordenada inválida é rejeitada', () => assert.equal(geo([{ ...geoBody[0], lat: 100 }]).locationFound, false));
check('Dois candidatos exatos não escolhem arbitrariamente', () => assert.equal(geo([...geoBody, { ...geoBody[0], lat: -23.8 }]).locationFound, false));
check('Nome localizado português distingue candidato principal de homônimo', () => {
  const result = geo([...geoBody, { ...geoBody[0], local_names: {}, lat: -17.3 }]);
  assert.equal(result.locationFound, true); assert.equal(result.latitude, geoBody[0].lat);
});
check('Cidade inexistente retorna mensagem exigida', () => assert.match(geo([]).message, /^❌ Cidade não encontrada\./));
for (const status of [401, 429, 500]) check(`Geocoding HTTP ${status}`, () => assert.match(geo({}, status).message, /indisponível/));
check('Geocoding timeout segue erro', () => assert.equal(run('Selecionar cidade', { error: 'timeout' }, { 'Normalizar entrada': saoPaulo }).locationFound, false));
check('Sucesso arredonda e preserva chat', () => { const result = weather(validWeather); assert.equal(result.responseValid, true); assert.equal(result.message, '🌤️ A temperatura em São Paulo é de 25°C.'); assert.equal(result.chatId, saoPaulo.chatId); });
check('Zero graus é temperatura válida', () => assert.equal(weather({ ...validWeather, main: { temp: 0 } }).responseValid, true));
check('Temperatura negativa', () => assert.match(weather({ ...validWeather, main: { temp: -2.6 } }).message, /-3°C/));
for (const temp of [null, '25', NaN, Infinity]) check(`Temperatura inválida ${String(temp)}`, () => assert.equal(weather({ ...validWeather, main: { temp } }).responseValid, false));
check('Payload sem temperatura', () => assert.equal(weather({ cod: 200 }).responseValid, false));
check('Payload inválido HTTP 200 usa mensagem exigida', () => assert.match(weather({ cod: 200 }).message, /^❌ Cidade não encontrada/));
check('Payload geográfico inválido HTTP 200 usa mensagem exigida', () => assert.match(geo({}).message, /^❌ Cidade não encontrada/));
check('País divergente no clima', () => assert.equal(weather({ ...validWeather, sys: { country: 'AR' } }).responseValid, false));
check('Clima de coordenadas divergentes', () => assert.equal(weather({ ...validWeather, coord: { lat: -10, lon: -46.63 } }).responseValid, false));
check('HTTP de falha não é aceito com payload válido', () => assert.equal(weather(validWeather, 500).responseValid, false));
check('Erro de cidade usa mensagem do enunciado', () => assert.match(weather({ cod: '404' }, 404).message, /^❌ Cidade não encontrada/));
check('Timeout clima preserva chat', () => { const result = run('Preparar resposta', { error: 'timeout' }, { 'Selecionar cidade': location }); assert.equal(result.chatId, saoPaulo.chatId); assert.equal(result.responseValid, false); });
check('Três cidades simuladas atravessam o processamento', () => {
  for (const [name, stateCode, stateName, lat, lon] of [['São Paulo','SP','São Paulo',-23.55,-46.63],['Belo Horizonte','MG','Minas Gerais',-19.92,-43.94],['Florianópolis','SC','Santa Catarina',-27.59,-48.55]]) {
    const request = input(`${name},${stateCode},BR`);
    const selected = geo([{ name, state: stateName, country: 'BR', lat, lon }], 200, request);
    assert.equal(selected.locationFound, true);
    const result = run('Preparar resposta', { statusCode: 200, body: { ...validWeather, coord: { lat, lon } } }, { 'Selecionar cidade': selected });
    assert.equal(result.responseValid, true); assert.match(result.message, new RegExp(name));
  }
});
check('Conexões apontam para nós existentes', () => {
  const names = new Set(workflow.nodes.map(item => item.name));
  assert.equal(names.size, workflow.nodes.length);
  for (const [name, outputs] of Object.entries(workflow.connections)) { assert.ok(names.has(name)); for (const output of outputs.main) for (const edge of output) assert.ok(names.has(edge.node)); }
});
check('Expressões IF funcionam para ambos os ramos', () => {
  for (const [name, field] of [['Entrada válida?', 'inputValid'], ['Localidade encontrada?', 'locationFound'], ['Resposta válida?', 'responseValid']]) {
    const expression = node(name).parameters.conditions.conditions[0].leftValue;
    for (const value of [true, false]) assert.equal(vm.runInNewContext(expression.slice(3, -2).trim(), { $json: { [field]: value } }), value);
    assert.equal(workflow.connections[name].main.length, 2);
  }
});
check('HTTP usa variável de ambiente e contrato exigido', () => {
  const http = node('Consultar temperatura').parameters;
  const params = Object.fromEntries(http.queryParameters.parameters.map(item => [item.name, item.value]));
  assert.equal(http.url, 'https://api.openweathermap.org/data/2.5/weather');
  assert.equal(params.q, '={{ $json.queue }}'); assert.equal(params.appid, '={{ $env.OPENWEATHER_API_KEY }}');
  assert.equal(params.units, 'metric'); assert.equal(params.lang, 'pt_br');
  const fallback = node('Consultar clima por coordenadas').parameters.queryParameters.parameters;
  assert.ok(fallback.some(param => param.name === 'lat')); assert.ok(fallback.some(param => param.name === 'lon'));
  assert.equal(fallback.some(param => param.name === 'q'), false);
});
check('Fallback geográfico ocorre em divergência ou 404, sem repetir 401/429', () => {
  const expression = node('Consultar por coordenadas?').parameters.conditions.conditions[0].leftValue.slice(3, -2).trim();
  for (const [data, expected] of [[{statusCode: 200, body: validWeather}, false], [{statusCode: 200, body: {...validWeather, coord: {lat: -27, lon: -48}}}, true], [{statusCode: 404}, true], [{statusCode: 401}, false], [{statusCode: 429}, false]]) {
    const value = vm.runInNewContext(expression, {$json: data, $: () => ({item:{json:location}})});
    assert.equal(value, expected);
  }
});
check('JSON sem credenciais, dados fixados e ativo desligado', () => {
  assert.equal(workflow.active, false); assert.deepEqual(workflow.pinData, {});
  for (const item of workflow.nodes) { assert.equal(item.credentials, undefined); assert.equal(item.type.includes('langchain'), false); }
  const serialized = JSON.stringify(workflow);
  assert.equal(/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/.test(serialized), false);
  for (const item of workflow.nodes.filter(item => item.type.endsWith('.httpRequest'))) assert.equal(item.parameters.queryParameters.parameters.find(param => param.name === 'appid').value, '={{ $env.OPENWEATHER_API_KEY }}');
});
console.log(`\n${checks} verificações locais passaram. Sem chamadas externas; não comprova a integração Telegram/OpenWeather.`);
