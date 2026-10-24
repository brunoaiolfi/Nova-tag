const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const {createRoot} = require('test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const projectRoot = path.resolve(__dirname, '../..');
const configuration = require(path.join(projectRoot, 'babel.config.js'));
const presetOptions = configuration.presets[0][1];
const compilerOptions = presetOptions['react-compiler'];
assert.equal(
  require(path.join(projectRoot, 'app.json')).expo.experiments.reactCompiler,
  true,
);
assert.equal(
  compilerOptions.sources(
    path.join(projectRoot, 'src/components/Nfc/OrderSelect.tsx'),
  ),
  true,
);
assert.equal(
  compilerOptions.sources(
    path.join(projectRoot, 'src/appplication/nfc/physical-reading.ts'),
  ),
  false,
);
async function measure(compiled) {
  const events = [];
  const file = path.join(projectRoot, 'src/components/Nfc/OrderSelect.tsx');
  const output = babel.transformFileSync(file, {
    babelrc: false,
    configFile: false,
    presets: [
      [
        'babel-preset-expo',
        {
          ...presetOptions,
          'react-compiler': {
            ...compilerOptions,
            logger: {
              logEvent(filename, event) {
                events.push({
                  filename,
                  kind: event.kind,
                  function: event.fnLoc?.start?.line,
                });
              },
            },
          },
        },
      ],
    ],
    caller: {
      name: 'metro',
      bundler: 'metro',
      platform: 'ios',
      engine: 'hermes',
      isDev: false,
      isServer: false,
      supportsStaticESM: false,
      supportsReactCompiler: compiled,
    },
  });
  let iconRenders = 0;
  const host = name => props =>
    React.createElement(name, props, props.children);
  const paper = {
    Icon: () => {
      iconRenders++;
      return React.createElement('Icon');
    },
    Text: host('Text'),
    TouchableRipple: host('TouchableRipple'),
  };
  const native = {
    View: host('View'),
    FlatList: host('FlatList'),
    StyleSheet: {create: styles => styles},
  };
  const exported = {exports: {}};
  const customRequire = name => {
    if (name === 'react' || name.startsWith('react/')) return require(name);
    if (name.startsWith('@babel/')) return require(name);
    if (name === 'react-native') return native;
    if (name === 'react-native-paper') return paper;
    if (name.endsWith('labels')) return {stateLabel: value => value};
    if (name.endsWith('Tracking')) return {trackingColors: {}};
    return {};
  };
  const run = vm.runInThisContext(
    '(function(require,module,exports){' + output.code + '\n})',
    {filename: file},
  );
  run(customRequire, exported, exported.exports);
  const Component = exported.exports.OrderOption;
  const root = createRoot();
  const order = {
    id: 'order',
    codigo: 'TCC',
    descricao: 'Volume',
    estado: 'CADASTRADO',
  };
  const onPress = () => {};
  await React.act(async () =>
    root.render(
      React.createElement(Component, {order, onPress, disabled: false}),
    ),
  );
  const initialIconRenders = iconRenders;
  for (let index = 0; index < 25; index++)
    await React.act(async () =>
      root.render(
        React.createElement(Component, {order, onPress, disabled: false}),
      ),
    );
  const unchangedRenders = iconRenders - initialIconRenders;
  await React.act(async () =>
    root.render(
      React.createElement(Component, {
        order: {...order, codigo: 'CHANGED'},
        onPress,
        disabled: false,
      }),
    ),
  );
  const changedRenders = iconRenders - initialIconRenders - unchangedRenders;
  const changedOutput = JSON.stringify(root.container.toJSON());
  assert.ok(changedOutput.includes('CHANGED'));
  assert.ok(!changedOutput.includes('TCC'));
  let commands = 0;
  const changedHandler = () => {
    commands++;
  };
  await React.act(async () =>
    root.render(
      React.createElement(Component, {
        order,
        onPress: changedHandler,
        disabled: true,
      }),
    ),
  );
  const disabled = root.container.queryAll(
    node => node.type === 'TouchableRipple',
  )[0];
  assert.equal(disabled.props.disabled, true);
  await React.act(async () =>
    root.render(
      React.createElement(Component, {
        order,
        onPress: changedHandler,
        disabled: false,
      }),
    ),
  );
  root.container
    .queryAll(node => node.type === 'TouchableRipple')[0]
    .props.onPress();
  assert.equal(commands, 1);
  await React.act(async () => root.unmount());
  return {
    compiled,
    initialIconRenders,
    unchangedRenders,
    changedRenders,
    compiledFunctions: events.filter(e => e.kind === 'CompileSuccess').length,
    diagnostics: events.filter(
      e => !['CompileSuccess', 'Timing'].includes(e.kind),
    ),
  };
}
(async () => {
  const result = {
    baseline: await measure(false),
    compiler: await measure(true),
  };
  assert.ok(result.baseline.unchangedRenders > 0);
  assert.equal(result.compiler.unchangedRenders, 0);
  assert.equal(result.compiler.compiledFunctions, 2);
  assert.deepEqual(result.compiler.diagnostics, []);
  const actionEvents = [];
  babel.transformFileSync(
    path.join(projectRoot, 'src/components/ui/ActionButton.tsx'),
    {
      babelrc: false,
      configFile: false,
      presets: [
        [
          'babel-preset-expo',
          {
            ...presetOptions,
            'react-compiler': {
              ...compilerOptions,
              logger: {
                logEvent(_file, event) {
                  actionEvents.push(event.kind);
                },
              },
            },
          },
        ],
      ],
      caller: {
        name: 'metro',
        bundler: 'metro',
        platform: 'ios',
        engine: 'hermes',
        isDev: false,
        isServer: false,
        supportsStaticESM: false,
        supportsReactCompiler: true,
      },
    },
  );
  assert.ok(actionEvents.includes('CompileSuccess'));
  assert.ok(
    !actionEvents.some(kind =>
      ['CompileError', 'PipelineError'].includes(kind),
    ),
  );
  fs.mkdirSync(path.join(projectRoot, '.tmp'), {recursive: true});
  fs.writeFileSync(
    path.join(projectRoot, '.tmp/compiler-check-result.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(
    'Compiler: selected components compiled; 25 unchanged updates, icon renders ' +
      result.baseline.unchangedRenders +
      ' -> ' +
      result.compiler.unchangedRenders +
      '. Changed text, disabled state and handler verified. Synthetic JS check; no native FPS claim.',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
