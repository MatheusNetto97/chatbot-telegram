// Consultas reais da OpenWeather, sem envio ao Telegram e sem exibir a chave.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const values = {};
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  if (line.trim().startsWith('#') || !line.includes('=')) continue;
  const split = line.indexOf('=');
  values[line.slice(0, split).trim()] = line.slice(split + 1).trim().replace(/^['"]|['"]$/g, '');
}
if (!values.OPENWEATHER_API_KEY) throw new Error('Configure OPENWEATHER_API_KEY no .env privado.');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflow-chatbot-telegram.json'), 'utf8'));
const node = name => workflow.nodes.find(item => item.name === name);
function run(name, data, previous = {}) {
  return vm.runInNewContext(`(function(){${node(name).parameters.jsCode}\n})()`, {
    $json: data, $: name => ({item: {json: previous[name]}}),
  }, {timeout: 1000}).json;
}
async function request(endpoint, parameters) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  url.searchParams.set('appid', values.OPENWEATHER_API_KEY);
  const response = await fetch(url, {signal: AbortSignal.timeout(20000)});
  return {statusCode: response.status, body: await response.json()};
}
(async () => {
  const results = [];
  const cases = ['São Paulo,SP,BR', 'Belo Horizonte,MG,BR', 'Florianópolis,SC,BR', 'CidadeInexistenteXYZ,SP,BR'];
  for (const entry of cases) {
    let result;
    try {
      const input = run('Normalizar entrada', {rawText: entry, chatId: 'synthetic-api-only'});
      const geo = await request('https://api.openweathermap.org/geo/1.0/direct', {q: input.queue.split(',')[0] + ',br', limit: '5'});
      const city = run('Selecionar cidade', geo, {'Normalizar entrada': input});
      if (city.locationFound) {
        let weather = await request('https://api.openweathermap.org/data/2.5/weather', {q: city.queue, units: 'metric', lang: 'pt_br'});
        const expression = node('Consultar por coordenadas?').parameters.conditions.conditions[0].leftValue.slice(3, -2).trim();
        const coordinateFallback = vm.runInNewContext(expression, {$json: weather, $: () => ({item: {json: city}})});
        if (coordinateFallback) {
          weather = await request('https://api.openweathermap.org/data/2.5/weather', {lat: city.latitude, lon: city.longitude, units: 'metric', lang: 'pt_br'});
        }
        const output = run('Preparar resposta', weather, {'Selecionar cidade': city});
        result = {entry, geocodingStatus: geo.statusCode, weatherStatus: weather.statusCode, coordinateFallback, responseValid: output.responseValid, message: output.message, passed: output.responseValid};
      } else {
        result = {entry, geocodingStatus: geo.statusCode, locationFound: false, message: city.message, passed: entry === cases[3] && geo.statusCode === 200};
      }
    } catch (error) {
      result = {entry, errorType: error.name, passed: false};
    }
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const report = {executedAt: new Date().toISOString(), scope: 'Consultas OpenWeather reais e código do JSON fora do n8n; sem mensagens Telegram.', results};
  fs.writeFileSync(path.join(root, 'docs/RESULTADOS-API.json'), JSON.stringify(report, null, 2) + '\n');
  process.exitCode = results.every(result => result.passed) ? 0 : 1;
})();
