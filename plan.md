# Edge 実装計画

## 現状分析

### 既存の基盤（実装済み）

| 要素 | ファイル | 状態 |
|------|---------|------|
| `Edge` 型 | `model/projection/types.ts:96-102` | 定義済（sourceNodeId, targetNodeId, relation, label, weight） |
| `EdgeRelation` 型 | `model/projection/types.ts:107-114` | 定義済（7種: causal, prerequisite, similar, contradicts, depends_on, associated, custom） |
| `createEdge()` | `model/projection/index.ts:42-56` | 実装済 |
| `addEdge()` | `model/projection/output.ts:22-24` | 実装済（ProjectionOutput操作用） |
| `RenderableEdge` 型 | `canvas/renderer/types.ts:128-134` | 定義済（sourcePosition, targetPosition, relation, label, weight） |
| `EdgeStyle` 型 | `canvas/renderer/types.ts:91-97` | 定義済 |
| `RenderScene.edges` | `canvas/renderer/types.ts:151` | フィールド存在、常に空配列 |
| テーマの `edgeDefaults` | `canvas/renderer/theme.ts` | 3テーマ全てに色・線幅・矢印サイズ定義済 |
| `HitTarget.edge` | `canvas/hit-test/types.ts:10-14` | 型定義済、実装なし |
| `LinkedDetail` / `UnlinkedDetail` | `model/event/types.ts:85-94` | イベント型定義済 |
| `ViewConfig.showEdges` | `model/view/types.ts` | 設定フィールド存在 |

### 未実装（本計画で実装する）

1. **Edge の一意識別子**: 現 `Edge` 型に `id` フィールドがない → 選択・削除・永続化に必須
2. **`draw-edge.ts`**: Canvas 2D 描画関数
3. **renderer.ts への統合**: 描画ループにEdge描画を追加
4. **Edge 永続化**: IndexedDB スキーマ v2 + EventStore 拡張
5. **AppState.edges**: アプリ状態にEdge集合を追加
6. **rebuildScene でのEdge構築**: Edge + positions → RenderableEdge 変換
7. **Edge 作成 UI**: DragState 拡張 + InputAction 追加
8. **Edge ヒットテスト**: 線分への距離判定
9. **Edge 選択・削除**: 選択状態 + Delete キー

---

## フェーズ構成

```
Phase 1: model 拡張（EdgeId 追加）
    ↓
Phase 2: storage 拡張（永続化）   Phase 3: renderer 実装（描画）
    ↓                                ↓
Phase 4: app 統合（状態管理 + シーン構築）
    ↓
Phase 5: input 拡張（作成 UI）   Phase 6: hit-test 拡張（選択・削除）
```

Phase 2 と Phase 3 は相互依存なし（並列実行可）。
Phase 5 と Phase 6 は相互依存なし（並列実行可）。

---

## Phase 1: model 拡張 — EdgeId の追加

### 目的

`Edge` 型にブランド型 `EdgeId` を追加し、永続化・選択・削除の基盤を整える。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/model/projection/types.ts` | 編集 |
| `app/src/model/projection/index.ts` | 編集 |

### 変更内容

#### 1. `app/src/model/projection/types.ts`

`Edge` インターフェースに `id` フィールドを追加する。

```typescript
// 追加: EdgeId ブランド型（ProjectionIdの直後に追加）
export type EdgeId = string & { readonly __brand: "EdgeId" };

