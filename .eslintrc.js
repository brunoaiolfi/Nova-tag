module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['src/domain/**/*.ts', 'src/appplication/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              'react-native*',
              'expo*',
              '@expo/*',
              '**/infra/**',
              '**/components/**',
              '**/views/**',
              '**/navigation/**',
            ],
          },
        ],
      },
    },
    {
      files: ['scripts/*.cjs'],
      env: {node: true, es2022: true},
      parserOptions: {ecmaVersion: 2022, sourceType: 'script'},
    },
  ],
  rules: {'no-void': ['warn', {allowAsStatement: true}]},
};
