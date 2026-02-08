# storage/event-store/ — イベントストアコンポーネント

## 1. 概要

本コンポーネントはThoughtEvent・Nodeスナップショット・Sessionの
**永続化API**を提供する。アプリケーション層とIndexedDB基盤層（db/）の間に位置し、
ドメイン用語でのCRUD操作を公開する。

イベントソーシングの中核であり、ThoughtEventの追記・クエリと
Nodeスナップショットの読み書きを統合的に管理する。

---

## 2. 責務

- ThoughtEventの追記（append-only）
- ThoughtEventの時系列クエリ（Node別・Session別・期間別）
- Nodeスナップショットのupsert / 全件取得
- Sessionの作成・更新・取得
- イベントログからのNode状態再構成（リプレイ）
- トランザクション制御（一括書き込みのアトミック性保証）

### 責務に含まれないもの

- IndexedDBのスキーマ定義・マイグレーション（→ db/）
- バイナリデータ（画像Blob）の保存（→ blob-store/）
- ドメインロジック（→ model/）

---

## 3. 設計原則

1. **ThoughtEventは追記専用** — 更新・削除しない
2. **スナップショットは最適化** — 起動高速化のためにNodeの現在状態もキャッシュ
3. **非同期API** — すべてのI/O操作はPromiseを返す
4. **model/ の型をそのまま保存** — storage固有のDTO変換を最小化する
5. **db/ に委譲** — IndexedDBの生のAPIはdb/に閉じ込める

---

## 4. 公開データ構造

### 4.1 EventQuery

```typescript
/**
 * ThoughtEventの検索条件。
 * 複数条件はAND結合。
 */
interface EventQuery {
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
```

### 4.2 EventPage

```typescript
/**
 * ページネーション付きイベント結果。
 * 大量のイベントを段階的に取得する。
 */
interface EventPage {
  readonly events: readonly ThoughtEvent[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly cursor: string | null;
}
```

### 4.3 NodeSnapshot

```typescript
/**
 * Nodeの現在状態のスナップショット。
 * model/node/ の Node に加えて、永続化メタデータを持つ。
 */
interface NodeSnapshot {
  readonly node: Node;
  readonly dormancyState: DormancyState;
  readonly updatedAt: Timestamp;
}
```

### 4.4 StoreStats

```typescript
/**
 * ストアの統計情報。
 * デバッグ・容量監視に使用。
 */
interface StoreStats {
  readonly eventCount: number;
  readonly nodeCount: number;
  readonly sessionCount: number;
  readonly estimatedSizeBytes: number;
}
```

### 4.5 BatchOperation

```typescript
/**
 * 一括操作のための命令。
 * トランザクション内でアトミックに実行される。
 */
type BatchOperation =
  | { readonly type: "append_event"; readonly event: ThoughtEvent }
  | { readonly type: "save_node"; readonly snapshot: NodeSnapshot }
  | { readonly type: "save_session"; readonly session: Session };
```

---

## 5. 公開インターフェース

### 5.1 EventStore

```typescript
/**
 * イベント・Node・Sessionの永続化を統合管理するストア。
 * アプリケーション層はこのインターフェースのみを使用する。
 */
interface EventStore {
  // ── ThoughtEvent ──

  /**
   * ThoughtEventを追記する。
   * 関連するNodeスナップショットも自動更新する。
   */
  appendEvent(event: ThoughtEvent): Promise<void>;

  /**
   * 複数のThoughtEventを一括追記する。
   * トランザクション内でアトミックに実行。
   */
  appendEvents(events: readonly ThoughtEvent[]): Promise<void>;

  /**
   * EventQueryに基づいてイベントを検索する。
   */
  queryEvents(query: EventQuery): Promise<readonly ThoughtEvent[]>;

  /**
   * ページネーション付きイベント検索。
   */
  queryEventsPaged(
    query: EventQuery,
    cursor?: string
  ): Promise<EventPage>;

  /**
   * 全イベント数を返す。
   */
  countEvents(query?: EventQuery): Promise<number>;

  // ── Node スナップショット ──

  /**
   * Nodeスナップショットを保存する（upsert）。
   */
  saveNode(snapshot: NodeSnapshot): Promise<void>;

  /**
   * 全Nodeスナップショットを取得する。
   */
  getAllNodes(): Promise<readonly NodeSnapshot[]>;

  /**
   * 指定IDのNodeスナップショットを取得する。
   */
  getNode(nodeId: NodeId): Promise<NodeSnapshot | null>;

  /**
   * 指定IDのNodeスナップショットを削除する。
   * （通常はDormancy.Archivedで処理するため、非推奨）
   */
  deleteNode(nodeId: NodeId): Promise<void>;

  // ── Session ──

  /**
   * Sessionを保存する（upsert）。
   */
  saveSession(session: Session): Promise<void>;

  /**
   * 全Sessionを取得する。
   */
  getAllSessions(): Promise<readonly Session[]>;

  /**
   * 指定IDのSessionを取得する。
   */
  getSession(sessionId: SessionId): Promise<Session | null>;

  // ── バッチ操作 ──

  /**
   * 複数の操作をトランザクション内でアトミックに実行する。
   */
  batch(operations: readonly BatchOperation[]): Promise<void>;

  // ── ユーティリティ ──

  /**
   * ストアの統計情報を取得する。
   */
  getStats(): Promise<StoreStats>;

  /**
   * 全データをクリアする。
   * 開発・テスト用。本番では使用しない。
   */
  clear(): Promise<void>;
}
```

