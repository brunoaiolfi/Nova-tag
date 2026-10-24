import {sqliteConnection} from '../offline/database';
import type {SqlConnection} from '../offline/sqlite-store';
let connection: Promise<SqlConnection> | undefined;
export function openAdministrationDatabase(): Promise<SqlConnection> {
  connection ??= Promise.resolve()
    .then(() => {
      const nativeModule: typeof import('expo-sqlite') = require('expo-sqlite');
      return nativeModule;
    })
    .then(SQLite => SQLite.openDatabaseAsync('nova-tag-administration.db'))
    .then(sqliteConnection)
    .catch(error => {
      connection = undefined;
      throw error;
    });
  return connection;
}
