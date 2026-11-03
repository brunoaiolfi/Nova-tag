export interface AdminOwner {
  baseUrl: string;
  userId: string;
}

export function sameOwner(
  expectedOwner: AdminOwner,
  actualOwner: AdminOwner,
): boolean {
  return (
    expectedOwner.baseUrl === actualOwner.baseUrl &&
    expectedOwner.userId === actualOwner.userId
  );
}
