import type { PersistedNodeRecord, PersistedEdgeRecord } from "../event-store/index.ts";

/**
 * エクスポートファイルのルート構造。
 * バージョン管理により将来のフォーマット変更に対応する。
 */
export interface ExportEnvelope {
  /** フォーマット識別子。固定値 "kakicom-export" */
  readonly format: "kakicom-export";
  /** フォーマットバージョン。現在は 1 */
  readonly version: 1;
  /** エクスポート日時（Unix ms） */
  readonly exportedAt: number;
  /** エクスポートデータ本体 */
  readonly data: ExportData;
}

/**
 * エクスポートされるデータ本体。
 * IndexedDBの全ストアの内容を平坦に保持する。
 */
export interface ExportData {
  readonly nodes: readonly PersistedNodeRecord[];
  readonly edges: readonly PersistedEdgeRecord[];
}

/**
 * インポート戦略。
 * - replace: 既存データを全削除してからインポート
 * - merge: 既存データを保持し、ID重複時はスキップ（将来実装）
 */
export type ImportStrategy = "replace" | "merge";

/**
 * インポート結果のサマリー。
 */
export interface ImportResult {
  readonly strategy: ImportStrategy;
  readonly nodesImported: number;
  readonly edgesImported: number;
  readonly nodesSkipped: number;
  readonly edgesSkipped: number;
}

/**
 * バリデーションエラー。
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

/**
 * バリデーション結果。
 */
export type ValidationResult =
  | { readonly ok: true; readonly data: ExportEnvelope }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };
