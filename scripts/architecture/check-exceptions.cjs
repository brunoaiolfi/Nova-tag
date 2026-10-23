const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const fingerprint = item =>
  JSON.stringify([item.rule, item.from, item.to, item.statement]);
function additions(previous, current) {
  const known = new Set(previous.map(fingerprint));
  return current.filter(item => !known.has(fingerprint(item)));
}

function main() {
  const root = path.resolve(__dirname, '../..');
  const base = process.env.ARCHITECTURE_BASE || 'HEAD';
  if (base !== 'HEAD' && !/^[0-9a-f]{40}$/i.test(base)) {
    throw Error('ARCHITECTURE_BASE deve ser um SHA Git completo.');
  }
  const run = args =>
    spawnSync('git', ['-C', root, ...args], {encoding: 'utf8', shell: false});
  if (run(['rev-parse', '--verify', `${base}^{commit}`]).status !== 0) {
    throw Error(
      'Base Git indisponível; obtenha o histórico antes de verificar exceções.',
    );
  }
  const relative = 'scripts/architecture/exceptions.json';
  const current = JSON.parse(
    fs.readFileSync(path.join(root, relative), 'utf8'),
  );
  const previous = run(['show', `${base}:${relative}`]);
  if (previous.status !== 0) {
    // Only the initial introduction has no older inventory to compare with.
    process.stdout.write(
      `Inventário inicial: ${current.length} exceções exigem revisão no primeiro PR. A base ${base} ainda não possui a política.\n`,
    );
    return;
  }
  const extra = additions(JSON.parse(previous.stdout), current);
  if (extra.length) {
    for (const item of extra) {
      process.stderr.write(
        `${item.from}:1:1 ARCH014 Nova exceção proibida em relação à base ${base}. Corrija a dependência; não amplie o inventário.\n  ${item.statement}\n`,
      );
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(
      'Inventário de exceções não cresceu em relação à base Git.\n',
    );
  }
}

module.exports = {additions};
if (require.main === module) {
  main();
}
