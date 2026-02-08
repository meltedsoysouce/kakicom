/**
 * Nodeの一意識別子。
 * ブランド型で string と区別する。
 */
export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * Unix ミリ秒タイムスタンプ。
 */
export type Timestamp = number & { readonly __brand: "Timestamp" };

/**
 * blob-store 内のバイナリデータへの参照ID。
 */
export type BlobId = string & { readonly __brand: "BlobId" };

/**
 * 思考の最小単位。
 * 完成している必要はなく、未整理・未確定が正常状態。
 *
 * 注意:
 *   - 階層・フォルダ・タグを持たない
 *   - 空間的位置を持たない（Projection/Viewの責務）
 *   - 変化履歴を持たない（ThoughtEventの責務）
 */
export interface Node {
  readonly id: NodeId;
  readonly payload: Payload;
  readonly kind: NodeKind;
  readonly epistemicState: EpistemicState;
  readonly createdAt: Timestamp;
}

/**
 * Nodeの中身。
 * discriminated union で種別を判定する。
 */
export type Payload = TextPayload | ImagePayload | MixedPayload;

/**
 * 生のテキスト断片。
 * Markdown等の構造は持たない。
 */
export interface TextPayload {
  readonly type: "text";
  readonly text: string;
}

/**
 * スクリーンショット・図・写真。
 * 実データはblob-storeに保存し、ここではIDで参照する。
 */
export interface ImagePayload {
  readonly type: "image";
  readonly blobId: BlobId;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
}

/**
 * 画像 + 後付けメモ（最頻出ユースケース）。
 * スクショを貼ってから一言メモを添えるパターン。
 */
export interface MixedPayload {
  readonly type: "mixed";
  readonly blobId: BlobId;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
  readonly memo: string;
}

/**
 * Nodeの大まかな分類。
 * Payloadの種別とは独立した意味的カテゴリ。
 */
export type NodeKind = "note" | "question" | "reference" | "anchor";

/**
 * Nodeの確信度。
 * 「このNodeの内容をどの程度信じているか」を示す。
 *
 * 順序: Certain > Likely > Hypothesis > Speculative > Unsure
 */
export type EpistemicState =
  | "certain"
  | "likely"
  | "hypothesis"
  | "speculative"
  | "unsure";
