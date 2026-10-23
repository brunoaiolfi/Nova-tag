const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const {ESLint} = require('eslint');
const ts = require('typescript');
const {analyze, applyExceptions, readProject} = require('./check.cjs');
const exceptions = require('./exceptions.json');
const {additions} = require('./check-exceptions.cjs');
const root = path.resolve(__dirname, '../..');

function probe(file, code, extra = {}, compilerOptions = {}) {
  return analyze({root, files: {[file]: code, ...extra}, compilerOptions});
}
const domain = 'src/domain/probe.ts';
const app = 'src/appplication/probe.ts';
const adapter = 'src/infra/adapter.ts';
const value = 'export const value = 1;';

for (const code of [
  'export function validate() { return true; }',
  'export class Failure extends Error {}',
  'export enum State { Ready }',
  'export const state = initialize();',
  "export {value} from './probe';",
  "export * from './probe';",
  "import {value} from './probe'; export type T = typeof value;",
  "import './probe';",
  'export namespace Types { export const value = 1; }',
]) {
  test(`declarative types reject runtime: ${code}`, () => {
    assert.ok(
      probe('src/domain/probe.types.ts', code, {[domain]: value}).some(
        issue => issue.rule === 'ARCH015',
      ),
    );
  });
}
test('declarative types accept type imports, reexports and contracts', () => {
  assert.deepEqual(
    probe(
      'src/domain/types.ts',
      "import type {T} from './probe'; export type {T} from './probe'; export interface Port { send(value: T): Promise<void> } export type State = T | null;",
      {[domain]: 'export type T = string;'},
    ),
    [],
  );
});
test('domain policies can retain legitimate conditional behavior outside types files', () => {
  assert.deepEqual(
    probe(
      domain,
      'export function permitted(role: string) { if (role === "ADMINISTRADOR") return true; return false; }',
    ),
    [],
  );
});

for (const [label, code] of [
  ['import', "import {value} from '../infra/adapter';"],
  ['type-only import', "import type {value} from '../infra/adapter';"],
  ['reexport', "export {value} from '../infra/adapter';"],
  ['star reexport', "export * from '../infra/adapter';"],
  ['dynamic import', "const load = () => import('../infra/adapter');"],
  ['require', "const value = require('../infra/adapter');"],
  ['import equals', "import value = require('../infra/adapter');"],
  ['type query', "type Value = typeof import('../infra/adapter');"],
]) {
  test(`domain rejects infrastructure through ${label}`, () => {
    assert.ok(
      probe(domain, code, {[adapter]: value}).some(
        issue => issue.rule === 'ARCH001',
      ),
    );
  });
}

