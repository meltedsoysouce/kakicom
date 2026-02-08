import type {
  NodeId,
  Payload,
  NodeKind,
  EpistemicState,
  Timestamp,
} from "../node/index.ts";
import type { DormancyState } from "../meta/index.ts";

/**
 * ThoughtEventの一意識別子。
 */
export type EventId = string & { readonly __brand: "EventId" };

/**
 * Sessionの一意識別子。
 */
export type SessionId = string & { readonly __brand: "SessionId" };

/**
 * 思考の変化を記録する不変のイベント。
 *
 * 不変条件:
 *   - 生成後にフィールドを変更しない
 *   - 削除しない（論理削除もしない）
 */
export interface ThoughtEvent {
  readonly id: EventId;
  readonly nodeId: NodeId;
  readonly type: EventType;
  readonly timestamp: Timestamp;
  readonly sessionId: SessionId | null;
  readonly detail: EventDetail;
}

/**
 * イベントの種別。
 * 各種別はNodeに対する操作の意味を表す。
 */
export type EventType =
  | "created"
  | "edited"
  | "moved"
  | "linked"
  | "unlinked"
  | "questioned"
  | "epistemic_changed"
  | "dormancy_changed";

/**
 * EventTypeに対応する付随データ。
 * discriminated union でイベント種別ごとの型安全性を確保する。
 */
export type EventDetail =
  | CreatedDetail
  | EditedDetail
  | MovedDetail
  | LinkedDetail
  | UnlinkedDetail
  | QuestionedDetail
  | EpistemicChangedDetail
  | DormancyChangedDetail;

export interface CreatedDetail {
  readonly type: "created";
  readonly initialPayload: Payload;
  readonly initialKind: NodeKind;
}

export interface EditedDetail {
  readonly type: "edited";
  readonly field: "payload" | "kind";
  readonly before: Payload | NodeKind;
  readonly after: Payload | NodeKind;
}

export interface MovedDetail {
  readonly type: "moved";
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

export interface LinkedDetail {
  readonly type: "linked";
  readonly targetNodeId: NodeId;
  readonly relation: string;
}

export interface UnlinkedDetail {
  readonly type: "unlinked";
  readonly targetNodeId: NodeId;
}

export interface QuestionedDetail {
  readonly type: "questioned";
  readonly question: string;
  readonly voiceType: "self" | "llm" | "future_self" | "external";
}

export interface EpistemicChangedDetail {
  readonly type: "epistemic_changed";
  readonly before: EpistemicState;
  readonly after: EpistemicState;
}

export interface DormancyChangedDetail {
  readonly type: "dormancy_changed";
  readonly before: DormancyState;
  readonly after: DormancyState;
}

/**
 * 探索のまとまり。
 * 学習・デバッグ・創作の一区切りを表す。
 */
export interface Session {
  readonly id: SessionId;
  readonly purpose: string | null;
  readonly startedAt: Timestamp;
  readonly endedAt: Timestamp | null;
}

/**
 * イベント検索時のフィルタ条件。
 */
export interface EventFilter {
  readonly nodeId?: NodeId;
  readonly sessionId?: SessionId;
  readonly types?: readonly EventType[];
  readonly after?: Timestamp;
  readonly before?: Timestamp;
}
