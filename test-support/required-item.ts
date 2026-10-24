/** Fixture access fails at its origin when the expected row/item was not produced. */
export function requiredItem<T>(items: readonly T[], index = 0): T {
  const item = items[index];
  if (item === undefined)
    throw new Error(`Expected fixture item at index ${index}.`);
  return item;
}

export function requiredValue<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error('Expected fixture value to be present.');
  return value;
}
