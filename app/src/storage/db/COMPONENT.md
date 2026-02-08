# storage/db/ — IndexedDB基盤コンポーネント

## 1. 概要

本コンポーネントはIndexedDBへの**低レベルアクセス基盤**を提供する。
データベースの接続・スキーマ定義・マイグレーション・トランザクション管理を担い、
event-store/ と blob-store/ が共通利用するインフラ層である。

IndexedDB APIの複雑さ（コールバック、バージョニング、トランザクションスコープ）を
Promise ベースの簡潔なインターフェースに変換する。

---

## 2. 責務

- IndexedDBデータベースの接続（open）と切断（close）
- ObjectStore のスキーマ定義
- インデックス定義
- バージョンベースのマイグレーション管理
- トランザクションの開始・コミット・ロールバック
- 基本CRUD操作の提供（put, get, getAll, delete, count）
- インデックスクエリ（範囲検索、カーソル操作）
- データベースの削除（開発・テスト用）

### 責務に含まれないもの

- ドメインレベルのクエリ解釈（→ event-store/）
- バイナリデータの変換（→ blob-store/）
- model/ の型の知識（→ event-store/ がマッピング）

---

## 3. 設計原則

1. **IndexedDB APIをここに閉じ込める** — 他コンポーネントがIDBRequestを直接扱わない
2. **Promiseベース** — コールバック地獄を排除する
3. **バージョン管理を厳密に** — スキーマ変更はマイグレーション関数で明示的に管理
4. **型安全なラッパー** — ObjectStore名とレコード型をジェネリクスで紐付ける

---

## 4. 公開データ構造

### 4.1 DatabaseConfig

```typescript
/**
 * データベースの設定。
 */
interface DatabaseConfig {
  /** データベース名 */
  readonly name: string;

  /** 現在のスキーマバージョン */
  readonly version: number;

  /** バージョンごとのマイグレーション関数 */
  readonly migrations: readonly Migration[];
}
```

### 4.2 Migration

```typescript
/**
 * スキーマのマイグレーション定義。
 * バージョン番号と、そのバージョンで実行する変更を記述する。
 */
interface Migration {
  /** このマイグレーションが適用されるバージョン番号 */
  readonly version: number;

  /** マイグレーション関数。onupgradeneeded 内で呼ばれる。 */
  readonly migrate: (db: IDBDatabase, transaction: IDBTransaction) => void;
}
```

### 4.3 StoreSchema

```typescript
/**
 * ObjectStoreのスキーマ定義。
 * マイグレーション内でストアを作成する際に使用する。
 */
interface StoreSchema {
  readonly name: string;
  readonly keyPath: string;
  readonly autoIncrement?: boolean;
  readonly indexes: readonly IndexSchema[];
}

/**
 * インデックスのスキーマ定義。
 */
interface IndexSchema {
  readonly name: string;
  readonly keyPath: string | readonly string[];
  readonly unique?: boolean;
  readonly multiEntry?: boolean;
}
```

### 4.4 TransactionMode

```typescript
/**
 * トランザクションのモード。
 */
type TransactionMode = "readonly" | "readwrite";
```

### 4.5 QueryRange

```typescript
/**
 * インデックスクエリの範囲指定。
 * IDBKeyRange のラッパー。
 */
type QueryRange =
  | { readonly type: "exact"; readonly value: IDBValidKey }
  | { readonly type: "lower"; readonly value: IDBValidKey; readonly open?: boolean }
  | { readonly type: "upper"; readonly value: IDBValidKey; readonly open?: boolean }
  | { readonly type: "bound";
      readonly lower: IDBValidKey;
      readonly upper: IDBValidKey;
      readonly lowerOpen?: boolean;
      readonly upperOpen?: boolean }
  | { readonly type: "all" };
```

### 4.6 CursorDirection

```typescript
/**
 * カーソルの走査方向。
 */
type CursorDirection = "next" | "prev" | "nextunique" | "prevunique";
```