// Edge インターフェースを変更
export interface Edge {
  readonly id: EdgeId;             // ← 追加
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
}
```

#### 2. `app/src/model/projection/index.ts`

`createEdge()` を更新して `id` を生成する。`EdgeId` 型をエクスポートに追加する。

```typescript
// index.ts の export type に EdgeId を追加
// createEdge() 内で id: crypto.randomUUID() as EdgeId を生成
```

### 受入条件

- `pnpm build` が `app/` ディレクトリ内で成功する（型エラーなし）
- `EdgeId` 型が `model/projection/index.ts` からエクスポートされている
- `createEdge()` が `EdgeId` 付きの `Edge` を返す

### コンテキスト補足

- ブランド型の規約: `string & { readonly __brand: "XxxId" }`（`NodeId`, `ProjectionId` と同パターン）
- `createEdge()` は現在 `model/projection/index.ts:42-56` にある
- `Edge` 型は `output.ts` の `addEdge()` でも使われている（引数型のみなので id 追加でも互換性あり）
- `RenderableEdge`（`canvas/renderer/types.ts`）には `id` を追加**しない**（描画に不要）

---

## Phase 2: storage 拡張 — Edge 永続化

### 目的

IndexedDB に `edges` ObjectStore を追加し、Edge の CRUD を EventStore に実装する。

### 前提

Phase 1 が完了していること（`Edge` 型に `id: EdgeId` が存在する）。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/storage/db/schema.ts` | 編集 |
| `app/src/storage/event-store/types.ts` | 編集 |
| `app/src/storage/event-store/event-store.ts` | 編集 |

### 変更内容

#### 1. `app/src/storage/db/schema.ts`

DB バージョンを 2 に上げ、`edges` ObjectStore をマイグレーション v2 で追加する。

```typescript
export const STORE_NAMES = {
  EVENTS: "events",
  NODES: "nodes",
  SESSIONS: "sessions",
  BLOBS: "blobs",
  EDGES: "edges",       // ← 追加
} as const;

export const KAKICOM_DB_CONFIG: DatabaseConfig = {
  name: "kakicom",
  version: 2,            // ← 1 → 2
  migrations: [
    {
      version: 1,
      migrate(db) { /* 既存のまま */ },
    },
    {
      version: 2,
      migrate(db) {
        const edges = db.createObjectStore("edges", { keyPath: "id" });
        edges.createIndex("source_node_id", "sourceNodeId", { unique: false });
        edges.createIndex("target_node_id", "targetNodeId", { unique: false });
      },
    },
  ],
};
```

#### 2. `app/src/storage/event-store/types.ts`

`PersistedEdgeRecord` 型と、`EventStore` インターフェースに Edge メソッドを追加する。

```typescript
import type { Edge, EdgeId } from "../../model/projection/index.ts";

// 永続化用 Edge レコード（現時点では Edge そのまま。将来メタデータ拡張用に分離）
export interface PersistedEdgeRecord {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: string;
  readonly label: string | null;
  readonly weight: number;
}

// EventStore インターフェースに追加:
export interface EventStore {
  // ... 既存メソッド ...

  // ── Edge ──
  saveEdge(edge: Edge): Promise<void>;
  getAllEdges(): Promise<readonly Edge[]>;
  deleteEdge(edgeId: EdgeId): Promise<void>;
  getEdgesByNodeId(nodeId: NodeId): Promise<readonly Edge[]>;
}
```

#### 3. `app/src/storage/event-store/event-store.ts`

EventStore 実装に Edge CRUD メソッドを追加する。

```typescript
// saveEdge: edges store に put
// getAllEdges: edges store から getAll
// deleteEdge: edges store から delete
// getEdgesByNodeId: source_node_id, target_node_id 両インデックスを検索して結合
```

### 受入条件

- `pnpm build` が成功する
- 既存の Node 永続化が壊れない（マイグレーション v1 は変更なし）
- `STORE_NAMES.EDGES` が定義されている

### コンテキスト補足

- 現在のDBバージョンは 1（`schema.ts:11`）
- マイグレーションは `database.ts` の `openDatabase()` 内で `onupgradeneeded` 時に `event.oldVersion` より大きいバージョンのマイグレーションを順次実行する仕組み
- `PersistedEdgeRecord` を `Edge` と同構造にしておくことで `structured clone` でそのまま保存できる
- `event-store.ts` の既存パターン（`saveNode` 等）に倣って `edges` store の read/write トランザクションを使う
- `EventStore.clear()` に `STORE_NAMES.EDGES` を追加すること

---

## Phase 3: renderer 実装 — Edge 描画

### 目的

Canvas 2D で Edge を描画する `drawEdge()` 関数を作成し、レンダリングループに統合する。

### 前提

