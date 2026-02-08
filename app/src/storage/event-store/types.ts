import type { NodeId, Node, Timestamp } from "../../model/node/index.ts";
import type {
  ThoughtEvent,
  EventType,
  Session,
  SessionId,
} from "../../model/event/index.ts";
import type { DormancyState } from "../../model/meta/index.ts";

/**
 * ThoughtEventの検索条件。
 * 複数条件はAND結合。
 */
export interface EventQuery {
  /** 特定NodeのEvent */
  readonly nodeId?: NodeId;
  /** 特定SessionのEvent */
  readonly sessionId?: SessionId;
  /** イベント種別で絞り込み */
  readonly types?: readonly EventType[];
  /** この時刻以降のEvent */
  readonly after?: Timestamp;
  /** この時刻以前のEvent */
  readonly before?: Timestamp;
  /** 取得上限（0 = 無制限） */
  readonly limit?: number;
  /** ソート順 */
  readonly order?: "asc" | "desc";
}

/**
 * ページネーション付きイベント結果。
 */
export interface EventPage {
  readonly events: readonly ThoughtEvent[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly cursor: string | null;
}

/**
 * Nodeの現在状態のスナップショット。
 * model/node/ の Node に加えて、永続化メタデータを持つ。
 */
export interface NodeSnapshot {
  readonly node: Node;
  readonly dormancyState: DormancyState;
  readonly updatedAt: Timestamp;
}

/**
 * ストアの統計情報。
 */
export interface StoreStats {
  readonly eventCount: number;
  readonly nodeCount: number;
  readonly sessionCount: number;
  readonly estimatedSizeBytes: number;
}

/**
 * 一括操作のための命令。
 * トランザクション内でアトミックに実行される。
 */
export type BatchOperation =
  | { readonly type: "append_event"; readonly event: ThoughtEvent }
  | { readonly type: "save_node"; readonly snapshot: NodeSnapshot }
  | { readonly type: "save_session"; readonly session: Session };

/**
 * イベント・Node・Sessionの永続化を統合管理するストア。
 */
export interface EventStore {
  // ── ThoughtEvent ──

  /** ThoughtEventを追記する。関連するNodeスナップショットも自動更新する。 */
  appendEvent(event: ThoughtEvent): Promise<void>;

  /** 複数のThoughtEventを一括追記する。アトミックに実行。 */
  appendEvents(events: readonly ThoughtEvent[]): Promise<void>;

  /** EventQueryに基づいてイベントを検索する。 */
  queryEvents(query: EventQuery): Promise<readonly ThoughtEvent[]>;

  /** ページネーション付きイベント検索。 */
  queryEventsPaged(
    query: EventQuery,
    cursor?: string,
  ): Promise<EventPage>;

  /** 全イベント数を返す。 */
  countEvents(query?: EventQuery): Promise<number>;

  // ── Node スナップショット ──

  /** Nodeスナップショットを保存する（upsert）。 */
  saveNode(snapshot: NodeSnapshot): Promise<void>;

  /** 全Nodeスナップショットを取得する。 */
  getAllNodes(): Promise<readonly NodeSnapshot[]>;

  /** 指定IDのNodeスナップショットを取得する。 */
  getNode(nodeId: NodeId): Promise<NodeSnapshot | null>;

  /** 指定IDのNodeスナップショットを削除する。 */
  deleteNode(nodeId: NodeId): Promise<void>;

  // ── Session ──

  /** Sessionを保存する（upsert）。 */
  saveSession(session: Session): Promise<void>;

  /** 全Sessionを取得する。 */
  getAllSessions(): Promise<readonly Session[]>;

  /** 指定IDのSessionを取得する。 */
  getSession(sessionId: SessionId): Promise<Session | null>;

  // ── バッチ操作 ──

  /** 複数の操作をトランザクション内でアトミックに実行する。 */
  batch(operations: readonly BatchOperation[]): Promise<void>;

  // ── ユーティリティ ──

  /** ストアの統計情報を取得する。 */
  getStats(): Promise<StoreStats>;

  /** 全データをクリアする。開発・テスト用。 */
  clear(): Promise<void>;
}
