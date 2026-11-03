import type {PhysicalOutcome} from './operation';
import {integer, matches, oneOf} from '../validation/values';

export const uuid = (value: unknown): value is string =>
  matches(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
export const versions = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === 5 &&
  Array.from(value).every(item => integer(item, 0, 255));
export const outcome = (value: unknown): value is PhysicalOutcome =>
  oneOf(value, ['NAO_ALTERADA', 'NAO_CONFIRMADA', 'CONFERIDA']);
