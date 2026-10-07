import {sqliteConnection} from '../offline/database';
import type {SqlConnection} from '../offline/sqlite-store';
let connection: Promise<SqlConnection> | undefined;
export function openAdministrationDatabase(): Promise<SqlConnection> {
  connection ??= Promise.resolve()
    .then(() => require('expo-sqlite') as typeof import('expo-sqlite'))
    .then(SQLite => SQLite.openDatabaseAsync('nova-tag-administration.db'))
    .then(sqliteConnection)
    .catch(e => {
      connection = undefined;
      throw e;
    });
  return connection;
}