test('domain cannot depend on application even through a type-only barrel', () => {
  assert.equal(
    probe(domain, "export type {value} from '../appplication/probe';", {
      [app]: value,
    })[0].rule,
    'ARCH001',
  );
});
for (const module of [
  'react',
  'react-native',
  'expo-crypto',
  'node:fs',
  'axios',
]) {
  test(`core rejects external technology ${module}`, () => {
    assert.equal(
      probe(domain, `import type {Value} from '${module}';`)[0].rule,
      'ARCH001',
    );
    assert.equal(probe(app, `import '${module}';`)[0].rule, 'ARCH002');
  });
}
test('application can use domain and local ports, adapters can implement application ports', () => {
  assert.deepEqual(
    probe(app, "import {value} from '../domain/probe';", {
      [domain]: value,
      [adapter]: "import type {value} from '../appplication/probe';",
    }),
    [],
  );
});
test('aliases resolve to the actual layer instead of bypassing boundaries', () => {
  const compilerOptions = {baseUrl: root, paths: {'@/*': ['src/*']}};
  assert.equal(
    probe(
      domain,
      "import {value} from '@/infra/adapter';",
      {[adapter]: value},
      compilerOptions,
    )[0].rule,
    'ARCH001',
  );
});
test('application spelling after a future rename has the same rules', () => {
  assert.equal(
    probe(
      'src/application/probe.ts',
      "import {value} from '../infra/adapter';",
      {[adapter]: value},
    )[0].rule,
    'ARCH002',
  );
});
test('unresolved relative imports and paths outside src fail closed', () => {
  assert.equal(probe(domain, "export * from './missing';")[0].rule, 'ARCH009');
  assert.equal(
    probe(app, "const helper = require('../../package.json');")[0].rule,
    'ARCH009',
  );
});
for (const code of [
  'import(moduleName);',
  'require(moduleName);',
  'module.require(moduleName);',
  "module['require'](moduleName);",
  "require.resolve('react');",
  'const load = require;',
  "require.bind(null, 'react');",
]) {
  test(`nontransparent loader rejected: ${code}`, () => {
    assert.ok(probe(adapter, code).some(issue => issue.rule === 'ARCH008'));
  });
}
test('shared UI cannot import a feature, a screen, or an adapter', () => {
  for (const target of [
    'components/Tracking/button',
    'views/Order/index',
    'infra/adapter',
  ]) {
    const filename = `src/${target}.ts`;
    assert.equal(
      probe('src/components/ui/button.ts', `export * from '../../${target}';`, {
        [filename]: value,
      })[0].rule,
      'ARCH004',
    );
  }
});
test('feature components cannot depend on screens and screens cannot pick adapters', () => {
  const screen = 'src/views/Order/index.ts';
  assert.equal(
    probe(
      'src/components/Tracking/item.ts',
      "export * from '../../views/Order';",
      {[screen]: value},
    )[0].rule,
    'ARCH005',
  );
  assert.equal(
    probe(screen, "import {value} from '../../infra/adapter';", {
      [adapter]: value,
    })[0].rule,
    'ARCH006',
  );
});
test('screens cannot reuse implementation of another screen, but local parts are allowed', () => {
  const target = 'src/views/Envios/index.ts';
  assert.equal(
    probe('src/views/Eventos/index.ts', "export * from '../Envios';", {
      [target]: value,
    })[0].rule,
    'ARCH013',
  );
  assert.deepEqual(
    probe('src/views/Eventos/index.ts', "export * from './part';", {
      'src/views/Eventos/part.ts': value,
    }),
    [],
  );
});
test('UI rejects SDKs but allows visual libraries and navigation', () => {
  for (const module of [
    'expo-sqlite',
    'expo-secure-store',
    'expo-network',
    'react-native-nfc-manager',
    'axios',
  ]) {
    assert.equal(
      probe('src/views/probe.tsx', `import '${module}';`)[0].rule,
      'ARCH007',
    );
  }
  for (const module of [
    'react',
    'react-native-paper',
    '@react-navigation/native',
    '@expo/vector-icons/MaterialCommunityIcons',
  ]) {
    assert.deepEqual(probe('src/views/probe.tsx', `import '${module}';`), []);
  }
});
test('composition is allowed to wire adapters and presentation', () => {
  assert.deepEqual(
    probe(
      'src/bootstrap/services.ts',
      "import {value} from '../infra/adapter';",
      {[adapter]: value},
    ),
    [],
  );
});
test('runtime cycles fail while implicit and explicit type-only cycles do not', () => {
  const other = 'src/domain/other.ts';
  assert.ok(
    probe(domain, "export {value} from './other';", {
      [other]: "export {value} from './probe';",
    }).some(issue => issue.rule === 'ARCH012'),
  );
  assert.ok(
    probe(domain, "export * from './probe';").some(
      issue => issue.rule === 'ARCH012',
    ),
  );
  assert.deepEqual(
    probe(
      domain,
      "import {Other} from './other'; export interface Value {other: Other}",
      {
        [other]:
          "import type {Value} from './probe'; export interface Other {value: Value}",
      },
    ),
    [],
  );
});
test('cycles hidden behind lazy require or dynamic import are still detected', () => {
  const other = 'src/domain/other.ts';
  assert.ok(
    probe(domain, "export const load = () => import('./other');", {
      [other]: "export const load = () => require('./probe');",
    }).some(issue => issue.rule === 'ARCH012'),
  );
});
test('runtime graph respects verbatimModuleSyntax from the compiler configuration', () => {
  const other = 'src/domain/other.ts';
  const code = "import {other} from './other'; export const value = 1;";
  const extra = {
    [other]: "import {value} from './probe'; export const other = 2;",
  };
  assert.deepEqual(probe(domain, code, extra), []);
  assert.ok(
    probe(domain, code, extra, {verbatimModuleSyntax: true}).some(
      issue => issue.rule === 'ARCH012',
    ),
  );
});
test('a folder or file outside the agreed architecture needs an explicit policy', () => {
  assert.equal(probe('src/services/probe.ts', value)[0].rule, 'ARCH010');
});
test('an exception accepts only the exact import, once, in its original source', () => {
  const issues = probe(app, "import {value} from '../infra/adapter';", {
    [adapter]: value,
  });
  const allowed = [
    {...issues[0], reason: 'Legacy composition, migrate to bootstrap.'},
  ];
  assert.equal(applyExceptions(issues, allowed).errors.length, 0);
  assert.equal(
    applyExceptions([...issues, issues[0]], allowed).errors.length,
    1,
  );
  for (const change of [
    {from: domain},
    {to: 'other'},
    {statement: 'import {other} from "infra";'},
  ]) {
    assert.equal(
      applyExceptions([{...issues[0], ...change}], allowed).errors.length,
      2,
    );
  }
});
test('unused, duplicate and unjustified exceptions fail instead of growing silently', () => {
  const issue = probe(app, "import {value} from '../infra/adapter';", {
    [adapter]: value,
  })[0];
  const allowed = {...issue, reason: 'Tracked legacy edge.'};
  assert.equal(applyExceptions([], [allowed]).errors.length, 1);
  assert.throws(() => applyExceptions([], [allowed, allowed]));
  assert.throws(() => applyExceptions([], [{...allowed, reason: ''}]));
  assert.throws(() => applyExceptions([], [{...allowed, rule: 'ARCH011'}]));
});
test('the Git ratchet rejects a new exception even when it has a justification', () => {
  const known = {
    rule: 'ARCH002',
    from: app,
    to: adapter,
    statement: 'known',
    reason: 'legacy',
  };
  const extra = {...known, from: domain, reason: 'make checks pass'};
  assert.deepEqual(additions([known], [known, extra]), [extra]);
  assert.deepEqual(additions([known], []), []);
  assert.deepEqual(
    additions([known], [{...known, reason: 'better explanation'}]),
    [],
  );
  assert.equal(
    additions([known], [{...known, statement: 'expanded import'}]).length,
    1,
  );
});
for (const directive of [
  '// @ts-ignore',
  '// @ts-expect-error needed to skip types',
  '/* @ts-nocheck */',
  '// eslint-disable-next-line',
  '/* eslint-disable -- temporary fix */',
  '// eslint-disable-next-line no-restricted-globals',
  '// eslint-disable-next-line react-hooks/exhaustive-deps',
  '/* eslint-disable react-hooks/refs */',
  '// eslint-disable-next-line id-length',
]) {
  test(`critical suppression rejected: ${directive}`, () => {
    assert.ok(
      probe(domain, `${directive}\nexport const value = 1;`).some(
        issue => issue.rule === 'ARCH011',
      ),
    );
  });
}
test('unrelated lint exceptions and strings documenting suppressions are allowed', () => {
  assert.deepEqual(
    probe(
      domain,
      '/* eslint-disable no-bitwise */\nexport const message = "@ts-ignore";',
    ),
    [],
  );
});

