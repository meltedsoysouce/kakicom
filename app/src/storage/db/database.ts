import type { DatabaseConfig, Database } from "./types.ts";
import { wrapTransaction } from "./transaction.ts";

export function openDatabase(config: DatabaseConfig): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(config.name, config.version);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction!;
      const oldVersion = event.oldVersion;

      for (const migration of config.migrations) {
        if (migration.version > oldVersion) {
          migration.migrate(db, tx);
        }
      }
    };

    request.onsuccess = () => {
      const idb = request.result;
      resolve({
        name: idb.name,
        version: idb.version,
        transaction(storeNames, mode) {
          return wrapTransaction(
            idb.transaction(storeNames as string[], mode),
          );
        },
        close() {
          idb.close();
        },
      });
    };

    request.onerror = () => reject(request.error);
  });
}

export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
