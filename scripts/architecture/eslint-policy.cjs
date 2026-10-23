const globals = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'globalThis',
  'window',
  'self',
  'global',
];
module.exports = {
  'no-restricted-globals': [
    'error',
    ...globals.map(name => ({
      name,
      message:
        'Use uma porta de aplicação; rede e armazenamento concretos pertencem a infra.',
    })),
  ],
  'no-restricted-properties': [
    'error',
    ...['globalThis', 'window', 'self', 'global'].flatMap(object =>
      globals.map(property => ({
        object,
        property,
        message: 'Não contorne a porta de aplicação por um global.',
      })),
    ),
  ],
  'no-restricted-syntax': [
    'error',
    ...['globalThis', 'window', 'self', 'global'].map(object => ({
      selector: `MemberExpression[object.name='${object}'][computed=true][property.type!='Literal']`,
      message: 'Acesso global calculado esconde dependências; use uma porta.',
    })),
  ],
  'no-eval': 'error',
  'no-new-func': 'error',
};
