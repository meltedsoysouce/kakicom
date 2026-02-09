import type { BlobId, Timestamp } from "../../model/node/index.ts";
import type { Database } from "../db/index.ts";

/**
 * IndexedDBに保存するBlobレコード。
 * Blobの実データとメタデータを保持する。
 */
export interface BlobRecord {
  readonly id: BlobId;
  readonly data: Blob;
  readonly mime: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: Timestamp;
}

/**
 * Blobのメタデータ（実データを含まない軽量版）。
 */
export interface BlobMeta {
  readonly id: BlobId;
  readonly mime: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: Timestamp;
}

/**
 * Blob保存時の入力データ。
 */
export interface BlobInput {
  readonly data: Blob;
  readonly mime: string;
}

/**
 * Object URLの参照ハンドル。
 * 使い終わったらrevoke()を呼んでメモリを解放する。
 */
export interface ObjectURLHandle {
  readonly url: string;
  readonly blobId: BlobId;
  /** Object URLを破棄する。 */
  revoke(): void;
}

/**
 * Blobストアの統計情報。
 */
export interface BlobStoreStats {
  readonly blobCount: number;
  readonly totalSizeBytes: number;
}

/**
 * バイナリデータの永続化を管理するストア。
 */
export interface BlobStore {
  // ── 保存 ──

  /**
   * Blobを保存する。
   * 画像の場合、自動的にwidth/heightを検出する。
   */
  save(input: BlobInput): Promise<BlobId>;

  /** 指定IDでBlobを保存する（IDを事前生成済みの場合）。 */
  saveWithId(id: BlobId, input: BlobInput): Promise<void>;

  // ── 取得 ──

  /** BlobIdからBlobRecordを取得する。存在しない場合はnull。 */
  get(id: BlobId): Promise<BlobRecord | null>;

  /** BlobIdからBlob実データのみを取得する。存在しない場合はnull。 */
  getData(id: BlobId): Promise<Blob | null>;

  /** BlobIdからメタデータのみを取得する。 */
  getMeta(id: BlobId): Promise<BlobMeta | null>;

  /** 指定IDのBlobが存在するかを判定する。 */
  has(id: BlobId): Promise<boolean>;

  // ── Object URL ──

  /** BlobのObject URLを生成する。 */
  createObjectURL(id: BlobId): Promise<ObjectURLHandle | null>;

  /** 全ての未破棄Object URLを一括破棄する。 */
  revokeAll(): void;

  // ── 削除 ──

  /** Blobを削除する。関連するObject URLも自動的にrevokeされる。 */
  delete(id: BlobId): Promise<void>;

  // ── ユーティリティ ──

  /** 全Blobのメタデータ一覧を取得する。 */
  listAll(): Promise<readonly BlobMeta[]>;

  /** ストアの統計情報を取得する。 */
  getStats(): Promise<BlobStoreStats>;

  /** 全データをクリアする。開発・テスト用。 */
  clear(): Promise<void>;
}

/**
 * createBlobStore のパラメータ型。
 */
export interface BlobStoreParams {
  readonly db: Database;
}