Phase 1 が完了していること（Edge 型は参照のみ）。
Phase 2 とは独立して実装可能。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/canvas/renderer/draw-edge.ts` | **新規作成** |
| `app/src/canvas/renderer/renderer.ts` | 編集 |
| `app/src/canvas/renderer/index.ts` | 編集 |

### 変更内容

#### 1. `app/src/canvas/renderer/draw-edge.ts`（新規作成）

既存の `draw-node.ts` と同じパターンで、`RenderableEdge` と `RenderTheme` を受け取り Canvas 2D 描画する関数。

```typescript
import type { RenderableEdge, RenderTheme } from "./types.ts";

/**
 * RenderableEdge を Canvas 2D 上に描画する。
 * source → target の方向に矢印付きの線を引く。
 */
export function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: RenderableEdge,
  theme: RenderTheme,
): void {
  // 実装要件:
  // 1. theme.edgeDefaults から strokeColor, strokeWidth, arrowSize を取得
  // 2. edge.weight で strokeWidth をスケール（weight * baseWidth）
  // 3. sourcePosition → targetPosition に直線を描画
  // 4. target 端に三角形の矢印ヘッドを描画
  //    - 矢印の先端は targetPosition ではなく、Node の境界で止める
  //    - MVP では簡易的に targetPosition から arrowSize 分手前に止めてよい
  // 5. edge.label があれば線分の中点にテキストを描画
  //    - theme.edgeDefaults.labelFontSize, labelColor を使用
  // 6. edge.relation による線種の分岐（MVP では全て実線、将来拡張ポイント）
}
```

描画仕様:
- **線**: sourcePosition → targetPosition の直線。Canvas 2D の `beginPath()` + `moveTo()` + `lineTo()` + `stroke()`
- **矢印**: target 側に三角形。`lineTo()` × 3 + `fill()` で描く。矢印の角度は線分の角度から `Math.atan2()` で計算
- **ラベル**: 線分の中点に `fillText()`。背景の矩形を先に `fillRect()` で描いて可読性を確保
- **線幅**: `edge.weight * theme.edgeDefaults.strokeWidth`（weight は 0-1）。最低 0.5px

#### 2. `app/src/canvas/renderer/renderer.ts`

renderFrame() 内の Node 描画ループの**直前**に Edge 描画ループを追加する（Edge を Node の下に描画）。

```typescript
// 現在のコード (renderer.ts:63-69):
//   drawBackground(ctx, viewport, theme);
//   for (const node of scene.nodes) {
//     drawNode(ctx, node, theme);
//   }

// 変更後:
//   drawBackground(ctx, viewport, theme);
//   for (const edge of scene.edges) {    // ← 追加
//     drawEdge(ctx, edge, theme);        // ← 追加
//   }                                     // ← 追加
//   for (const node of scene.nodes) {
//     drawNode(ctx, node, theme);
//   }
```

#### 3. `app/src/canvas/renderer/index.ts`

`drawEdge` をエクスポートに追加する（app.ts 側では直接使わないが、テスト・デバッグ用）。

### 受入条件

- `pnpm build` が成功する
- `edges: []` のままの場合、描画に変化がないこと（既存動作を壊さない）
- `RenderableEdge` を含む `RenderScene` を `setScene()` に渡すと矢印付き線が描画されること

### コンテキスト補足

- `draw-node.ts` が参考パターン。`drawNode(ctx, node, theme)` のシグネチャに倣う
- `RenderableEdge` の `sourcePosition` / `targetPosition` は `WorldPoint` 型（`{ wx, wy }`）
- 描画はカメラ変換（`ctx.translate` + `ctx.scale`）適用後のワールド座標系で行う（`renderer.ts:58-61` で既に適用済）
- テーマの `edgeDefaults`: `{ strokeColor, strokeWidth, arrowSize, labelFontSize, labelColor }`
  - STATIONERY_THEME: `strokeColor: "#8b7355"`, `strokeWidth: 1`, `arrowSize: 8`

---

## Phase 4: app 統合 — 状態管理とシーン構築

### 目的

AppState に Edge を追加し、起動時の読み込み・rebuildScene での RenderableEdge 構築・Edge の CRUD 操作を実装する。

### 前提

Phase 1（EdgeId）、Phase 2（storage）、Phase 3（renderer）が完了していること。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/app.ts` | 編集 |
| `app/src/main.ts` | 確認（変更不要の可能性大） |

