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

export { openDatabase, deleteDatabase } from "./database.ts";
export { exact, lowerBound, upperBound, bound, toIDBKeyRange } from "./query-range.ts";
export { KAKICOM_DB_CONFIG, STORE_NAMES } from "./schema.ts";
