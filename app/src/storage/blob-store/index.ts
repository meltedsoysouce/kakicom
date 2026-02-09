export type {
  BlobRecord,
  BlobMeta,
  BlobInput,
  ObjectURLHandle,
  BlobStoreStats,
  BlobStore,
  BlobStoreParams,
} from "./types.ts";

import type { BlobInput, BlobStore } from "./types.ts";
import type { BlobId } from "../../model/node/index.ts";
import type { Database } from "../db/index.ts";
import type { NodeSnapshot } from "../event-store/index.ts";

// ── BlobStore 生成 ──

/** BlobStoreを生成する。db/ のDatabase接続を受け取る。 */
export function createBlobStore(_db: Database): BlobStore {
  throw new Error("not implemented");
}

// ── 画像ユーティリティ ──

/** Blobが画像かどうかをMIME型で判定する。 */
export function isImageMime(_mime: string): boolean {
  throw new Error("not implemented");
}

/** 画像BlobからWidth/Heightを検出する。 */
export function detectImageSize(
  _blob: Blob,
): Promise<{ width: number; height: number } | null> {
  throw new Error("not implemented");
}

/** クリップボードのDataTransferから画像Blobを抽出する。 */
export function extractImageFromClipboard(
  _dataTransfer: DataTransfer,
): BlobInput | null {
  throw new Error("not implemented");
}

/** ドラッグ＆ドロップのDataTransferから画像Blobを抽出する。 */
export function extractImageFromDrop(
  _dataTransfer: DataTransfer,
): BlobInput | null {
  throw new Error("not implemented");
}

// ── ガベージコレクション ──

/**
 * Nodeが参照していないBlobIdの一覧を返す。
 * 削除の実行は上位層の判断に委ねる（自動削除しない）。
 */
export function findUnreferencedBlobs(
  _allBlobIds: readonly BlobId[],
  _allNodes: readonly NodeSnapshot[],
): readonly BlobId[] {
  throw new Error("not implemented");
}
