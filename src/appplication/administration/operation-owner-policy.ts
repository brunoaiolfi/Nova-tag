import type {AdminOperation} from '../../domain/administration/operation';
import type {AdminOwner} from '../../domain/administration/owner';
import {invalid} from '../../domain/administration/invalid-contract';
import {decodeOperation} from './contracts/operation-decoder';

export function assertOperation(
  value: unknown,
  owner: AdminOwner,
): asserts value is AdminOperation {
  const operation = decodeOperation(value);
  assertOperationOwner(operation, owner);
}
export function assertOperationOwner(
  operation: AdminOperation,
  owner: AdminOwner,
): void {
  if (operation.administradorId !== owner.userId) invalid();
}