---

## 5. 公開インターフェース

### 5.1 Database

```typescript
/**
 * IndexedDBデータベースへの接続。
 * 全ObjectStoreへの型安全なアクセスを提供する。
 */
interface Database {
  /**
   * データベース名を返す。
   */
  readonly name: string;

  /**
   * 現在のバージョンを返す。
   */
  readonly version: number;

  /**
   * トランザクションを開始する。
   * 指定したストアに対する読み取りまたは読み書きトランザクション。
   */
  transaction(
    storeNames: readonly string[],
    mode: TransactionMode
  ): Transaction;

  /**
   * データベース接続を閉じる。
   */
  close(): void;
}
```

### 5.2 Transaction

```typescript
/**
 * IndexedDBトランザクションのラッパー。
 * ObjectStoreへのアクセスとコミット制御を提供する。
 */
interface Transaction {
  /**
   * ObjectStoreを取得する。
   */
  store<T>(name: string): ObjectStoreAccess<T>;

  /**
   * トランザクションの完了を待つ。
   */
  done(): Promise<void>;

  /**
   * トランザクションを中止する。
   */
  abort(): void;
}
```

### 5.3 ObjectStoreAccess

```typescript
/**
 * 1つのObjectStoreに対するCRUD操作。
 * ジェネリクスTでレコードの型を指定する。
 */
interface ObjectStoreAccess<T> {
  /**
   * レコードを挿入または更新する。
   */
  put(value: T): Promise<IDBValidKey>;

  /**
   * レコードを挿入する（既存キーでエラー）。
   */
  add(value: T): Promise<IDBValidKey>;

  /**
   * キーでレコードを取得する。
   */
  get(key: IDBValidKey): Promise<T | undefined>;

  /**
   * 全レコードを取得する。
   */
  getAll(query?: QueryRange, count?: number): Promise<T[]>;

  /**
   * キーでレコードを削除する。
   */
  delete(key: IDBValidKey): Promise<void>;

  /**
   * 全レコードを削除する。
   */
  clear(): Promise<void>;

  /**
   * レコード数を返す。
   */
  count(query?: QueryRange): Promise<number>;

  /**
   * インデックスを使ったクエリ。
   */
  index(name: string): IndexAccess<T>;
}
```

### 5.4 IndexAccess

```typescript
/**
 * インデックスに対するクエリ操作。
 */
interface IndexAccess<T> {
  /**
   * インデックスキーでレコードを取得する。
   */
  get(key: IDBValidKey): Promise<T | undefined>;

  /**
   * 範囲クエリで全レコードを取得する。
   */
  getAll(query?: QueryRange, count?: number): Promise<T[]>;

  /**
   * レコード数を返す。
   */
  count(query?: QueryRange): Promise<number>;

  /**
   * カーソルで走査する。
   * コールバックがfalseを返したら走査を中止する。
   */
  openCursor(
    query?: QueryRange,
    direction?: CursorDirection,
    callback?: (value: T, cursor: IDBCursor) => boolean | void
  ): Promise<void>;
}
```

### 5.5 Database 生成

```typescript
/**
 * データベースを開く（なければ作成）。
 * マイグレーションが必要な場合は自動的に実行する。
 */
function openDatabase(config: DatabaseConfig): Promise<Database>;

/**
 * データベースを削除する。
 * 開発・テスト用。
 */
function deleteDatabase(name: string): Promise<void>;
```

### 5.6 QueryRange ヘルパー

```typescript
/**
 * 完全一致のQueryRangeを生成する。
 */
function exact(value: IDBValidKey): QueryRange;

/**
 * 下限指定のQueryRangeを生成する。
 */
function lowerBound(value: IDBValidKey, open?: boolean): QueryRange;

/**
 * 上限指定のQueryRangeを生成する。
 */
function upperBound(value: IDBValidKey, open?: boolean): QueryRange;

/**
 * 範囲指定のQueryRangeを生成する。
 */
function bound(
  lower: IDBValidKey,
  upper: IDBValidKey,
  lowerOpen?: boolean,
  upperOpen?: boolean
): QueryRange;

/**
 * QueryRange を IDBKeyRange に変換する。
 */
function toIDBKeyRange(range: QueryRange): IDBKeyRange | undefined;
```