### 5.2 EventStore 生成

```typescript
/**
 * EventStoreを生成して初期化する。
 * 内部でdb/のIndexedDB接続を行う。
 */
function createEventStore(options?: {
  dbName?: string;
}): Promise<EventStore>;
```

### 5.3 リプレイ

```typescript
/**
 * イベントログからNodeの現在状態を再構成する。
 *
 * スナップショットが破損した場合の復旧手段。
 * 全イベントを時系列順に再生し、各NodeのNodeSnapshotを再構築する。
 */
function replayEvents(
  events: readonly ThoughtEvent[]
): ReadonlyMap<NodeId, NodeSnapshot>;

/**
 * 特定Nodeのイベント履歴から、任意時点の状態を復元する。
 */
function replayNodeAt(
  events: readonly ThoughtEvent[],
  nodeId: NodeId,
  at: Timestamp
): NodeSnapshot | null;
```

---

## 6. ファイル構成（想定）

```
storage/event-store/
├── COMPONENT.md        # 本ドキュメント
├── types.ts            # EventQuery, EventPage, NodeSnapshot, StoreStats, BatchOperation
├── event-store.ts      # EventStore実装
├── replay.ts           # replayEvents, replayNodeAt
└── index.ts            # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
storage/event-store/ → storage/db/        (DB接続、トランザクション操作)
storage/event-store/ → model/node/        (Node, NodeId, Payload, EpistemicState, Timestamp)
storage/event-store/ → model/event/       (ThoughtEvent, EventType, EventId, Session, SessionId)
storage/event-store/ → model/meta/        (DormancyState)
```

event-store/ はstorage/db/ を通じてIndexedDBにアクセスし、
model/ の型をそのまま保存・復元する。

blob-store/ には依存しない（画像Blobの保存は別経路）。

---

## 8. 不変条件

1. **appendEvent は冪等ではない** — 同一EventIdの重複挿入はエラー
2. **queryEvents の結果は常にtimestamp順**（order指定に従う）
3. **saveNode はupsert** — 既存Nodeがあれば上書き、なければ新規作成
4. **batch 内の操作はアトミック** — 一つでも失敗したら全体をロールバック
5. **clear() は全ObjectStoreを空にする** — 復旧不可能
6. **replayEvents の結果は同一入力に対して決定的**

---

## 9. appendEvent の内部フロー

```
appendEvent(event)
  │
  ├─ 1. event を events ストアに追記
  ├─ 2. event.type に応じてNodeスナップショットを更新
  │     ├─ "created" → 新規NodeSnapshotを作成して保存
  │     ├─ "edited"  → 既存NodeSnapshotのpayload/kindを更新
  │     ├─ "epistemic_changed" → epistemicStateを更新
  │     ├─ "dormancy_changed" → dormancyStateを更新
  │     └─ その他 → スナップショット更新なし（イベントのみ記録）
  └─ 3. トランザクションをコミット
```

EventとNodeスナップショットは同一トランザクション内で
アトミックに更新され、不整合が発生しない。

---

## 10. エラーハンドリング

```
エラー種別                  対応
──────────────────────────────────────────
重複EventId               → DuplicateEventError を throw
存在しないNodeIdの更新     → NodeNotFoundError を throw
トランザクション失敗       → リトライせずエラーを上位に伝搬
IndexedDB容量超過         → QuotaExceededError を throw
```

上位層がエラーをキャッチし、ユーザーへの通知を行う。
event-store/ はエラーを握りつぶさない。
