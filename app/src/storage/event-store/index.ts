export type {
  EventQuery,
  EventPage,
  NodeSnapshot,
  StoreStats,
  BatchOperation,
  EventStore,
} from "./types.ts";

import type { NodeSnapshot } from "./types.ts";
import type { NodeId, Timestamp } from "../../model/node/index.ts";
import type { ThoughtEvent } from "../../model/event/index.ts";

export { createEventStore } from "./event-store.ts";

// ── リプレイ（スタブ） ──

/**
 * イベントログからNodeの現在状態を再構成する。
 * スナップショットが破損した場合の復旧手段。
 */
export function replayEvents(
  _events: readonly ThoughtEvent[],
): ReadonlyMap<NodeId, NodeSnapshot> {
  throw new Error("not implemented");
}

/**
 * 特定Nodeのイベント履歴から、任意時点の状態を復元する。
 */
export function replayNodeAt(
  _events: readonly ThoughtEvent[],
  _nodeId: NodeId,
  _at: Timestamp,
): NodeSnapshot | null {
  throw new Error("not implemented");
}
