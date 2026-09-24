const pacotesEsm = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-paper',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-toast-message',
  '@react-native-vector-icons',
].join('|');

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [`node_modules/(?!(?:.pnpm/)?(${pacotesEsm})/)`],
};
