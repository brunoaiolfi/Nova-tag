import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {createSdmBenchPlan} from '../src/domain/nfc/sdm-profile';

const root = path.resolve(__dirname, '..');
const folder = path.join(root, '.tmp', 'sdm-cli-tests', randomUUID());
const id = '11111111-2222-4333-8444-555555555555';
const script = path.join(root, 'scripts/nfc-profile.cjs');
const plan = createSdmBenchPlan(id);
const output = (name: string) => path.join(folder, name + '.json');
beforeAll(() => fs.mkdirSync(folder, {recursive: true}));

function report(name: string, change?: (value: any) => void) {
  // Entire report is a synthetic bridge/protocol fixture, not hardware acceptance.
  const value = {
    reportVersion: 2,
    uid: '04968CAA5C5E80',
    capturedAt: '2026-10-06T12:00:00.000Z',
    device: {
      platform: 'ios',
      osVersion: '26',
      appVersion: '0.2.0',
      nativeBuild: '2',
      extra: 'must-not-copy',
    },
    version: {
      value: {
        compatibleNtag424: true,
        hardwareHex: '04040830001105',
        softwareHex: '04040201011105',
        productionHex: '04968CAA5C5E80CD65935D402118',
      },
    },
    ndef: {
      messageHex: Buffer.from(plan.messageBytes).toString('hex'),
      file: {fileId: 0xe104, maximumFileSize: 256, readAccess: 0},
    },
    fileSettings: {value: plan.expectedSettings},
  };
  change?.(value);
  fs.writeFileSync(output(name), JSON.stringify(value));
  return output(name);
}
const run = (name: string, file?: string) =>
  spawnSync(
    process.execPath,
    [
      script,
      '--provisioning-id',
      id,
      '--output',
      output(name),
      ...(file ? ['--report', file] : []),
    ],
    {cwd: root, encoding: 'utf8'},
  );

test('offline CLI generates deterministic hashes and compares structural data without accepting synthetic evidence', () => {
  const generated = run('generated');
  expect(generated.status).toBe(0);
  const artifact = JSON.parse(fs.readFileSync(output('generated'), 'utf8'));
  expect(artifact.plan).toEqual(plan);
  expect(artifact.messageSha256).toBe(
    createHash('sha256').update(Buffer.from(plan.messageBytes)).digest('hex'),
  );
  expect(artifact.comparison).toBeUndefined();
  const compared = run('compared', report('synthetic-matching'));
  expect(compared.status).toBe(0);
  const result = JSON.parse(fs.readFileSync(output('compared'), 'utf8'));
  expect(result.comparison).toMatchObject({
    layoutMatches: true,
    authenticated: false,
    physicallyAccepted: false,
  });
  expect(result.observedIdentity.device.extra).toBeUndefined();
  expect(result.reportSha256).toHaveLength(64);
}, 20000);

test('divergence persists a reviewable comparison and returns exit code 2', () => {
  const fixture = report('synthetic-divergent', value => {
    value.fileSettings.value = {
      ...plan.expectedSettings,
      rawHex: '0000F0E0000100',
    };
    value.ndef.file.fileId = 0xe105;
  });
  const result = run('divergent', fixture);
  expect(result.status).toBe(2);
  const artifact = JSON.parse(fs.readFileSync(output('divergent'), 'utf8'));
  expect(artifact.comparison.differences).toEqual([
    'PERMISSOES_OU_OFFSETS_DIVERGENTES',
    'ARQUIVO_OU_CAPACIDADE_CC_DIVERGENTE',
  ]);
  expect(artifact.comparison.physicallyAccepted).toBe(false);
}, 10000);

test('old or falsely labeled model reports do not produce a comparison artifact', () => {
  const fixture = report('synthetic-unknown', value => {
    value.version.value.hardwareHex = '53040830001105';
  });
  const result = run('unknown', fixture);
  expect(result.status).toBe(1);
  expect(fs.existsSync(output('unknown'))).toBe(false);
  const old = report('synthetic-old', value => {
    value.reportVersion = 1;
  });
  expect(run('old', old).status).toBe(1);
  expect(fs.existsSync(output('old'))).toBe(false);
}, 10000);

test('existing files and unsupported key/epoch/duplicate arguments remain rejected', () => {
  const destination = output('preserved');
  fs.writeFileSync(destination, 'preserve this evidence');
  expect(run('preserved').status).toBe(1);
  expect(fs.readFileSync(destination, 'utf8')).toBe('preserve this evidence');
  for (const option of ['--key', '--epoch', '--provisioning-id']) {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          script,
          '--provisioning-id',
          id,
          '--output',
          output('bad'),
          option,
          'do-not-accept',
        ],
        {cwd: root, stdio: 'pipe'},
      ),
    ).toThrow();
  }
  expect(fs.existsSync(output('bad'))).toBe(false);
});