test('direct IO is blocked by the actual ESLint configuration, including global aliases', async () => {
  const eslint = new ESLint({cwd: root});
  for (const filename of [
    domain,
    app,
    'src/views/probe.tsx',
    'src/components/ui/probe.tsx',
    'src/domain/probe.mts',
    'src/appplication/probe.cts',
  ]) {
    for (const code of [
      "export const read = () => fetch('/orders');",
      "export const read = () => globalThis.fetch('/orders');",
      "export const read = () => globalThis['fetch']('/orders');",
      'export const storage = localStorage;',
      'export const storage = globalThis[key];',
      'export const root = globalThis;',
      'const {fetch: send} = globalThis; export {send};',
    ]) {
      const [result] = await eslint.lintText(code, {
        filePath: path.join(root, filename),
      });
      assert.ok(
        result.messages.some(
          message =>
            message.severity === 2 &&
            [
              'no-restricted-globals',
              'no-restricted-properties',
              'no-restricted-syntax',
            ].includes(message.ruleId),
        ),
        `${filename}: ${code}`,
      );
    }
  }
  const [result] = await eslint.lintText(
    "export const read = () => fetch('/orders');",
    {filePath: path.join(root, adapter)},
  );
  assert.ok(
    !result.messages.some(
      message => message.ruleId === 'no-restricted-globals',
    ),
  );
});
test('production code cannot hide missing types behind explicit any', async () => {
  const eslint = new ESLint({cwd: root});
  const [result] = await eslint.lintText('export const value: any = 1;', {
    filePath: path.join(root, adapter),
  });
  assert.ok(
    result.messages.some(
      message =>
        message.ruleId === '@typescript-eslint/no-explicit-any' &&
        message.severity === 2,
    ),
  );
});

