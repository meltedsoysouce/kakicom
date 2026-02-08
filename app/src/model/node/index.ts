export type {
  NodeId,
  Timestamp,
  BlobId,
  Node,
  Payload,
  TextPayload,
  ImagePayload,
  MixedPayload,
  NodeKind,
  EpistemicState,
} from "./types.ts";

import type {
  Node,
  NodeId,
  BlobId,
  Timestamp,
  Payload,
  TextPayload,
  ImagePayload,
  MixedPayload,
  NodeKind,
  EpistemicState,
} from "./types.ts";

// ── Node生成 ──

/**
 * 新しいNodeを生成する。
 * IDは内部で一意生成される。
 * epistemicState は省略時 "unsure" をデフォルトとする。
 */
export function createNode(_params: {
  payload: Payload;
  kind?: NodeKind;
  epistemicState?: EpistemicState;
}): Node {
  throw new Error("not implemented");
}

/**
 * Nodeの一部フィールドを差し替えた新しいNodeを返す。
 * 元のNodeは変更されない。
 */
export function updateNode(
  _node: Node,
  _patch: Partial<Pick<Node, "payload" | "kind" | "epistemicState">>,
): Node {
  throw new Error("not implemented");
}

// ── Payload判定 ──

/** PayloadがテキストのみかどうかをType Guardで判定する。 */
export function isTextPayload(_p: Payload): _p is TextPayload {
  throw new Error("not implemented");
}

/**
 * Payloadが画像を含むかどうかを判定する。
 * ImagePayload と MixedPayload の両方で true を返す。
 */
export function hasImage(_p: Payload): _p is ImagePayload | MixedPayload {
  throw new Error("not implemented");
}

/**
 * Payloadからテキスト部分を抽出する。
 * TextPayload → text, MixedPayload → memo, ImagePayload → ""
 */
export function extractText(_p: Payload): string {
  throw new Error("not implemented");
}

/**
 * PayloadからBlobIdを抽出する。
 * ImagePayload / MixedPayload → blobId, TextPayload → null
 */
export function extractBlobId(_p: Payload): BlobId | null {
  throw new Error("not implemented");
}

// ── EpistemicState操作 ──

/**
 * EpistemicStateの確信度順序を数値で返す。
 * certain=4, likely=3, hypothesis=2, speculative=1, unsure=0
 */
export function epistemicWeight(_state: EpistemicState): number {
  throw new Error("not implemented");
}

/** 二つのEpistemicStateのうち、より確信度が高い方を返す。 */
export function higherEpistemic(
  _a: EpistemicState,
  _b: EpistemicState,
): EpistemicState {
  throw new Error("not implemented");
}

/** 全EpistemicStateを確信度順に並べた配列。 */
export const EPISTEMIC_ORDER: readonly EpistemicState[] = [
  "certain",
  "likely",
  "hypothesis",
  "speculative",
  "unsure",
];

// ── ID生成 ──

/** 一意なNodeIdを生成する。 */
export function generateNodeId(): NodeId {
  throw new Error("not implemented");
}

/** 一意なBlobIdを生成する。 */
export function generateBlobId(): BlobId {
  throw new Error("not implemented");
}

/** 現在時刻のTimestampを生成する。 */
export function now(): Timestamp {
  throw new Error("not implemented");
}