### 変更内容

#### 1. `app/src/app.ts` — AppState 拡張

```typescript
import type { Edge, EdgeId } from "./model/projection/index.ts";
import type { RenderableEdge } from "./canvas/renderer/index.ts";

interface AppState {
  camera: Camera;
  canvasSize: CanvasSize;
  nodes: Map<NodeId, NodeSnapshot>;
  positions: Map<NodeId, Position>;
  edges: Map<EdgeId, Edge>;           // ← 追加
  selectedNodeId: NodeId | null;
  selectedEdgeId: EdgeId | null;       // ← 追加
}
```

#### 2. `app/src/app.ts` — 初期化（Edge 読み込み）

`createApp()` 内で `initialRecords` を復元するループの後に、Edge の読み込みを追加する。

```typescript
// createApp のパラメータに追加
export function createApp(params: {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  eventStore: EventStore;
  initialRecords: readonly PersistedNodeRecord[];
  initialEdges: readonly Edge[];       // ← 追加
}): App { ... }

// 復元ループ追加
for (const edge of params.initialEdges) {
  state.edges.set(edge.id, edge);
}
```

#### 3. `app/src/app.ts` — rebuildScene 拡張

```typescript
function rebuildScene(): void {
  const renderableNodes: RenderableNode[] = [];
  // ... 既存の Node ループ ...

  // Edge → RenderableEdge 変換
  const renderableEdges: RenderableEdge[] = [];
  for (const edge of state.edges.values()) {
    const sourcePos = state.positions.get(edge.sourceNodeId);
    const targetPos = state.positions.get(edge.targetNodeId);
    if (!sourcePos || !targetPos) continue;  // 片方でも位置不明ならスキップ

    renderableEdges.push({
      sourcePosition: { wx: sourcePos.x, wy: sourcePos.y },
      targetPosition: { wx: targetPos.x, wy: targetPos.y },
      relation: edge.relation,
      label: edge.label,
      weight: edge.weight,
    });
  }

  const scene: RenderScene = {
    nodes: renderableNodes,
    edges: renderableEdges,     // ← 空配列 → 実データ
    annotations: [],
    background: "dot_grid",
  };
  // ... 既存の setScene, hitTester ...
}
```

#### 4. `app/src/app.ts` — Edge CRUD 関数

```typescript
async function addEdge(
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
  relation: EdgeRelation,
): Promise<void> {
  // 重複チェック（同じ source → target の同 relation は拒否）
  for (const existing of state.edges.values()) {
    if (existing.sourceNodeId === sourceNodeId &&
        existing.targetNodeId === targetNodeId &&
        existing.relation === relation) {
      return;
    }
  }
  const edge = createEdge({ sourceNodeId, targetNodeId, relation });
  state.edges.set(edge.id, edge);
  await eventStore.saveEdge(edge);
  rebuildScene();
}

async function removeEdge(edgeId: EdgeId): Promise<void> {
  state.edges.delete(edgeId);
  if (state.selectedEdgeId === edgeId) {
    state.selectedEdgeId = null;
  }
  await eventStore.deleteEdge(edgeId);
  rebuildScene();
}
```

#### 5. `app/src/main.ts` — 呼び出し側の更新

`main.ts` で `createApp()` を呼ぶ際に `initialEdges` を渡す。

```typescript
// 既存: const records = await eventStore.getAllNodes();
// 追加: const edges = await eventStore.getAllEdges();
// createApp({ ..., initialEdges: edges });
```

### 受入条件

- `pnpm build` が成功する
- 起動時に IndexedDB から Edge を読み込み、キャンバス上に線として描画される
- Node をドラッグ移動すると、接続された Edge がリアルタイムに追従する（rebuildScene が呼ばれるため）

