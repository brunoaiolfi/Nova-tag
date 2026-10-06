// Local acceptance helper for this explicitly synthetic Android test entrypoint.
const {execFileSync} = require('node:child_process');
const adb = (...args) =>
  execFileSync(process.env.ADB ?? 'adb', args, {
    encoding: 'utf8',
    timeout: 30000,
  });
const decode = text =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
function ui() {
  adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/offline-ui.xml');
  const xml = adb('shell', 'cat', '/sdcard/offline-ui.xml');
  return [...xml.matchAll(/<node\b([^>]+)>?/g)].map(match =>
    Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)=("([^"]*)"|'([^']*)')/g)].map(item => [
        item[1],
        decode(item[3] ?? item[4]),
      ]),
    ),
  );
}
const [action = 'status', label] = process.argv.slice(2);
if (action === 'tap') {
  if (!label) throw new Error('Informe o rótulo observado no harness.');
  for (let attempt = 0; attempt < 8; attempt++) {
    const node = ui().find(item => item['content-desc'] === label);
    const bounds = node?.bounds?.match(/\d+/g)?.map(Number);
    if (bounds && bounds[3] - bounds[1] >= 70) {
      adb(
        'shell',
        'input',
        'tap',
        String(Math.floor((bounds[0] + bounds[2]) / 2)),
        String(Math.floor((bounds[1] + bounds[3]) / 2)),
      );
      console.log(JSON.stringify({action: 'tap', label}));
      process.exit(0);
    }
    adb('shell', 'input', 'swipe', '540', '1950', '540', '850', '300');
  }
  throw new Error('Botão não encontrado no harness: ' + label);
} else if (action === 'status') {
  let node = ui().find(item => item['content-desc'] === 'native-status');
  for (let attempt = 0; !node && attempt < 8; attempt++) {
    adb('shell', 'input', 'swipe', '540', '850', '540', '1950', '300');
    node = ui().find(item => item['content-desc'] === 'native-status');
  }
  if (!node)
    throw new Error(
      'Harness não está pronto. Confira Metro e a tela do Android.',
    );
  console.log(node.text);
} else throw new Error('Use status ou tap <rótulo>.');
