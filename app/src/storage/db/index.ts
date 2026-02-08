export type {
  DatabaseConfig,
  Migration,
  StoreSchema,
  IndexSchema,
  TransactionMode,
  QueryRange,
  CursorDirection,
  Database,
  Transaction,
  ObjectStoreAccess,
  IndexAccess,
} from "./types.ts";

import type { DatabaseConfig, Database, QueryRange } from "./types.ts";

// ── Database 生成 ──

/**
 * データベースを開く（なければ作成）。
 * マイグレーションが必要な場合は自動的に実行する。
 */
export function openDatabase(_config: DatabaseConfig): Promise<Database> {
  throw new Error("not implemented");
}

/** データベースを削除する。開発・テスト用。 */
export function deleteDatabase(_name: string): Promise<void> {
  throw new Error("not implemented");
}

// ── QueryRange ヘルパー ──

/** 完全一致のQueryRangeを生成する。 */
export function exact(_value: IDBValidKey): QueryRange {
  throw new Error("not implemented");
}

/** 下限指定のQueryRangeを生成する。 */
export function lowerBound(_value: IDBValidKey, _open?: boolean): QueryRange {
  throw new Error("not implemented");
}

/** 上限指定のQueryRangeを生成する。 */
export function upperBound(_value: IDBValidKey, _open?: boolean): QueryRange {
  throw new Error("not implemented");
}

/** 範囲指定のQueryRangeを生成する。 */
export function bound(
  _lower: IDBValidKey,
  _upper: IDBValidKey,
  _lowerOpen?: boolean,
  _upperOpen?: boolean,
): QueryRange {
  throw new Error("not implemented");
}

/** QueryRange を IDBKeyRange に変換する。 */
export function toIDBKeyRange(_range: QueryRange): IDBKeyRange | undefined {
  throw new Error("not implemented");
}

// ── スキーマ定義 ──

/** Kakicom PKMのデータベーススキーマ。 */
export const KAKICOM_DB_CONFIG: DatabaseConfig = {
  name: "kakicom",
  version: 1,
  migrations: [],
};

/** ObjectStore名の定数。 */
export const STORE_NAMES = {
  EVENTS: "events",
  NODES: "nodes",
  SESSIONS: "sessions",
  BLOBS: "blobs",
} as const;