### コンテキスト補足

- 現在の `app.ts` は 288 行。大きくないのでファイル全体を読んでから編集すること
- `main.ts` は 25 行のブートストラップ。`createEventStore()` → `getAllNodes()` → `createApp()` のフロー
- `rebuildScene()` は Node ドラッグ時にも呼ばれるため、Edge 追従は自動的に実現される
- `createEdge()` は `model/projection/index.ts` から import する
- `EdgeRelation` 型も同じ場所から import する

---

## Phase 5: input 拡張 — Edge 作成 UI

### 目的

ユーザーが Node 間に Edge を作成するためのインタラクションを実装する。
操作方法: **Shift + Node ドラッグ → 別の Node 上でリリース** で Edge を作成する。

### 前提

Phase 4（app 統合）が完了していること（`addEdge()` 関数が使える）。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/canvas/input/types.ts` | 編集 |
| `app/src/canvas/input/drag-machine.ts` | 編集 |
| `app/src/canvas/input/input-handler.ts` | 編集 |
| `app/src/canvas/renderer/types.ts` | 編集 |
| `app/src/canvas/renderer/renderer.ts` | 編集 |
| `app/src/app.ts` | 編集 |

### 変更内容

#### 1. InputAction に Edge 作成系を追加（`types.ts`）

```typescript
// InputAction union に追加:
| EdgeDragStartAction
| EdgeDragMoveAction
| EdgeDragEndAction
| EdgeDragCancelAction

