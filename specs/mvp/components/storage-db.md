# storage/db MVP実装仕様

## 概要

IndexedDB のPromiseラッパー。コールバック地獄を排除し、
他のstorageコンポーネントが使いやすいインターフェースを提供する。

## 作成ファイル

```
app/src/storage/db/
├── types.ts          # 変更不要
├── database.ts       # openDatabase, deleteDatabase, Database実装
├── transaction.ts    # Transaction, ObjectStoreAccess, IndexAccess実装
├── query-range.ts    # exact, lowerBound, upperBound, bound, toIDBKeyRange
├── schema.ts         # KAKICOM_DB_CONFIG, STORE_NAMES, マイグレーション定義
└── index.ts          # 各ファイルから re-export
```

## 実装詳細

### database.ts

`openDatabase` は IndexedDB の `open` リクエストを Promise でラップする:

```typescript
function openDatabase(config: DatabaseConfig): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(config.name, config.version);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction!;
      const oldVersion = event.oldVersion;

      // oldVersion 以降のマイグレーションを順番に実行
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
          return wrapTransaction(idb.transaction(storeNames as string[], mode));
        },
        close() {
          idb.close();
        },
      });
    };

    request.onerror = () => reject(request.error);
  });
}
```

### transaction.ts

IDBTransaction / IDBObjectStore / IDBIndex を types.ts のインターフェースでラップ:

```typescript
function wrapTransaction(tx: IDBTransaction): Transaction {
  return {
    store<T>(name: string): ObjectStoreAccess<T> {
      return wrapObjectStore(tx.objectStore(name));
    },
    done(): Promise<void> {
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    abort() {
      tx.abort();
    },
  };
}
```

`wrapObjectStore` は各 IDBRequest を Promise でラップ:

```typescript
function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function wrapObjectStore<T>(store: IDBObjectStore): ObjectStoreAccess<T> {
  return {
    put(value)    { return reqToPromise(store.put(value)); },
    add(value)    { return reqToPromise(store.add(value)); },
    get(key)      { return reqToPromise(store.get(key)); },
    getAll(query, count) {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(store.getAll(range, count));
    },
    delete(key)   { return reqToPromise(store.delete(key) as unknown as IDBRequest<void>); },
    clear()       { return reqToPromise(store.clear() as unknown as IDBRequest<void>); },
    count(query)  {
      const range = query ? toIDBKeyRange(query) : undefined;
      return reqToPromise(store.count(range));
    },
    index(name)   { return wrapIndex(store.index(name)); },
  };
}
```

### query-range.ts

```typescript
function exact(value): QueryRange     { return { type: "exact", value }; }
function lowerBound(value, open): QueryRange { return { type: "lower", value, open }; }
function upperBound(value, open): QueryRange { return { type: "upper", value, open }; }
function bound(lower, upper, lowerOpen, upperOpen): QueryRange {
  return { type: "bound", lower, upper, lowerOpen, upperOpen };
}

function toIDBKeyRange(range: QueryRange): IDBKeyRange | undefined {
  switch (range.type) {
    case "exact": return IDBKeyRange.only(range.value);
    case "lower": return IDBKeyRange.lowerBound(range.value, range.open);
    case "upper": return IDBKeyRange.upperBound(range.value, range.open);
    case "bound": return IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
    case "all":   return undefined;
  }
}
```

### schema.ts

MVP Version 1 のマイグレーション:

```typescript
const KAKICOM_DB_CONFIG: DatabaseConfig = {
  name: "kakicom",
  version: 1,
  migrations: [
    {
      version: 1,
      migrate(db) {
        // events ストア（MVP後に使用）
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("node_id", "nodeId", { unique: false });
        events.createIndex("timestamp", "timestamp", { unique: false });
        events.createIndex("session_id", "sessionId", { unique: false });

        // nodes ストア（MVPで使用）
        const nodes = db.createObjectStore("nodes", { keyPath: "node.id" });
        nodes.createIndex("created_at", "node.createdAt", { unique: false });

        // sessions ストア（MVP後に使用）
        db.createObjectStore("sessions", { keyPath: "id" });

        // blobs ストア（MVP後に使用）
        db.createObjectStore("blobs", { keyPath: "id" });
      },
    },
  ],
};
```

**注意:** MVP で使わないストアも全て作成しておく。
後からスキーマ変更すると version 2 のマイグレーションが必要になるため。

## テスト基準

- `openDatabase` で DB が作成され、`close` で閉じられる
- `put` → `get` でデータが往復する
- `getAll` で全件取得できる
- `delete` でデータが消える
- `deleteDatabase` でDB全体が削除される
