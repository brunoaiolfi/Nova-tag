import Constants from 'expo-constants';

export function defaultApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0] || '127.0.0.1';
  return `http://${host}:3000/api/v1`;
}