export interface EdgeDragStartAction {
  readonly type: "edge_drag_start";
  readonly sourceNodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

export interface EdgeDragMoveAction {
  readonly type: "edge_drag_move";
  readonly sourceNodeId: NodeId;
  readonly worldPoint: WorldPoint;     // 現在のマウス位置（ワールド座標）
}

export interface EdgeDragEndAction {
  readonly type: "edge_drag_end";
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;       // ドロップ先の Node
}

export interface EdgeDragCancelAction {
  readonly type: "edge_drag_cancel";   // 背景でリリース → キャンセル
}
```

#### 2. DragState に linking 状態を追加（`types.ts`）

```typescript
export type DragState =
  | IdleState
  | PanningState
  | DraggingNodeState
  | RectSelectingState
  | LinkingState;           // ← 追加

export interface LinkingState {
  readonly type: "linking";
  readonly sourceNodeId: NodeId;
  readonly startWorld: WorldPoint;
  readonly currentWorld: WorldPoint;
}
```

#### 3. drag-machine.ts の状態遷移を拡張

```
既存:
  idle + mousedown(node) → pending → mousemove(threshold超え) → dragging_node

追加:
  idle + mousedown(node, shiftKey=true) → pending_link
  pending_link → mousemove(threshold超え) → linking
  linking → mouseup(node) → EdgeDragEndAction
  linking → mouseup(background) → EdgeDragCancelAction
```

**重要**: `onMouseDown()` に `shiftKey: boolean` パラメータを追加する。
`input-handler.ts` の `onMouseDown()` から `e.shiftKey` を渡す。

#### 4. input-handler.ts の更新

- `onMouseDown` で `e.shiftKey` を drag-machine に渡す
- `onMouseMove` で linking 状態の場合 `EdgeDragMoveAction` を emit する
- `onMouseUp` で linking 状態の場合、ヒットテストを行い Node 上なら `EdgeDragEndAction`、それ以外なら `EdgeDragCancelAction` を emit する

#### 5. renderer に仮 Edge 描画を追加

Edge 作成中に、source Node からマウスカーソルまでの仮線を描画する。

`RenderScene` にオプショナルな `pendingEdge` を追加する:

```typescript
// renderer/types.ts の RenderScene に追加:
export interface RenderScene {
  readonly nodes: readonly RenderableNode[];
  readonly edges: readonly RenderableEdge[];
  readonly annotations: readonly RenderableAnnotation[];
  readonly background: BackgroundStyle;
  readonly pendingEdge?: {              // ← 追加
    readonly sourcePosition: WorldPoint;
    readonly targetPosition: WorldPoint;
  } | null;
}
```

`renderer.ts` の `renderFrame()` で、`scene.pendingEdge` があれば破線で描画する。

#### 6. app.ts の handleAction に Edge 作成ハンドラを追加

```typescript
case "edge_drag_start":
  // rebuildScene で pendingEdge を設定
  break;

case "edge_drag_move":
  // pendingEdge の targetPosition を更新 → rebuildScene
  break;

case "edge_drag_end":
  // addEdge(sourceNodeId, targetNodeId, "associated") を呼ぶ
  // pendingEdge をクリア
  break;

case "edge_drag_cancel":
  // pendingEdge をクリア → rebuildScene
  break;
```

### 受入条件

- Shift + Node 上で mousedown → ドラッグ → 別 Node 上で mouseup で Edge が作成される
- ドラッグ中に source Node からマウスカーソルまで仮線（破線）が表示される
- 背景でリリースした場合はキャンセル（Edge は作成されない）
- 同じ Node 上でリリースした場合もキャンセル
- Shift を押さない通常ドラッグでは従来通り Node が移動する

### コンテキスト補足

- `drag-machine.ts` は `createDragMachine()` 関数でステートマシンを返す。`DragMachineState` に `pendingTarget` と `mousedownScreen/World` がある
- `onMouseDown` は現在 `(screenPoint, worldPoint, hitTarget)` の 3 引数。shiftKey を第 4 引数として追加する
- `input-handler.ts:56` で `machine.onMouseDown(screen, world, hit)` を呼んでいる箇所に `e.shiftKey` を追加
- 初回の Edge 作成では relation は固定値 `"associated"` でよい。relation 選択 UI は別フェーズ

---

## Phase 6: hit-test 拡張 — Edge 選択と削除

### 目的

Edge をクリックして選択し、Delete キーで削除できるようにする。

### 前提

Phase 4（app 統合 — `removeEdge()` が使える）と Phase 3（描画）が完了していること。
Phase 5（作成 UI）とは独立して実装可能。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `app/src/canvas/hit-test/types.ts` | 編集 |
| `app/src/canvas/hit-test/hit-tester.ts` | 編集 |
| `app/src/canvas/hit-test/index.ts` | 編集 |
| `app/src/canvas/renderer/types.ts` | 編集（RenderableEdge に selected 追加） |
| `app/src/canvas/renderer/draw-edge.ts` | 編集（選択状態の描画） |
| `app/src/app.ts` | 編集 |

### 変更内容

#### 1. HitTestableScene に Edge 情報を追加

```typescript
// hit-test/types.ts
export interface HitTestableEdge {
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
}

export interface HitTestableScene {
  readonly entries: readonly HitTestEntry[];
  readonly edges: readonly HitTestableEdge[];    // ← 追加
}
```

#### 2. hit-tester.ts に Edge ヒットテストを追加

```typescript
// hitTestPoint() 内で:
// 1. まず Node を走査（既存ロジック、優先度高）
// 2. Node にヒットしなかった場合、Edge を走査
//    - 点から線分への距離を計算
//    - 距離が margin 以下なら edge HitTarget を返す

// 点から線分への距離計算:
function pointToSegmentDistance(
  point: WorldPoint,
  segStart: WorldPoint,
  segEnd: WorldPoint,
): number {
  // ベクトル投影で最近接点を求め、距離を返す
  const dx = segEnd.wx - segStart.wx;
  const dy = segEnd.wy - segStart.wy;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.wx - segStart.wx, point.wy - segStart.wy);
  let t = ((point.wx - segStart.wx) * dx + (point.wy - segStart.wy) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = segStart.wx + t * dx;
  const projY = segStart.wy + t * dy;
  return Math.hypot(point.wx - projX, point.wy - projY);
}
```

#### 3. buildHitTestableScene を更新

`canvas/hit-test/scene-builder.ts`（既存）を更新して、Edge 情報を受け取れるようにする。

```typescript
// 既存: buildHitTestableScene(nodes: readonly RenderableNode[]): HitTestableScene
// 変更: buildHitTestableScene(nodes: ..., edges?: readonly HitTestableEdge[]): HitTestableScene
```

#### 4. RenderableEdge に selected を追加

```typescript
// renderer/types.ts
export interface RenderableEdge {
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
  readonly selected: boolean;           // ← 追加
}
```

#### 5. draw-edge.ts で選択状態を反映

選択された Edge は `theme.selectionColor` で描画し、線幅を太くする。

#### 6. app.ts — Edge 選択と削除ハンドラ

```typescript
// handleAction 内:
case "background_click":
  state.selectedNodeId = null;
  state.selectedEdgeId = null;     // ← 追加
  rebuildScene();
  break;

// hover の HitTarget.edge をハンドリングする場合は将来拡張

// key アクション追加（Delete / Backspace で Edge 削除）:
case "key":
  if ((action.key === "Delete" || action.key === "Backspace") && state.selectedEdgeId) {
    removeEdge(state.selectedEdgeId);
  }
  break;
```

**注意**: Edge クリックを検出するには、input-handler.ts が edge HitTarget を返す必要がある。
現在の drag-machine.ts では `hitTarget.type === "background"` と `hitTarget.type === "node"` のみ分岐している。
`hitTarget.type === "edge"` の場合は背景と同様にパン開始するが、mouseup 時に移動量が小さければ `edge_click` を返すように拡張する。

新しい InputAction を追加:

```typescript
export interface EdgeClickAction {
  readonly type: "edge_click";
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly worldPoint: WorldPoint;
}
```

#### 7. rebuildScene で Edge の selected を反映

```typescript
renderableEdges.push({
  // ... 既存 ...
  selected: state.selectedEdgeId === edge.id,
});
```

#### 8. rebuildScene で hitTester に Edge を渡す

```typescript
// 既存: hitTester.setScene(buildHitTestableScene(renderableNodes));
// 変更: hitTester.setScene(buildHitTestableScene(renderableNodes, hitTestableEdges));
```

### 受入条件

- Edge の線分付近をクリックすると Edge が選択される（色が変わる）
- 背景クリックで Edge 選択が解除される
- Edge 選択中に Delete キーで Edge が削除される（IndexedDB からも削除される）
- Node が Edge より優先される（重なった場合は Node がヒットする）

### コンテキスト補足

- `hit-tester.ts` は Node のバウンディングボックスで判定する簡潔な実装（79行）
- Edge ヒットテストは Node ヒットテストの**後**に行う（Node 優先）
- ヒットテストの margin はデフォルト 4px（`HitTestOptions.margin`）。Edge には少し大きめ（6-8px）を使ってもよい
- `buildHitTestableScene` は `canvas/hit-test/scene-builder.ts` にある
- 現在の `handleAction` には `"key"` case がない（追加が必要）
- input-handler.ts にも `keydown` イベントリスナーを追加する必要がある（現在は mousedown/move/up/wheel/dblclick/contextmenu のみ）

---

## 補足: Edge relation 選択 UI について

本計画では Edge 作成時の relation を `"associated"` 固定とする。
relation の選択 UI（コンテキストメニューやモーダル）は別タスクとして扱う。
理由:
- UI フレームワーク未導入であり、DOM ベースの UI 実装は本計画のスコープ外
- Edge の基本的な作成・描画・削除が先に動作することが重要
- relation は後から変更可能にする設計（edit API を将来追加）

---

## 各フェーズの見積もりサイズ

| Phase | 新規ファイル | 編集ファイル | 変更規模 |
|-------|------------|------------|---------|
| 1 | 0 | 2 | 小（型定義 + ファクトリ修正） |
| 2 | 0 | 3 | 中（DB マイグレーション + CRUD 4 メソッド） |
| 3 | 1 | 2 | 中（描画関数 + ループ統合） |
| 4 | 0 | 2 | 中（状態管理 + シーン構築 + CRUD） |
| 5 | 0 | 6 | 大（DragState 拡張 + InputAction 追加 + 仮線描画） |
| 6 | 0 | 6 | 大（ヒットテスト + 選択 + 削除 + キーイベント） |
