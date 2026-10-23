module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['src/**/*.{ts,tsx,mts,cts}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'react-hooks/refs': 'error',
        'react-hooks/purity': 'error',
        'react-hooks/immutability': 'error',
        'react-hooks/set-state-in-effect': 'error',
        'react-hooks/set-state-in-render': 'error',
        'react-hooks/static-components': 'error',
        'id-length': [
          'error',
          {min: 2, properties: 'never', exceptions: ['i', 'j', 'T', 'E', '_']},
        ],
      },
    },
    {
      files: ['src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
      excludedFiles: [
        'src/infra/**',
        'src/bootstrap/**',
        'src/App.tsx',
        'src/components/Auth/SessionGate.tsx',
      ],
      rules: require('./scripts/architecture/eslint-policy.cjs'),
    },
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
      files: ['scripts/**/*.cjs'],
      env: {node: true, es2022: true},
      parserOptions: {ecmaVersion: 2022, sourceType: 'script'},
    },
  ],
  rules: {'no-void': ['warn', {allowAsStatement: true}]},
};
