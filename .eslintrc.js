module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['__tests__/**/*.{ts,tsx}', 'test-support/**/*.{ts,tsx}'],
      parserOptions: {projectService: true, tsconfigRootDir: __dirname},
      plugins: ['testing-library'],
      rules: {
        '@typescript-eslint/no-floating-promises': [
          'error',
          {ignoreVoid: false},
        ],
        '@typescript-eslint/no-misused-promises': 'error',
        'testing-library/await-async-events': [
          'error',
          {eventModule: ['fireEvent', 'userEvent']},
        ],
        'testing-library/await-async-queries': 'error',
        'testing-library/await-async-utils': 'error',
        'testing-library/no-await-sync-queries': 'error',
        'testing-library/no-unnecessary-act': 'error',
        'testing-library/no-manual-cleanup': 'error',
        'testing-library/no-wait-for-side-effects': 'error',
        'testing-library/no-wait-for-multiple-assertions': 'error',
        'testing-library/no-wait-for-snapshot': 'error',
        'testing-library/prefer-screen-queries': 'error',
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-test-renderer',
                message:
                  'Use @testing-library/react-native and its installed version documentation.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/**/*.{ts,tsx,mts,cts}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {projectService: true, tsconfigRootDir: __dirname},
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': [
          'error',
          {ignoreVoid: false},
        ],
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-unsafe-type-assertion': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          {considerDefaultExhaustiveForUnions: false},
        ],
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
