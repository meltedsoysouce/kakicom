import type {
  Transaction,
  ObjectStoreAccess,
  IndexAccess,
  QueryRange,
  CursorDirection,
} from "./types.ts";
import { toIDBKeyRange } from "./query-range.ts";

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function wrapIndex<T>(index: IDBIndex): IndexAccess<T> {
  return {
    get(key: IDBValidKey): Promise<T | undefined> {
      return reqToPromise(index.get(key));
    },
    getAll(query?: QueryRange, count?: number): Promise<T[]> {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(index.getAll(range, count));
    },
    count(query?: QueryRange): Promise<number> {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(index.count(range));
    },
    openCursor(
      query?: QueryRange,
      direction?: CursorDirection,
      callback?: (value: T, cursor: IDBCursor) => boolean | void,
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const range = query ? toIDBKeyRange(query) : undefined;
        const request = index.openCursor(range, direction);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          if (callback) {
            const result = callback(cursor.value as T, cursor);
            if (result === false) {
              resolve();
              return;
            }
          }
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
    },
  };
}

function wrapObjectStore<T>(store: IDBObjectStore): ObjectStoreAccess<T> {
  return {
    put(value: T): Promise<IDBValidKey> {
      return reqToPromise(store.put(value));
    },
    add(value: T): Promise<IDBValidKey> {
      return reqToPromise(store.add(value));
    },
    get(key: IDBValidKey): Promise<T | undefined> {
      return reqToPromise(store.get(key));
    },
    getAll(query?: QueryRange, count?: number): Promise<T[]> {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(store.getAll(range, count));
    },
    delete(key: IDBValidKey): Promise<void> {
      return reqToPromise(
        store.delete(key) as unknown as IDBRequest<void>,
      );
    },
    clear(): Promise<void> {
      return reqToPromise(store.clear() as unknown as IDBRequest<void>);
    },
    count(query?: QueryRange): Promise<number> {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(store.count(range));
    },
    index(name: string): IndexAccess<T> {
      return wrapIndex<T>(store.index(name));
    },
  };
}

export function wrapTransaction(tx: IDBTransaction): Transaction {
  return {
    store<T>(name: string): ObjectStoreAccess<T> {
      return wrapObjectStore<T>(tx.objectStore(name));
    },
    done(): Promise<void> {
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    abort(): void {
      tx.abort();
    },
  };
}