### 5.7 スキーマ定義（Kakicom用）

```typescript
/**
 * Kakicom PKMのデータベーススキーマ。
 * event-store/ と blob-store/ で共有する。
 */
const KAKICOM_DB_CONFIG: DatabaseConfig;

/**
 * ObjectStore名の定数。
 */
const STORE_NAMES: {
  readonly EVENTS: "events";
  readonly NODES: "nodes";
  readonly SESSIONS: "sessions";
  readonly BLOBS: "blobs";
};
```

---

## 6. マイグレーション定義

### Version 1（MVP）

```typescript
// Version 1: 初期スキーマ
{
  version: 1,
  migrate(db) {
    // events ストア
    const events = db.createObjectStore("events", { keyPath: "id" });
    events.createIndex("node_id", "nodeId", { unique: false });
    events.createIndex("timestamp", "timestamp", { unique: false });
    events.createIndex("session_id", "sessionId", { unique: false });

    // nodes ストア（スナップショット）
    const nodes = db.createObjectStore("nodes", { keyPath: "node.id" });
    nodes.createIndex("epistemic_state", "node.epistemicState", { unique: false });
    nodes.createIndex("created_at", "node.createdAt", { unique: false });
    nodes.createIndex("updated_at", "updatedAt", { unique: false });

    // sessions ストア
    const sessions = db.createObjectStore("sessions", { keyPath: "id" });
    sessions.createIndex("started_at", "startedAt", { unique: false });

    // blobs ストア
    db.createObjectStore("blobs", { keyPath: "id" });
  }
}
```

---

## 7. ファイル構成（想定）

```
storage/db/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # DatabaseConfig, Migration, StoreSchema, QueryRange 等
├── database.ts        # openDatabase, deleteDatabase, Database実装
├── transaction.ts     # Transaction, ObjectStoreAccess, IndexAccess実装
├── query-range.ts     # QueryRangeヘルパー（exact, bound, toIDBKeyRange）
├── schema.ts          # KAKICOM_DB_CONFIG, STORE_NAMES, マイグレーション定義
└── index.ts           # 公開APIの再エクスポート
```

---

## 8. 依存関係

```
storage/db/ → (依存なし — ブラウザ組込のIndexedDB APIのみ使用)
```

db/ はstorage/内で最も基底のコンポーネントであり、
model/ にも依存しない。純粋なIndexedDBラッパーとして機能する。

event-store/ → db/ (データベース接続とCRUD操作)
blob-store/  → db/ (Blob用ObjectStoreへのアクセス)

---

## 9. 不変条件

1. **openDatabase は同一名で複数回呼んでもDB接続は1つ**（内部でキャッシュ）
2. **マイグレーションはバージョン番号の昇順で実行される**
3. **readonlyトランザクションでput/add/deleteを呼ぶとエラー**
4. **Transaction.done() はトランザクション完了後に resolve する**
5. **deleteDatabase は接続中のDBがあればcloseしてから削除する**

---

## 10. エラーハンドリング

```
エラー種別                     対応
──────────────────────────────────────────────
VersionError（古いバージョン）  → マイグレーション実行
ConstraintError（キー重複）    → エラーを上位に伝搬
QuotaExceededError（容量超過） → エラーを上位に伝搬
AbortError（トランザクション中止）→ エラーを上位に伝搬
InvalidStateError              → DB再接続を試行
```

すべてのIDBRequest エラーはPromise.reject に変換し、
呼び出し元が async/await で自然にハンドリングできるようにする。
