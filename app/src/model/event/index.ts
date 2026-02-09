export type {
  EventId,
  SessionId,
  ThoughtEvent,
  EventType,
  EventDetail,
  CreatedDetail,
  EditedDetail,
  MovedDetail,
  LinkedDetail,
  UnlinkedDetail,
  QuestionedDetail,
  EpistemicChangedDetail,
  DormancyChangedDetail,
  Session,
  EventFilter,
} from "./types.ts";

import type {
  ThoughtEvent,
  EventDetail,
  EventFilter,
  Session,
  SessionId,
  EventId,
} from "./types.ts";

import type { NodeId, Payload, NodeKind } from "../node/index.ts";

// ── ThoughtEvent 生成 ──

/** Nodeの新規作成イベントを生成する。 */
export function createCreatedEvent(_params: {
  nodeId: NodeId;
  payload: Payload;
  kind: NodeKind;
  sessionId?: SessionId;
}): ThoughtEvent {
  throw new Error("not implemented");
}

/** Nodeの編集イベントを生成する。 */
export function createEditedEvent(_params: {
  nodeId: NodeId;
  field: "payload" | "kind";
  before: Payload | NodeKind;
  after: Payload | NodeKind;
  sessionId?: SessionId;
}): ThoughtEvent {
  throw new Error("not implemented");
}

/** Nodeの移動イベントを生成する。 */
export function createMovedEvent(_params: {
  nodeId: NodeId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  sessionId?: SessionId;
}): ThoughtEvent {
  throw new Error("not implemented");
}

/** Nodeのリンクイベントを生成する。 */
export function createLinkedEvent(_params: {
  nodeId: NodeId;
  targetNodeId: NodeId;
  relation: string;
  sessionId?: SessionId;
}): ThoughtEvent {
  throw new Error("not implemented");
}

/** 汎用イベント生成。任意のEventDetailを受け取る。 */
export function createEvent(_params: {
  nodeId: NodeId;
  detail: EventDetail;
  sessionId?: SessionId;
}): ThoughtEvent {
  throw new Error("not implemented");
}

// ── Session 生成・終了 ──

/** 新しいSessionを開始する。 */
export function startSession(_purpose?: string): Session {
  throw new Error("not implemented");
}

/** Sessionを終了する（endedAtを付与した新しいSessionを返す）。 */
export function endSession(_session: Session): Session {
  throw new Error("not implemented");
}

/** Sessionが終了済みかどうかを判定する。 */
export function isSessionEnded(_session: Session): boolean {
  throw new Error("not implemented");
}

// ── ID生成 ──

/** 一意なEventIdを生成する。 */
export function generateEventId(): EventId {
  throw new Error("not implemented");
}

/** 一意なSessionIdを生成する。 */
export function generateSessionId(): SessionId {
  throw new Error("not implemented");
}

// ── イベント列操作 ──

/** イベント列をEventFilterで絞り込む。 */
export function filterEvents(
  _events: readonly ThoughtEvent[],
  _filter: EventFilter,
): ThoughtEvent[] {
  throw new Error("not implemented");
}

/** イベント列をtimestamp昇順でソートする。 */
export function sortEventsByTime(
  _events: readonly ThoughtEvent[],
): ThoughtEvent[] {
  throw new Error("not implemented");
}

/** 特定NodeのCreatedイベントを探す。見つからない場合はnull。 */
export function findCreationEvent(
  _events: readonly ThoughtEvent[],
  _nodeId: NodeId,
): ThoughtEvent | null {
  throw new Error("not implemented");
}