for (const [rule, code] of [
  [
    'set-state-in-effect',
    "import {useEffect, useState} from 'react'; export function Probe({name}: {name: string}) { const [label, setLabel] = useState(''); useEffect(() => {setLabel(name);}, [name]); return label; }",
  ],
  [
    'refs',
    "import {useRef} from 'react'; export function Probe() { const reading = useRef(1); return reading.current; }",
  ],
  [
    'purity',
    "import React from 'react'; import {Text} from 'react-native'; export function Probe() { return <Text>{Date.now()}</Text>; }",
  ],
  [
    'immutability',
    "import React from 'react'; import {Text} from 'react-native'; export function Probe({order}: {order: {code: string}}) { order.code = 'changed'; return <Text>{order.code}</Text>; }",
  ],
  [
    'set-state-in-render',
    "import {useState} from 'react'; export function Probe() { const [count, setCount] = useState(0); setCount(count + 1); return count; }",
  ],
  [
    'static-components',
    "import React from 'react'; import {Text} from 'react-native'; export function Probe({label}: {label: string}) { function Row() {return <Text>{label}</Text>;} return <Row />; }",
  ],
]) {
  test(`actual ESLint rejects React violation: ${rule}`, async () => {
    const [result] = await new ESLint({cwd: root}).lintText(code, {
      filePath: path.join(root, 'src/components/Probe.tsx'),
    });
    assert.ok(
      result.messages.some(
        message =>
          message.ruleId === `react-hooks/${rule}` && message.severity === 2,
      ),
      JSON.stringify(result.messages),
    );
  });
}
test('React guards allow external subscriptions, derived data and explicit user commands', async () => {
  const [result] = await new ESLint({cwd: root}).lintText(
    "import React, {useEffect, useState} from 'react'; import {Text, Pressable} from 'react-native'; export function Probe({subscribe}: {subscribe: (listener: (count: number) => void) => () => void}) { const [count, setCount] = useState(0); useEffect(() => subscribe(setCount), [subscribe]); const doubled = count * 2; return <Pressable onPress={() => setCount(count + 1)}><Text>{doubled}</Text></Pressable>; }",
    {filePath: path.join(root, 'src/components/Probe.tsx')},
  );
  assert.deepEqual(
    result.messages.filter(message =>
      message.ruleId?.startsWith('react-hooks/'),
    ),
    [],
  );
});

test('production rejects opaque one-letter local names without changing external field names', async () => {
  const eslint = new ESLint({cwd: root});
  const filePath = path.join(root, app);
  const [invalid] = await eslint.lintText(
    'export function load(a: string) { return a; }',
    {filePath},
  );
  assert.ok(
    invalid.messages.some(
      message => message.ruleId === 'id-length' && message.severity === 2,
    ),
  );
  const [valid] = await eslint.lintText(
    'export function load(owner: {n: number}) { return owner.n; }',
    {filePath},
  );
  assert.ok(!valid.messages.some(message => message.ruleId === 'id-length'));
});
test('administrative reply variants reject impossible combinations at compile time', () => {
  const filename = path.join(root, 'src/contract-type-probe.ts');
  const options = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    target: ts.ScriptTarget.ES2022,
  };
  function diagnostics(source) {
    const host = ts.createCompilerHost(options);
    const readSource = host.getSourceFile.bind(host);
    host.getSourceFile = (name, ...args) =>
      path.resolve(name) === filename
        ? ts.createSourceFile(name, source, options.target, true)
        : readSource(name, ...args);
    const program = ts.createProgram([filename], options, host);
    assert.ok(
      program.getSourceFile(filename),
      'The contract probe must be checked, not skipped.',
    );
    return ts
      .getPreEmitDiagnostics(program)
      .filter(item => item.category === ts.DiagnosticCategory.Error);
  }
  const envelope =
    "import type {AdminReply} from './appplication/administration/contracts/admin-reply.types'; const envelope = {sessaoId: 'rf', expiraEm: '2030-01-01', alteracaoFisica: 'NAO_ALTERADA' as const}; ";
  const valid = diagnostics(
    envelope +
      "const reply: AdminReply = {...envelope, status: 'EM_ANDAMENTO', comando: {id: 'command', sequencia: 1, etapa: 'step', apduHex: '9051000008000000000000000000', alteraTag: false}, resultado: null, codigo: null};",
  );
  assert.deepEqual(
    valid.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    [],
  );
  const invalid = diagnostics(
    envelope +
      "const reply: AdminReply = {...envelope, status: 'EM_ANDAMENTO', comando: null, resultado: null, codigo: null};",
  );
  assert.ok(
    invalid.some(
      item =>
        item.file &&
        path.resolve(item.file.fileName) === filename &&
        item.code === 2322,
    ),
  );
});

test('the actual repository contains no unregistered architectural violations', () => {
  const result = applyExceptions(analyze(readProject(root)), exceptions);
  assert.deepEqual(result.errors, []);
});
