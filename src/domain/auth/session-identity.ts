import type {Session} from './session';

/** Revalidation may replace the snapshot without changing the authenticated scope. */
export function sameSessionIdentity(
  expected?: Session,
  actual?: Session,
): boolean {
  if (!expected || !actual) return expected === actual;
  return (
    expected.baseUrl === actual.baseUrl &&
    expected.user.id === actual.user.id &&
    expected.token === actual.token
  );
}
