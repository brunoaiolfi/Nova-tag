const pacotesEsm = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-paper',
  'react-native-nfc-manager',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-toast-message',
  '@react-native-vector-icons',
  'expo(nent)?(-.*)?',
  '@expo',
].join('|');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [`node_modules/(?!(?:.pnpm/)?(${pacotesEsm})/)`],
};
