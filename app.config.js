const configuration = require('./app.json').expo;
const {identity} = require('./scripts/source-identity.cjs');
const source = identity(__dirname, 'mobile');

// Public source identity for this JS/config load; never read .env or export secrets.
// Development client metadata can change with Metro and is distinct from native build identity.
module.exports = {
  ...configuration,
  extra: {
    ...configuration.extra,
    reproducibility: {
      schemaVersion: 1,
      revision: source.revision,
      revisionSource: source.revisionSource,
      sourceSha256: source.sourceSha256,
      lockSha256: source.lockSha256,
      trackedChanges: source.trackedChanges,
    },
  },
};
