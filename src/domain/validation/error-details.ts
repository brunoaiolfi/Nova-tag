import {record} from './values';

export function errorDetails(error: unknown) {
  const value = record(error) ? error : {};
  return {
    code: typeof value.code === 'string' ? value.code : undefined,
    status: typeof value.status === 'number' ? value.status : undefined,
    message: typeof value.message === 'string' ? value.message : undefined,
  };
}
