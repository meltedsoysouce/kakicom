# model/event/ — イベント・セッションコンポーネント

## 1. 概要

本コンポーネントは**ThoughtEvent（思考の変化記録）**と
**Session（探索のまとまり）**を定義する。

Nodeが「今の状態」を表すのに対し、
ThoughtEventは「何が起きたか」を時間軸で記録する。
Sessionはイベント群を「一回の探索」としてまとめる単位である。

イベントソーシングの基盤となるコンポーネントであり、
storage/event-store/ がこれらの型を永続化する。

---

## 2. 責務

- ThoughtEvent エンティティの型定義
- EventType（イベント種別）の型定義と判別
- Session エンティティの型定義
- イベントの生成ファクトリ関数
- セッションの開始・終了ファクトリ関数
- イベント列からのNode状態再構成ロジック

### 責務に含まれないもの

- イベントの永続化（→ storage/event-store/）
- イベントに基づく描画更新（→ canvas/）
- イベントに基づくProjection更新（→ projection/）

---

## 3. 設計原則

1. **イベントは不変** — 生成後に変更しない（append-only）
2. **イベントはNodeの派生事実** — Nodeに対する操作を記録するもの
3. **Sessionは省略可能** — session_idがないイベントも正当
4. **時間順序を前提とする** — timestampの昇順がイベントの因果順序

---

## 4. 公開データ構造

### 4.1 EventId / SessionId

```typescript
/**
 * ThoughtEventの一意識別子。
 */
type EventId = string & { readonly __brand: "EventId" };

/**
 * Sessionの一意識別子。
 */
type SessionId = string & { readonly __brand: "SessionId" };
```

### 4.2 ThoughtEvent

```typescript
/**
 * 思考の変化を記録する不変のイベント。
 *
 * Nodeに対する操作（作成・編集・移動等）が発生するたびに
 * 1つのThoughtEventが生成され、ログに追記される。
 *
 * 不変条件:
 *   - 生成後にフィールドを変更しない
 *   - 削除しない（論理削除もしない）
 */
interface ThoughtEvent {
  readonly id: EventId;
  readonly nodeId: NodeId;
  readonly type: EventType;
  readonly timestamp: Timestamp;
  readonly sessionId: SessionId | null;
  readonly detail: EventDetail;
}
```

### 4.3 EventType

```typescript
/**
 * イベントの種別。
 *
 * 各種別はNodeに対する操作の意味を表す。
 * EventDetailと対になり、種別ごとに付随データが異なる。
 */
type EventType =
  | "created"       // Nodeが新規作成された
  | "edited"        // NodeのPayloadまたはKindが変更された
  | "moved"         // Nodeが空間上で移動された
  | "linked"        // Nodeが他のNodeとリンクされた
  | "unlinked"      // Node間のリンクが解除された
  | "questioned"    // NodeにLLMまたはユーザーから問いが投げられた
  | "epistemic_changed"  // EpistemicStateが変更された
  | "dormancy_changed";  // DormancyStateが変更された
```

### 4.4 EventDetail

```typescript
/**
 * EventTypeに対応する付随データ。
 * discriminated union でイベント種別ごとの型安全性を確保する。
 */
type EventDetail =
  | CreatedDetail
  | EditedDetail
  | MovedDetail
  | LinkedDetail
  | UnlinkedDetail
  | QuestionedDetail
  | EpistemicChangedDetail
  | DormancyChangedDetail;

interface CreatedDetail {
  readonly type: "created";
  readonly initialPayload: Payload;
  readonly initialKind: NodeKind;
}

interface EditedDetail {
  readonly type: "edited";
  readonly field: "payload" | "kind";
  readonly before: Payload | NodeKind;
  readonly after: Payload | NodeKind;
}

interface MovedDetail {
  readonly type: "moved";
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

interface LinkedDetail {
  readonly type: "linked";
  readonly targetNodeId: NodeId;
  readonly relation: string;
}

interface UnlinkedDetail {
  readonly type: "unlinked";
  readonly targetNodeId: NodeId;
}

interface QuestionedDetail {
  readonly type: "questioned";
  readonly question: string;
  readonly voiceType: "self" | "llm" | "future_self" | "external";
}

interface EpistemicChangedDetail {
  readonly type: "epistemic_changed";
  readonly before: EpistemicState;
  readonly after: EpistemicState;
}

interface DormancyChangedDetail {
  readonly type: "dormancy_changed";
  readonly before: DormancyState;
  readonly after: DormancyState;
}
```

### 4.5 Session

```typescript
/**
 * 探索のまとまり。
 * 学習・デバッグ・創作の一区切りを表す。
 *
 * Sessionはユーザーが明示的に開始・終了するか、
 * タイムアウトで自動終了する。
 */
interface Session {
  readonly id: SessionId;
  readonly purpose: string | null;
  readonly startedAt: Timestamp;
  readonly endedAt: Timestamp | null;
}
```

