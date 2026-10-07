const fs = require('node:fs');
const path = require('node:path');
const {identity, sha256} = require('./source-identity.cjs');
const {apkIdentity} = require('./apk-identity.cjs');
const output = process.argv[2];
const apk = process.argv[3];
try {
  if (!output) throw Error('Use source:manifest -- ARQUIVO_NOVO [APK].');
  const configuration = require('../app.json').expo;
  const source = identity(path.resolve(__dirname, '..'), 'mobile');
  const embedded = apk ? apkIdentity(apk) : null;
  fs.writeFileSync(
    path.resolve(output),
    JSON.stringify(
      {
        schemaVersion: 1,
        status: 'CANDIDATO_NAO_ACEITO_FISICAMENTE',
        source,
        appVersion: configuration.version,
        androidVersionCode: configuration.android.versionCode,
        iosBuildNumber: configuration.ios.buildNumber,
        apk: apk
          ? {
              name: path.basename(apk),
              sha256: sha256(fs.readFileSync(apk)),
              association:
                'DECLARADA_REQUER_LOG_DE_BUILD_E_ACEITE_DE_INSTALACAO',
              embedded,
              embeddedSourceMatchesCheckout:
                embedded.jsSource?.sourceSha256 === source.sourceSha256,
            }
          : null,
      },
      null,
      2,
    ) + '\n',
    {flag: 'wx'},
  );
  process.stdout.write(
    'Manifesto público candidato criado; sem valores de ambiente/credenciais.\n',
  );
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
