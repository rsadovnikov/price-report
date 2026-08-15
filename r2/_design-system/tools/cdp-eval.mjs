#!/usr/bin/env node
// Выполнить произвольный JS во вкладке служебного Chrome по CDP и напечатать результат.
// Нужен для закрытых ресурсов (сторибук кита), куда обычные инструменты не ходят.
//
//   node cdp-eval.mjs <подстрокаURL|-> <файл-с-выражением> [порт] [--nav <url>]
//
// Файл с выражением — тело async-функции: пишем `return ...`, не голое выражение.
// Возврат строкой печатается как есть, объект — через JSON.stringify.
//
// Предусловия и рецепты съёма контракта — в ../prod-parity.md («Как ходим в витрину»).
// Служебный Chrome: --remote-debugging-port=9222 --user-data-dir="$HOME/cdp-chrome"
// Свою вкладку не занимать: curl -s -X PUT "http://localhost:9222/json/new?<url>"
const [, , match, exprFile, portArg] = process.argv;
const port = portArg && /^\d+$/.test(portArg) ? portArg : '9222';
const navIdx = process.argv.indexOf('--nav');
const navUrl = navIdx > -1 ? process.argv[navIdx + 1] : null;
const fs = await import('node:fs');
const expression = fs.readFileSync(exprFile, 'utf8');

const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
const pages = tabs.filter(t => t.type === 'page');
const page = match === '-' ? pages[0] : pages.find(t => (t.url || '').includes(match)) || pages[0];
if (!page) { console.error('no page tab'); process.exit(3); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const events = [];
const send = (method, params = {}) => new Promise(res => {
  const _id = ++id; pending.set(_id, res); ws.send(JSON.stringify({ id: _id, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) events.push(m.method);
};
ws.onerror = e => { console.error('WS ERROR', e.message || e); process.exit(1); };
ws.onopen = async () => {
  await send('Page.enable');
  await send('Runtime.enable');
  if (navUrl) {
    await send('Page.navigate', { url: navUrl });
    for (let i = 0; i < 40; i++) { if (events.includes('Page.loadEventFired')) break; await sleep(500); }
    await sleep(4000);
  }
  const r = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`,
    returnByValue: true, awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    console.error('EVAL ERROR:', JSON.stringify(r.result.exceptionDetails, null, 2).slice(0, 3000));
    process.exit(1);
  }
  const v = r.result?.result?.value;
  console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  process.exit(0);
};
setTimeout(() => { console.error('timeout'); process.exit(2); }, 90000);
