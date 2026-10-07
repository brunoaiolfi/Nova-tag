/* eslint-env node */
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');

function main() {
  const args = process.argv.slice(2);
  const allowed = ['--provisioning-id', '--output', '--report'];
  const options = {};
  if (args.length % 2) throw new Error('Informe pares de opção e valor.');
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index],
      value = args[index + 1];
    if (
      !allowed.includes(name) ||
      options[name] !== undefined ||
      !value ||
      value.startsWith('--')
    )
      throw new Error(
        'Opção inválida ou repetida. Use --provisioning-id, --output e, opcionalmente, --report.',
      );
    options[name] = value;
  }
  if (!options['--provisioning-id'] || !options['--output'])
    throw new Error(
      'Uso: npm run nfc:profile -- --provisioning-id UUID --output .tmp/perfil.json [--report relatorio.json]',
    );
  const root = path.resolve(__dirname, '..');
  const output = path.resolve(root, options['--output']);
  const reportPath =
    options['--report'] && path.resolve(root, options['--report']);
  if (output === reportPath || fs.existsSync(output))
    throw new Error(
      'O destino precisa ser um arquivo novo; relatórios e planos existentes são preservados.',
    );
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
      '--strict',
      '--skipLibCheck',
      '--rootDir',
      'src',
      '--outDir',
      '.tmp/nfc-profile',
      'src/domain/nfc/sdm-profile.ts',
    ],
    {cwd: root, stdio: 'pipe'},
  );
  const {
    createSdmBenchPlan,
    compareSdmLayout,
  } = require('../.tmp/nfc-profile/domain/nfc/sdm-profile');
  const {
    ndefFileSettings,
  } = require('../.tmp/nfc-profile/domain/nfc/file-settings');
  const {tagVersion} = require('../.tmp/nfc-profile/domain/nfc/type4');
  const plan = createSdmBenchPlan(options['--provisioning-id']);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const artifact = {
    artifactVersion: 1,
    notice:
      'Candidato de bancada. Sem segredos, comandos de escrita ou prova física. O verificador SDM da API valida mensagens; este plano com placeholders não é evidência autenticada.',
    plan,
    messageHex: Buffer.from(plan.messageBytes).toString('hex').toUpperCase(),
    fileHex: Buffer.from(plan.fileBytes).toString('hex').toUpperCase(),
    messageSha256: digest(Buffer.from(plan.messageBytes)),
    planSha256: digest(JSON.stringify(plan)),
  };
  if (reportPath) {
    if (fs.statSync(reportPath).size > 128 * 1024)
      throw new Error('Relatório excede o limite de 128 KiB.');
    const report = JSON.parse(
      fs.readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, ''),
    );
    if (
      report.reportVersion !== 2 ||
      report.version?.value?.compatibleNtag424 !== true
    )
      throw new Error(
        'A comparação exige relatório v2 com declaração NTAG 424 compatível.',
      );
    const settingsHex = report.fileSettings?.value?.rawHex,
      messageHex = report.ndef?.messageHex;
    const bytes = value => {
      if (
        typeof value !== 'string' ||
        value.length > 8192 ||
        !/^(?:[0-9A-Fa-f]{2})+$/.test(value)
      )
        throw new Error('Relatório sem bytes completos para comparação.');
      return [...Buffer.from(value, 'hex')];
    };
    const declaredVersion = tagVersion(
      ['hardwareHex', 'softwareHex', 'productionHex'].map(field =>
        bytes(report.version.value[field]),
      ),
    );
    if (!declaredVersion.compatibleNtag424)
      throw new Error('Os quadros de versão não declaram NTAG 424 compatível.');
    artifact.comparison = compareSdmLayout(
      plan,
      ndefFileSettings(bytes(settingsHex)),
      bytes(messageHex),
    );
    if (
      report.ndef.file?.fileId !== 0xe104 ||
      report.ndef.file?.maximumFileSize !== 256 ||
      report.ndef.file?.readAccess !== 0
    ) {
      artifact.comparison.differences.push(
        'ARQUIVO_OU_CAPACIDADE_CC_DIVERGENTE',
      );
      artifact.comparison.layoutMatches = false;
    }
    artifact.reportSha256 = digest(fs.readFileSync(reportPath));
    if (
      typeof report.uid !== 'string' ||
      !/^(?:[0-9A-F]{2}){4,10}$/.test(report.uid) ||
      typeof report.capturedAt !== 'string' ||
      !Number.isFinite(Date.parse(report.capturedAt))
    )
      throw new Error('Relatório sem UID/data válidos.');
    const device = {};
    for (const field of [
      'platform',
      'osVersion',
      'appVersion',
      'nativeBuild',
    ]) {
      const value = report.device?.[field];
      if (typeof value !== 'string' || !value || value.length > 100)
        throw new Error('Relatório sem identificação do aparelho/build.');
      device[field] = value;
    }
    artifact.observedIdentity = {
      uid: report.uid,
      capturedAt: report.capturedAt,
      device,
    };
  }
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n', {
    flag: 'wx',
  });
  console.log(
    'Perfil candidato salvo; nenhum chip, vínculo ou contador foi alterado.',
  );
  if (artifact.comparison) {
    console.log(
      artifact.comparison.layoutMatches
        ? 'Layout corresponde; autenticidade e aceite físico não verificados.'
        : 'Layout divergente: ' + artifact.comparison.differences.join(', '),
    );
    if (!artifact.comparison.layoutMatches) process.exitCode = 2;
  }
}
try {
  main();
} catch (error) {
  console.error(
    error instanceof Error && !error.stdout
      ? error.message
      : 'Não foi possível gerar o perfil. Confira opções, compilação e relatório.',
  );
  process.exitCode = 1;
}
