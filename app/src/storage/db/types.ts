/**
 * データベースの設定。
 */
export interface DatabaseConfig {
  /** データベース名 */
  readonly name: string;
  /** 現在のスキーマバージョン */
  readonly version: number;
  /** バージョンごとのマイグレーション関数 */
  readonly migrations: readonly Migration[];
}

/**
 * スキーマのマイグレーション定義。
 * バージョン番号と、そのバージョンで実行する変更を記述する。
 */
export interface Migration {
  /** このマイグレーションが適用されるバージョン番号 */
  readonly version: number;
  /** マイグレーション関数。onupgradeneeded 内で呼ばれる。 */
  readonly migrate: (db: IDBDatabase, transaction: IDBTransaction) => void;
}

/**
 * ObjectStoreのスキーマ定義。
 * マイグレーション内でストアを作成する際に使用する。
 */
export interface StoreSchema {
  readonly name: string;
  readonly keyPath: string;
  readonly autoIncrement?: boolean;
  readonly indexes: readonly IndexSchema[];
}

/**
 * インデックスのスキーマ定義。
 */
export interface IndexSchema {
  readonly name: string;
  readonly keyPath: string | readonly string[];
  readonly unique?: boolean;
  readonly multiEntry?: boolean;
}

/**
 * トランザクションのモード。
 */
export type TransactionMode = "readonly" | "readwrite";

/**
 * インデックスクエリの範囲指定。
 * IDBKeyRange のラッパー。
 */
export type QueryRange =
  | { readonly type: "exact"; readonly value: IDBValidKey }
  | {
      readonly type: "lower";
      readonly value: IDBValidKey;
      readonly open?: boolean;
    }
  | {
      readonly type: "upper";
      readonly value: IDBValidKey;
      readonly open?: boolean;
    }
  | {
      readonly type: "bound";
      readonly lower: IDBValidKey;
      readonly upper: IDBValidKey;
      readonly lowerOpen?: boolean;
      readonly upperOpen?: boolean;
    }
  | { readonly type: "all" };

/**
 * カーソルの走査方向。
 */
export type CursorDirection = "next" | "prev" | "nextunique" | "prevunique";

/**
 * IndexedDBデータベースへの接続。
 * 全ObjectStoreへの型安全なアクセスを提供する。
 */
export interface Database {
  /** データベース名を返す。 */
  readonly name: string;
  /** 現在のバージョンを返す。 */
  readonly version: number;

  /**
   * トランザクションを開始する。
   * 指定したストアに対する読み取りまたは読み書きトランザクション。
   */
  transaction(
    storeNames: readonly string[],
    mode: TransactionMode,
  ): Transaction;

  /** データベース接続を閉じる。 */
  close(): void;
}

/**
 * IndexedDBトランザクションのラッパー。
 * ObjectStoreへのアクセスとコミット制御を提供する。
 */
export interface Transaction {
  /** ObjectStoreを取得する。 */
  store<T>(name: string): ObjectStoreAccess<T>;
  /** トランザクションの完了を待つ。 */
  done(): Promise<void>;
  /** トランザクションを中止する。 */
  abort(): void;
}

/**
 * 1つのObjectStoreに対するCRUD操作。
 * ジェネリクスTでレコードの型を指定する。
 */
export interface ObjectStoreAccess<T> {
  /** レコードを挿入または更新する。 */
  put(value: T): Promise<IDBValidKey>;
  /** レコードを挿入する（既存キーでエラー）。 */
  add(value: T): Promise<IDBValidKey>;
  /** キーでレコードを取得する。 */
  get(key: IDBValidKey): Promise<T | undefined>;
  /** 全レコードを取得する。 */
  getAll(query?: QueryRange, count?: number): Promise<T[]>;
  /** キーでレコードを削除する。 */
  delete(key: IDBValidKey): Promise<void>;
  /** 全レコードを削除する。 */
  clear(): Promise<void>;
  /** レコード数を返す。 */
  count(query?: QueryRange): Promise<number>;
  /** インデックスを使ったクエリ。 */
  index(name: string): IndexAccess<T>;
}

/**
 * インデックスに対するクエリ操作。
 */
export interface IndexAccess<T> {
  /** インデックスキーでレコードを取得する。 */
  get(key: IDBValidKey): Promise<T | undefined>;
  /** 範囲クエリで全レコードを取得する。 */
  getAll(query?: QueryRange, count?: number): Promise<T[]>;
  /** レコード数を返す。 */
  count(query?: QueryRange): Promise<number>;
  /**
   * カーソルで走査する。
   * コールバックがfalseを返したら走査を中止する。
   */
  openCursor(
    query?: QueryRange,
    direction?: CursorDirection,
    callback?: (value: T, cursor: IDBCursor) => boolean | void,
  ): Promise<void>;
}
