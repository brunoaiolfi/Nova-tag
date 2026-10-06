/* eslint-env node */
const fs = require('node:fs');
const path = require('node:path');
const file = process.env.OFFLINE_ACCEPTANCE_FILE;
if (!file)
  throw new Error(
    'Defina OFFLINE_ACCEPTANCE_FILE com fixture privada da API isolada.',
  );
const fixture = JSON.parse(
  fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, ''),
);
const url = new URL(fixture.baseUrl);
if (
  fixture.synthetic !== true ||
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  url.port !== '3114' ||
  url.pathname !== '/api/v1'
) {
  throw new Error(
    'Este harness exige fixture sintética e API local isolada na porta 3114.',
  );
}
module.exports = {
  expo: {
    name: 'Aceite offline (sintético)',
    slug: 'nova-tag-offline-acceptance',
    scheme: 'novatag',
    sdkVersion: '57.0.0',
    platforms: ['android'],
    extra: {offlineAcceptance: fixture},
  },
};
