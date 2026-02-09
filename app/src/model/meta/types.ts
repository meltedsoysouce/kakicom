import type { NodeId, Timestamp, EpistemicState } from "../node/index.ts";

// ── Voice（思考主体） ──

/**
 * 誰の視点・発話かを区別するための概念。
 *
 * LLMの意見と自分の仮説を混同しないために必要。
 * 理解の「所有権」を可視化する。
 */
export type Voice = SelfVoice | LLMVoice | FutureSelfVoice | ExternalVoice;

/** 自分自身の思考。デフォルト。 */
export interface SelfVoice {
  readonly type: "self";
}

/**
 * LLMが生成した思考・提案。
 * name でどのLLMかを識別する。
 */
export interface LLMVoice {
  readonly type: "llm";
  readonly name: string;
}

/** 未来の自分に向けたメモ・注意書き。 */
export interface FutureSelfVoice {
  readonly type: "future_self";
}

/**
 * 外部ソースからの引用・参照。
 * 書籍、論文、Webページ等。
 */
export interface ExternalVoice {
  readonly type: "external";
  readonly source: string;
}

/**
 * 特定Nodeに対するVoiceの帰属情報。
 * 「このNodeの内容は誰が書いたか / 誰の意見か」を記録する。
 */
export interface VoiceAttribution {
  readonly nodeId: NodeId;
  readonly voice: Voice;
  readonly assignedAt: Timestamp;
}

// ── Salience（注意の強さ） ──

/**
 * Nodeに対する注意の重み。
 * 「今どこを見るべきか」を支援する概念。
 *
 * weightは0.0〜1.0の範囲。高いほど注目度が高い。
 */
export interface Salience {
  readonly nodeId: NodeId;
  readonly weight: number;
  readonly reason: SalienceReason | null;
  readonly computedAt: Timestamp;
}

/**
 * Salienceの算出理由。
 */
export type SalienceReason =
  | RecentlyTouchedReason
  | HighlyLinkedReason
  | LLMHighlightedReason
  | UserPinnedReason
  | UnsureEpistemicReason;

export interface RecentlyTouchedReason {
  readonly type: "recently_touched";
  readonly lastEventAt: Timestamp;
}

export interface HighlyLinkedReason {
  readonly type: "highly_linked";
  readonly linkCount: number;
}

export interface LLMHighlightedReason {
  readonly type: "llm_highlighted";
  readonly llmName: string;
  readonly explanation: string;
}

export interface UserPinnedReason {
  readonly type: "user_pinned";
}

export interface UnsureEpistemicReason {
  readonly type: "unsure_epistemic";
  readonly currentState: EpistemicState;
}

/**
 * Salience算出時の入力要素。
 * 複数のFactorを統合してweightを算出する。
 */
export interface SalienceFactor {
  readonly source: string;
  readonly weight: number;
  readonly reason: SalienceReason;
}

// ── Dormancy（忘却・休眠） ──

/**
 * Nodeの活性状態。
 * 使われないNodeは自然に薄れ、必要になれば再浮上する。
 *
 * 状態遷移:
 *   Active → Cooling → Dormant → Archived
 *   (逆方向の遷移も可能: 再浮上)
 */
export type DormancyState = "active" | "cooling" | "dormant" | "archived";

/**
 * NodeごとのDormancy状態記録。
 */
export interface DormancyRecord {
  readonly nodeId: NodeId;
  readonly state: DormancyState;
  readonly lastActiveAt: Timestamp;
  readonly transitionedAt: Timestamp;
}

/**
 * Dormancy自動遷移のポリシー。
 * 一定期間操作がないNodeを自動的にCooling / Dormantに遷移させる。
 */
export interface DormancyPolicy {
  /** Active → Cooling に遷移するまでの無操作期間（ミリ秒） */
  readonly coolingThresholdMs: number;
  /** Cooling → Dormant に遷移するまでの無操作期間（ミリ秒） */
  readonly dormantThresholdMs: number;
  /** Dormant → Archived に自動遷移するか（falseなら手動のみ） */
  readonly autoArchive: boolean;
  /** autoArchive=true の場合の無操作期間（ミリ秒） */
  readonly archiveThresholdMs: number | null;
}