### 4.6 EventFilter

```typescript
/**
 * イベント検索時のフィルタ条件。
 * storage/event-store/ への問い合わせに使用する。
 */
interface EventFilter {
  readonly nodeId?: NodeId;
  readonly sessionId?: SessionId;
  readonly types?: readonly EventType[];
  readonly after?: Timestamp;
  readonly before?: Timestamp;
}
```

---

## 5. 公開インターフェース

### 5.1 ThoughtEvent 生成

```typescript
/**
 * Nodeの新規作成イベントを生成する。
 */
function createCreatedEvent(params: {
  nodeId: NodeId;
  payload: Payload;
  kind: NodeKind;
  sessionId?: SessionId;
}): ThoughtEvent;

/**
 * Nodeの編集イベントを生成する。
 */
function createEditedEvent(params: {
  nodeId: NodeId;
  field: "payload" | "kind";
  before: Payload | NodeKind;
  after: Payload | NodeKind;
  sessionId?: SessionId;
}): ThoughtEvent;

/**
 * Nodeの移動イベントを生成する。
 */
function createMovedEvent(params: {
  nodeId: NodeId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  sessionId?: SessionId;
}): ThoughtEvent;

/**
 * Nodeのリンクイベントを生成する。
 */
function createLinkedEvent(params: {
  nodeId: NodeId;
  targetNodeId: NodeId;
  relation: string;
  sessionId?: SessionId;
}): ThoughtEvent;

/**
 * 汎用イベント生成。任意のEventDetailを受け取る。
 */
function createEvent(params: {
  nodeId: NodeId;
  detail: EventDetail;
  sessionId?: SessionId;
}): ThoughtEvent;
```

### 5.2 Session 生成・終了

```typescript
/**
 * 新しいSessionを開始する。
 */
function startSession(purpose?: string): Session;

/**
 * Sessionを終了する（endedAtを付与した新しいSessionを返す）。
 */
function endSession(session: Session): Session;

/**
 * Sessionが終了済みかどうかを判定する。
 */
function isSessionEnded(session: Session): boolean;
```

### 5.3 ID生成

```typescript
/**
 * 一意なEventIdを生成する。
 */
function generateEventId(): EventId;

/**
 * 一意なSessionIdを生成する。
 */
function generateSessionId(): SessionId;
```

### 5.4 イベント列操作

```typescript
/**
 * イベント列をEventFilterで絞り込む。
 * storage/が返したイベント列をメモリ上でさらにフィルタする用途。
 */
function filterEvents(
  events: readonly ThoughtEvent[],
  filter: EventFilter
): ThoughtEvent[];

/**
 * イベント列をtimestamp昇順でソートする。
 */
function sortEventsByTime(
  events: readonly ThoughtEvent[]
): ThoughtEvent[];

/**
 * 特定NodeのCreatedイベントを探す。
 * 見つからない場合はnullを返す。
 */
function findCreationEvent(
  events: readonly ThoughtEvent[],
  nodeId: NodeId
): ThoughtEvent | null;
```

---

## 6. ファイル構成（想定）

```
model/event/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # ThoughtEvent, EventType, EventDetail, Session, EventFilter
├── factory.ts         # createEvent, createCreatedEvent, startSession 等
├── filters.ts         # filterEvents, sortEventsByTime 等
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
model/event/ → model/node/  (NodeId, Payload, NodeKind, EpistemicState を参照)
model/event/ → model/meta/  (DormancyState を参照)
```

event/ は node/ と meta/ の型を参照するが、
projection/ や view/ には依存しない。

---

## 8. 不変条件

1. **ThoughtEventは生成後に変更されない**
2. **ThoughtEvent.id は一意である**
3. **ThoughtEvent.timestamp は生成時の現在時刻**
4. **EventDetail.type は ThoughtEvent.type と一致する**
5. **Session.startedAt は Session.endedAt より前**（endedAtがある場合）
6. **同一nodeIdの最初のイベントはtype="created"である**

---

## 9. 設計判断の根拠

### なぜEventDetailをdiscriminated unionにするか

EventTypeごとに付随データの形状が異なる。
type フィールドでパターンマッチすることで、
TypeScriptのナローイングが効き、
各イベントの処理を型安全に記述できる。

### なぜSessionIdをnullableにするか

すべての操作がSession内で行われるとは限らない。
一時的なメモや、Session開始前の操作も記録したい。
Sessionは「あれば便利」な文脈情報であり、強制しない。

### なぜMovedDetailに座標を持たせるか

Nodeは位置情報を持たないが、「移動した」という事実と
差分（from → to）はイベントに記録する。
これにより、特定のProjection/View内での移動履歴を再現できる。
