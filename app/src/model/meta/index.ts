export type {
  Voice,
  SelfVoice,
  LLMVoice,
  FutureSelfVoice,
  ExternalVoice,
  VoiceAttribution,
  Salience,
  SalienceReason,
  RecentlyTouchedReason,
  HighlyLinkedReason,
  LLMHighlightedReason,
  UserPinnedReason,
  UnsureEpistemicReason,
  SalienceFactor,
  DormancyState,
  DormancyRecord,
  DormancyPolicy,
} from "./types.ts";

import type {
  Voice,
  SelfVoice,
  LLMVoice,
  FutureSelfVoice,
  ExternalVoice,
  VoiceAttribution,
  Salience,
  SalienceFactor,
  DormancyState,
  DormancyRecord,
  DormancyPolicy,
} from "./types.ts";

import type { NodeId, Timestamp, EpistemicState } from "../node/index.ts";

// ── Voice 生成・判定 ──

/** Self Voice を生成する。 */
export function selfVoice(): SelfVoice {
  throw new Error("not implemented");
}

/** LLM Voice を生成する。 */
export function llmVoice(_name: string): LLMVoice {
  throw new Error("not implemented");
}

/** FutureSelf Voice を生成する。 */
export function futureSelfVoice(): FutureSelfVoice {
  throw new Error("not implemented");
}

/** External Voice を生成する。 */
export function externalVoice(_source: string): ExternalVoice {
  throw new Error("not implemented");
}

/** VoiceがLLM由来かどうかを判定する。 */
export function isLLMVoice(_voice: Voice): _voice is LLMVoice {
  throw new Error("not implemented");
}

/** Voiceの表示ラベルを返す。 */
export function voiceLabel(_voice: Voice): string {
  throw new Error("not implemented");
}

/** VoiceAttributionを生成する。 */
export function attributeVoice(
  _nodeId: NodeId,
  _voice: Voice,
): VoiceAttribution {
  throw new Error("not implemented");
}

// ── Salience 算出・操作 ──

/** 複数のSalienceFactorからSalienceを算出する。 */
export function computeSalience(
  _nodeId: NodeId,
  _factors: readonly SalienceFactor[],
): Salience {
  throw new Error("not implemented");
}

/** 時間減衰を考慮したSalienceFactorを生成する。 */
export function recencyFactor(
  _lastEventAt: Timestamp,
  _now: Timestamp,
): SalienceFactor {
  throw new Error("not implemented");
}

/** リンク数に基づくSalienceFactorを生成する。 */
export function linkCountFactor(_linkCount: number): SalienceFactor {
  throw new Error("not implemented");
}

/** EpistemicStateに基づくSalienceFactorを生成する。 */
export function epistemicFactor(_state: EpistemicState): SalienceFactor {
  throw new Error("not implemented");
}

/** Salience配列をweight降順でソートする。 */
export function sortByWeight(
  _saliences: readonly Salience[],
): Salience[] {
  throw new Error("not implemented");
}

/** デフォルトのSalience（weight=0）を生成する。 */
export function defaultSalience(_nodeId: NodeId): Salience {
  throw new Error("not implemented");
}

// ── Dormancy 状態遷移 ──

/** デフォルトのDormancyPolicyを返す。 */
export function defaultDormancyPolicy(): DormancyPolicy {
  throw new Error("not implemented");
}

/** DormancyRecordを初期状態（Active）で生成する。 */
export function initDormancy(_nodeId: NodeId): DormancyRecord {
  throw new Error("not implemented");
}

/** 最終操作時刻とポリシーに基づき、次のDormancyStateを判定する。 */
export function evaluateDormancy(
  _record: DormancyRecord,
  _policy: DormancyPolicy,
  _now: Timestamp,
): DormancyState | null {
  throw new Error("not implemented");
}

/** DormancyRecordの状態を遷移させる（新しいRecordを返す）。 */
export function transitionDormancy(
  _record: DormancyRecord,
  _newState: DormancyState,
): DormancyRecord {
  throw new Error("not implemented");
}

/** Nodeを再浮上させる（Active状態に戻す）。 */
export function reactivate(_record: DormancyRecord): DormancyRecord {
  throw new Error("not implemented");
}

/**
 * DormancyStateの深さを数値で返す。
 * active=0, cooling=1, dormant=2, archived=3
 */
export function dormancyDepth(_state: DormancyState): number {
  throw new Error("not implemented");
}

/** 全DormancyStateを深さ順に並べた配列。 */
export const DORMANCY_ORDER: readonly DormancyState[] = [
  "active",
  "cooling",
  "dormant",
  "archived",
];
