import type {SqlConnection} from './sqlite-store';
import type {SQLiteDatabase} from 'expo-sqlite';
let connection: Promise<SqlConnection> | undefined;
let transactions: Promise<void> = Promise.resolve();
function adapter(db: SQLiteDatabase): SqlConnection {
  return {
    exec: sql => db.execAsync(sql),
    run: (sql, params = []) => db.runAsync(sql, params),
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: work => {
      const pending = transactions.then(async () => {
        let value: Awaited<ReturnType<typeof work>>;
        await db.withExclusiveTransactionAsync(async tx => {
          value = await work(adapter(tx));
        });
        return value!;
      });
      transactions = pending.then(
        () => {},
        () => {},
      );
      return pending;
    },
  };
}
export function openCaptureDatabase() {
  // Lazy require keeps older development builds usable until storage is opened,
  // without requesting a split Metro bundle during an offline cold start.
  connection ??= Promise.resolve()
    .then(() => require('expo-sqlite') as typeof import('expo-sqlite'))
    .then(SQLite => SQLite.openDatabaseAsync('nova-tag-captures.db'))
    .then(adapter)
    .catch(error => {
      connection = undefined;
      throw error;
    });
  return connection;
}
